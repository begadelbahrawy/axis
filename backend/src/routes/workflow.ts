import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireManager, requireEcaa, requireAdmin } from '../middleware/auth';
import { userUnreadNotifications } from '../lib/notifications';

export const workflowRouter = Router();
workflowRouter.use(requireAuth);

workflowRouter.get('/manager-queue', requireManager, async (_req, res) => {
  const [pending, changesRequested, approvedCount] = await Promise.all([
    prisma.application.findMany({ where: { status: 'PENDING_MANAGER_APPROVAL', saved: true }, orderBy: { createdAt: 'asc' } }),
    prisma.application.findMany({ where: { status: 'MANAGER_CHANGES_REQUESTED', saved: true }, orderBy: { createdAt: 'asc' } }),
    prisma.application.count({ where: { status: 'MANAGER_APPROVED' } }),
  ]);
  res.json({ pending, changesRequested, approvedCount });
});

workflowRouter.get('/ecaa-queue', requireEcaa, async (_req, res) => {
  const waiting = await prisma.application.findMany({ where: { status: 'WAITING_ECAA_APPROVAL', saved: true }, orderBy: { createdAt: 'asc' } });
  res.json({ waiting });
});

workflowRouter.get('/notifications', async (_req, res) => {
  const records = await prisma.application.findMany({ where: { saved: true } });
  const rows = userUnreadNotifications(records).map((r) => ({
    id: r.rec.id,
    type: r.type,
    category: r.category,
    kind: r.kind,
    status: r.rec.status,
    recType: r.rec.type,
    managerApprovedBy: r.rec.managerApprovedBy,
    managerNotes: r.rec.managerNotes,
    ecaaNotes: r.rec.ecaaNotes,
    approvalNumber: r.rec.approvalNumber,
  }));
  res.json({
    manager: rows.filter((r) => r.category === 'manager'),
    ecaa: rows.filter((r) => r.category === 'ecaa'),
  });
});

// Activity Log lives under the "Administration" sidebar group — Admin only, matching applyRoleUI().
workflowRouter.get('/activity-log', requireAdmin, async (_req, res) => {
  const entries = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  res.json({ entries });
});

// Dashboard KPIs / pipeline breakdown.
workflowRouter.get('/dashboard', async (_req, res) => {
  const records = await prisma.application.findMany({ where: { saved: true } });
  const counts: Record<string, number> = {};
  for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
  res.json({ total: records.length, counts, recent: records.slice(0, 8) });
});
