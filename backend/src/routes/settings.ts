import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { upload } from '../middleware/upload';
import { env } from '../lib/env';

export const settingsRouter = Router();

async function getOrCreateSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: 'singleton', esigApproved: false } });
}

// Any authenticated user needs to read esigApproved to know which workflow path is active.
settingsRouter.get('/', requireAuth, async (_req, res) => {
  const s = await getOrCreateSettings();
  res.json({ settings: s });
});

settingsRouter.patch('/', requireAuth, requireAdmin, async (req, res) => {
  const esigApproved = !!req.body?.esigApproved;
  await getOrCreateSettings();
  const s = await prisma.settings.update({ where: { id: 'singleton' }, data: { esigApproved } });
  res.json({ settings: s });
});

settingsRouter.post('/company-signature', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  await getOrCreateSettings();
  const s = await prisma.settings.update({
    where: { id: 'singleton' },
    data: {
      companySignatureUrl: `${env.publicUploadPath}/${req.file.filename}`,
      companySignatureName: req.file.originalname,
      companySignatureUploadedBy: req.user!.name,
      companySignatureUploadedAt: new Date(),
    },
  });
  res.json({ settings: s });
});

settingsRouter.delete('/company-signature', requireAuth, requireAdmin, async (_req, res) => {
  await getOrCreateSettings();
  const s = await prisma.settings.update({
    where: { id: 'singleton' },
    data: { companySignatureUrl: null, companySignatureName: null, companySignatureUploadedBy: null, companySignatureUploadedAt: null },
  });
  res.json({ settings: s });
});
