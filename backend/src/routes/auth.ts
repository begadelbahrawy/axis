import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { generateTempPassword } from '../lib/password';
import { sendEmail } from '../lib/mailer';
import { requireAuth } from '../middleware/auth';
import { env } from '../lib/env';

export const authRouter = Router();

const COOKIE_NAME = 'axis_token';

function setAuthCookie(res: import('express').Response, token: string, remember: boolean) {
  res.cookie(COOKIE_NAME, token, {
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
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

authRouter.post('/register', async (req, res) => {
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

  const passwordHash = await bcrypt.hash(password, 10);
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

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address and your password.' });
  const { email, password, remember } = parsed.data;
  const emailLower = email.toLowerCase();

  const acc = await prisma.user.findUnique({ where: { email: emailLower } });
  if (!acc) {
    const pending = await prisma.pendingUserRequest.findUnique({ where: { email: emailLower } });
    if (pending) return res.status(401).json({ error: 'Your account is awaiting Admin approval.' });
    return res.status(401).json({ error: 'Account not found. Please register or contact the Admin.' });
  }
  if (!acc.active) return res.status(401).json({ error: 'This account has been deactivated. Please contact the Admin.' });
  const ok = await bcrypt.compare(password, acc.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password for this email.' });

  const token = signToken({ sub: acc.id, email: acc.email, role: acc.role }, !!remember);
  setAuthCookie(res, token, !!remember);
  res.json({ user: publicUser(acc) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
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
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: acc.id }, data: { passwordHash } });
  res.json({ ok: true });
});

authRouter.post('/forgot-password', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Enter the email on your account.' });
  const acc = await prisma.user.findUnique({ where: { email } });
  // Always respond with a generic message so this endpoint can't be used to enumerate accounts.
  if (acc) {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({ where: { id: acc.id }, data: { passwordHash } });
    await sendEmail(acc.email, 'Your AXIS password has been reset', `Your new temporary password is: ${tempPassword}\n\nSign in and change it from My Account Settings.`);
  }
  res.json({ message: 'If an account exists with that email, a new password has been emailed to it.' });
});
