import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

function publicUser(u: { id: string; name: string; email: string; role: string; active: boolean; createdAt: Date }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt };
}

adminRouter.get('/pending-users', async (_req, res) => {
  const rows = await prisma.pendingUserRequest.findMany({ orderBy: { requestedAt: 'asc' } });
  res.json({ pending: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, requestedAt: r.requestedAt })) });
});

adminRouter.post('/pending-users/:id/approve', async (req, res) => {
  const role = String(req.body?.role || '').toUpperCase();
  if (!['SPECIALIST', 'MANAGER', 'ECAA', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Choose a valid role.' });
  }
  const pending = await prisma.pendingUserRequest.findUnique({ where: { id: req.params.id } });
  if (!pending) return res.status(404).json({ error: 'Request not found.' });

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { name: pending.name, email: pending.email, passwordHash: pending.passwordHash, role: role as any, active: true },
    });
    await tx.pendingUserRequest.delete({ where: { id: pending.id } });
    return u;
  });

  await sendEmail(user.email, 'Your AXIS account has been approved', `Hi ${user.name}, your account has been approved with the ${role} role. You can now sign in.`);
  res.json({ user: publicUser(user) });
});

adminRouter.post('/pending-users/:id/reject', async (req, res) => {
  await prisma.pendingUserRequest.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ users: users.map(publicUser) });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const { role, active } = req.body || {};
  if (req.params.id === req.user!.id && active === false) {
    return res.status(400).json({ error: 'You cannot deactivate your own Admin account.' });
  }
  const data: any = {};
  if (role) {
    if (!['SPECIALIST', 'MANAGER', 'ECAA', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    data.role = role;
  }
  if (typeof active === 'boolean') data.active = active;
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ user: publicUser(user) });
});
