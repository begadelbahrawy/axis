import { Router } from 'express';
import { requireAuth, requireRole, canManageReferenceDataRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const referenceRouter = Router();
const requireCanManage = requireRole(canManageReferenceDataRole, 'Specialist, Manager or Admin access required.');

referenceRouter.use(requireAuth);

/* ---------- Fleet (owned + ACMI) ---------- */
referenceRouter.get('/fleet', async (_req, res) => {
  const rows = await prisma.fleetAircraft.findMany({ orderBy: [{ kind: 'asc' }, { type: 'asc' }, { registration: 'asc' }] });
  res.json({
    owned: rows.filter((r) => r.kind === 'OWNED').map((r) => ({ id: r.id, type: r.type, registration: r.registration })),
    acmi: rows.filter((r) => r.kind === 'ACMI').map((r) => ({ id: r.id, type: r.type, registration: r.registration })),
  });
});

referenceRouter.put('/fleet', requireCanManage, async (req, res) => {
  const { kind, rows } = req.body as { kind: 'OWNED' | 'ACMI'; rows: { type: string; registration: string }[] };
  if (!['OWNED', 'ACMI'].includes(kind) || !Array.isArray(rows)) return res.status(400).json({ error: 'Invalid payload.' });
  const clean = rows.filter((r) => r.type?.trim() && r.registration?.trim());
  await prisma.$transaction([
    prisma.fleetAircraft.deleteMany({ where: { kind } }),
    prisma.fleetAircraft.createMany({ data: clean.map((r) => ({ kind, type: r.type.trim(), registration: r.registration.trim() })) }),
  ]);
  res.json({ ok: true });
});

/* ---------- Special (named) fleet tables ---------- */
referenceRouter.get('/fleet/special', async (_req, res) => {
  const fleets = await prisma.specialFleet.findMany({ include: { aircraft: true }, orderBy: { order: 'asc' } });
  res.json({
    specialFleets: fleets.map((f) => ({
      id: f.id,
      name: f.name,
      rows: f.aircraft.map((a) => ({ id: a.id, type: a.type, registration: a.registration })),
    })),
  });
});

referenceRouter.post('/fleet/special', requireCanManage, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Enter a name for the new fleet table.' });
  const count = await prisma.specialFleet.count();
  const fleet = await prisma.specialFleet.create({ data: { name, order: count } });
  res.status(201).json({ specialFleet: { id: fleet.id, name: fleet.name, rows: [] } });
});

referenceRouter.put('/fleet/special/:id', requireCanManage, async (req, res) => {
  const { rows } = req.body as { rows: { type: string; registration: string }[] };
  const clean = (rows || []).filter((r) => r.type?.trim() && r.registration?.trim());
  await prisma.$transaction([
    prisma.specialFleetAircraft.deleteMany({ where: { specialFleetId: req.params.id } }),
    prisma.specialFleetAircraft.createMany({
      data: clean.map((r) => ({ specialFleetId: req.params.id, type: r.type.trim(), registration: r.registration.trim() })),
    }),
  ]);
  res.json({ ok: true });
});

referenceRouter.delete('/fleet/special/:id', requireCanManage, async (req, res) => {
  await prisma.specialFleet.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

/* ---------- Countries ---------- */
referenceRouter.get('/countries', async (_req, res) => {
  const rows = await prisma.country.findMany({ orderBy: { order: 'asc' } });
  res.json({ countries: rows.map((r) => [r.nameEn, r.nameAr]) });
});

referenceRouter.put('/countries', requireCanManage, async (req, res) => {
  const rows = req.body?.countries as [string, string][];
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'Invalid payload.' });
  const clean = rows.filter(([en]) => en?.trim());
  await prisma.$transaction([
    prisma.country.deleteMany({}),
    prisma.country.createMany({ data: clean.map(([en, ar], i) => ({ nameEn: en.trim(), nameAr: (ar || '').trim(), order: i })) }),
  ]);
  res.json({ ok: true });
});

/* ---------- Domestic airports ---------- */
referenceRouter.get('/domestic-airports', async (_req, res) => {
  const rows = await prisma.domesticAirport.findMany({ orderBy: { order: 'asc' } });
  res.json({ airports: rows.map((r) => [r.code, r.name]) });
});

referenceRouter.put('/domestic-airports', requireCanManage, async (req, res) => {
  const rows = req.body?.airports as [string, string][];
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'Invalid payload.' });
  const clean = rows.filter(([code]) => code?.trim());
  await prisma.$transaction([
    prisma.domesticAirport.deleteMany({}),
    prisma.domesticAirport.createMany({ data: clean.map(([code, name], i) => ({ code: code.trim(), name: (name || '').trim(), order: i })) }),
  ]);
  res.json({ ok: true });
});
