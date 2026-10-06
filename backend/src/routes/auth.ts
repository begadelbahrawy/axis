import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { randomToken, hashToken } from '../lib/crypto';
import { sendEmail } from '../lib/mailer';
import { requireAuth, SESSION_COOKIE } from '../middleware/auth';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middleware/rateLimit';
import { isLockedOut, recordLoginAttempt } from '../lib/loginAttempts';
import { env } from '../lib/env';

export const authRouter = Router();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function clientIp(req: import('express').Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function setAuthCookie(res: import('express').Response, token: string, remember: boolean) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000,
    path: '/',
  });
}

function publicUser(u: { id: string; name: string; email: string; role: string; active: boolean }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active };
}

const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(200),
});

authRouter.post('/register', registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter your full name and a valid email, with a password of at least 6 characters.' });
  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  const [existingUser, existingPending] = await Promise.all([
    prisma.user.findUnique({ where: { email: emailLower } }),
    prisma.pendingUserRequest.findUnique({ where: { email: emailLower } }),
  ]);
  if (existingUser || existingPending) {
    return res.status(409).json({ error: 'An account with this email already exists or is awaiting Admin approval.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.pendingUserRequest.create({ data: { name, email: emailLower, passwordHash } });
  res.status(201).json({
    message: `Registration submitted for ${name}. You'll be notified by email once an Admin approves your account — then you can sign in with the password you chose.`,
  });
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address and your password.' });
  const { email, password, remember } = parsed.data;
  const emailLower = email.toLowerCase();
  const ip = clientIp(req);

  if (await isLockedOut(emailLower, ip)) {
    return res.status(429).json({ error: 'Too many failed sign-in attempts. Please try again later.' });
  }

  const acc = await prisma.user.findUnique({ where: { email: emailLower } });
  if (!acc) {
    await recordLoginAttempt(emailLower, ip, false);
    const pending = await prisma.pendingUserRequest.findUnique({ where: { email: emailLower } });
    if (pending) return res.status(401).json({ error: 'Your account is awaiting Admin approval.' });
    return res.status(401).json({ error: 'Account not found. Please register or contact the Admin.' });
  }
  if (!acc.active) {
    await recordLoginAttempt(emailLower, ip, false, acc.id);
    return res.status(401).json({ error: 'This account has been deactivated. Please contact the Admin.' });
  }
  const ok = await bcrypt.compare(password, acc.passwordHash);
  if (!ok) {
    await recordLoginAttempt(emailLower, ip, false, acc.id);
    return res.status(401).json({ error: 'Incorrect password for this email.' });
  }

  await recordLoginAttempt(emailLower, ip, true, acc.id);
  const token = signToken({ sub: acc.id, email: acc.email, role: acc.role }, !!remember);
  setAuthCookie(res, token, !!remember);
  res.json({ user: publicUser(acc) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const acc = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!acc) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: publicUser(acc) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  const acc = await prisma.user.update({ where: { id: req.user!.id }, data: { name } });
  res.json({ user: publicUser(acc) });
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  const acc = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!acc) return res.status(401).json({ error: 'Not authenticated.' });
  const ok = await bcrypt.compare(currentPassword || '', acc.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  if (newPassword !== confirmPassword) return res.status(400).json({ error: 'New password and confirmation do not match.' });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: acc.id }, data: { passwordHash } });
  res.json({ ok: true });
});

authRouter.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Enter the email on your account.' });
  const acc = await prisma.user.findUnique({ where: { email } });
  // Always respond with a generic message so this endpoint can't be used to enumerate accounts.
  if (acc) {
    const rawToken = randomToken(32);
    await prisma.passwordResetToken.create({
      data: { userId: acc.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    const resetLink = `${env.corsOrigin}/reset-password?token=${rawToken}`;
    await sendEmail(acc.email, 'Reset your AXIS password', `Click the link below to choose a new password. This link expires in 1 hour and can only be used once:\n\n${resetLink}`);
  }
  res.json({ message: 'If an account exists with that email, a password reset link has been emailed to it.' });
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(200),
});

authRouter.post('/reset-password', forgotPasswordLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a password with at least 6 characters.' });
  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  res.json({ message: 'Password updated. You can now sign in with your new password.' });
});
