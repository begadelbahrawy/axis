import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireManager, requireEcaa, requireCanEdit, isAdminRole, isManagerRole } from '../middleware/auth';
import { upload, fileToRef, deleteUploadedFile } from '../middleware/upload';
import { logActivity } from '../lib/activity';
import { generateRequestId } from '../lib/requestId';
import { FORM_TYPES } from '../lib/constants';
import { buildSalutation, buildCoverLetterText } from '../lib/textBuilders';
import { notificationKey } from '../lib/notifications';
import type { Application } from '@prisma/client';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

async function countryArMap(): Promise<Record<string, string>> {
  const countries = await prisma.country.findMany();
  const map: Record<string, string> = {};
  countries.forEach((c) => (map[c.nameEn] = c.nameAr));
  return map;
}

async function getSettings() {
  return (
    (await prisma.settings.findUnique({ where: { id: 'singleton' } })) ||
    (await prisma.settings.create({ data: { id: 'singleton', esigApproved: false } }))
  );
}

function serialize(rec: Application) {
  return { ...rec, data: rec.data, attachments: rec.attachments, notificationReads: rec.notificationReads };
}

function deleteApplicationFiles(attachments: any) {
  deleteUploadedFile(attachments?.stampFile?.url);
  deleteUploadedFile(attachments?.ecaaApprovalFile?.url);
  deleteUploadedFile(attachments?.ecaaESignature?.url);
  (attachments?.supportingDocuments || []).forEach((d: any) => deleteUploadedFile(d?.url));
}

/* ---------- List / search ---------- */
applicationsRouter.get('/', async (req, res) => {
  const { q, status } = req.query as { q?: string; status?: string };
  const where: any = {};
  if (status) where.status = status;
  const records = await prisma.application.findMany({ where, orderBy: { createdAt: 'desc' } });
  let filtered = records;
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = records.filter((r) => {
      const haystack = [r.id, r.approvalNumber || '', FORM_TYPES[r.type]?.title || r.type, JSON.stringify(r.data)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }
  res.json({ records: filtered.map(serialize) });
});

applicationsRouter.get('/:id', async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  res.json({ record: serialize(rec) });
});

/* ---------- Create (this IS the "Confirm & Generate" step for a new application —
   nothing is created, numbered, notified or logged until this is called; the
   Preview the user reviews beforehand is rendered entirely client-side from
   their in-progress form state and never touches the backend). ---------- */
applicationsRouter.post('/', requireCanEdit, async (req, res) => {
  const body = req.body || {};
  const type = body.type as string;
  if (!type || !FORM_TYPES[type]) return res.status(400).json({ error: 'Select a valid application type.' });
  const cfg = FORM_TYPES[type];
  const meta = body.meta || {};
  const countrySections = body.countrySections || [];

  const id = await generateRequestId(type);
  const countryMap = await countryArMap();
  const salutationText = buildSalutation(type, meta, countrySections, (en) => countryMap[en] || en);
  const coverLetterText = cfg.hasCoverLetter ? buildCoverLetterText(meta) : undefined;

  const now = new Date();
  const rec = await prisma.application.create({
    data: {
      id,
      type,
      status: 'PENDING_MANAGER_APPROVAL',
      createdById: req.user!.id,
      preparedBy: req.user!.name,
      managerQueueEnteredAt: now,
      approvalNumber: '',
      managerNotes: '',
      ecaaNotes: '',
      data: {
        meta,
        rows: body.rows || [],
        countrySections,
        manualFleetRows: body.manualFleetRows || [],
        pickedFleetRows: body.pickedFleetRows || [],
        aircraftBlocks: body.aircraftBlocks || [],
        travelProgramEnabled: !!body.travelProgramEnabled,
        travelProgram: body.travelProgram || {},
        comments: body.comments || '',
        salutationText,
        coverLetterText,
        ecaaResponse: '',
      },
      attachments: { stampFile: null, ecaaApprovalFile: null, eSignature: null, ecaaESignature: null, supportingDocuments: [] },
      notificationReads: {},
    },
  });
  await logActivity({ action: 'Created', applicationId: rec.id, type, userId: req.user!.id, userName: req.user!.name });
  res.status(201).json({ record: serialize(rec) });
});

/* ---------- Edit confirm (also handles Manager/ECAA-changes-requested
   resubmission) — the stored original is untouched until this is called;
   going back from the client-side preview or navigating away never reaches
   this endpoint, so nothing changes. ---------- */
applicationsRouter.put('/:id', requireCanEdit, async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  const canEditThis = rec.status !== 'ECAA_APPROVED' || isAdminRole(req.user!.role) || isManagerRole(req.user!.role);
  if (!canEditThis) return res.status(403).json({ error: 'This application has already been ECAA approved.' });

  const body = req.body || {};
  const type = (body.type as string) || rec.type;
  const cfg = FORM_TYPES[type];
  if (!cfg) return res.status(400).json({ error: 'Invalid application type.' });
  const meta = body.meta || {};
  const countrySections = body.countrySections || [];
  const countryMap = await countryArMap();
  const salutationText = buildSalutation(type, meta, countrySections, (en) => countryMap[en] || en);
  const existingData = (rec.data as any) || {};
  const coverLetterText = cfg.hasCoverLetter ? buildCoverLetterText(meta) : existingData.coverLetterText;

  const updated = await prisma.application.update({
    where: { id: rec.id },
    data: {
      type,
      status: 'PENDING_MANAGER_APPROVAL',
      managerApprovedBy: null,
      managerApprovedAt: null,
      managerQueueEnteredAt: new Date(),
      data: {
        ...existingData,
        meta,
        rows: body.rows || [],
        countrySections,
        manualFleetRows: body.manualFleetRows || [],
        pickedFleetRows: body.pickedFleetRows || [],
        aircraftBlocks: body.aircraftBlocks || [],
        travelProgramEnabled: !!body.travelProgramEnabled,
        travelProgram: body.travelProgram || {},
        comments: body.comments || '',
        salutationText,
        coverLetterText,
      },
    },
  });
  await logActivity({ action: 'Edited', applicationId: updated.id, type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

/* ---------- Cancel = permanent delete, creator only (Section 5D) ---------- */
applicationsRouter.delete('/:id', async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (rec.createdById !== req.user!.id) {
    return res.status(403).json({ error: 'Only the user who created this application can cancel it.' });
  }
  // Insert the audit entry first, while the FK is still valid; the application
  // row's own deletion then SetNulls applicationId on every log entry
  // (this one included) but the requestId/formTitle/userName snapshot fields
  // keep the Activity Log entry fully readable afterwards.
  await logActivity({ action: 'Cancelled & Deleted', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  deleteApplicationFiles(rec.attachments);
  await prisma.application.delete({ where: { id: rec.id } });
  res.json({ ok: true, message: `Application ${rec.id} was cancelled and permanently deleted.` });
});

/* ---------- Manager actions ---------- */
applicationsRouter.post('/:id/manager/approve', requireManager, async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (!['PENDING_MANAGER_APPROVAL', 'MANAGER_CHANGES_REQUESTED'].includes(rec.status)) {
    return res.status(400).json({ error: 'This application is not awaiting Manager approval.' });
  }
  const now = new Date();
  const settings = await getSettings();
  const attachments = (rec.attachments as any) || {};
  const data: any = {
    status: 'MANAGER_APPROVED',
    managerApprovedBy: req.user!.name,
    managerApprovedAt: now,
    managerNotes: rec.managerNotes || '',
  };

  if (settings.esigApproved && settings.companySignatureUrl) {
    attachments.eSignature = { url: settings.companySignatureUrl, by: req.user!.name, at: now.toISOString() };
    data.attachments = attachments;
    data.stampUploadedAt = now;
    data.status = 'WAITING_ECAA_APPROVAL';
  }

  const updated = await prisma.application.update({ where: { id: rec.id }, data });
  await logActivity({ action: 'Manager Approved', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

applicationsRouter.post('/:id/manager/request-changes', requireManager, async (req, res) => {
  const note = String(req.body?.note || '').trim();
  if (!note) return res.status(400).json({ error: 'Enter the Manager comments / required changes first.' });
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  const updated = await prisma.application.update({
    where: { id: rec.id },
    data: {
      managerNotes: note,
      managerActionBy: req.user!.name,
      managerActionAt: new Date(),
      status: 'MANAGER_CHANGES_REQUESTED',
    },
  });
  await logActivity({ action: 'Manager Changes Requested', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

/* ---------- ECAA actions ---------- */
applicationsRouter.post('/:id/ecaa/approve', requireEcaa, async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (rec.status !== 'WAITING_ECAA_APPROVAL') return res.status(400).json({ error: 'This application is not waiting for ECAA approval.' });
  const approvalNo = String(req.body?.approvalNo || '').trim();
  if (!approvalNo) return res.status(400).json({ error: 'Enter the official ECAA Approval No. before approving.' });
  const note = String(req.body?.note || '').trim() || 'ECAA approval granted.';
  const updated = await prisma.application.update({
    where: { id: rec.id },
    data: {
      approvalNumber: approvalNo,
      ecaaNotes: note,
      ecaaActionBy: req.user!.name,
      ecaaActionAt: new Date(),
      status: 'ECAA_APPROVED',
    },
  });
  await logActivity({ action: 'ECAA Approved', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

applicationsRouter.post('/:id/ecaa/request-changes', requireEcaa, async (req, res) => {
  const note = String(req.body?.note || '').trim();
  if (!note) return res.status(400).json({ error: 'Enter the ECAA comments / required changes first.' });
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (rec.status !== 'WAITING_ECAA_APPROVAL') return res.status(400).json({ error: 'This application is not waiting for ECAA approval.' });
  const updated = await prisma.application.update({
    where: { id: rec.id },
    data: { ecaaNotes: note, ecaaActionBy: req.user!.name, ecaaActionAt: new Date(), status: 'ECAA_CHANGES_REQUESTED' },
  });
  await logActivity({ action: 'ECAA Changes Requested', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

/* ---------- Uploads ---------- */
// A record only ever sits at Manager Approved when it was never auto-signed
// (Section 5A: toggle OFF, or ON but no Company Signature on file — which
// falls back to this manual path automatically), so the only upload available
// from here is the manual approval below; ECAA never needs to log in for it.
applicationsRouter.post('/:id/upload/manual-approval', requireCanEdit, upload.single('file'), async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (rec.status !== 'MANAGER_APPROVED') return res.status(400).json({ error: 'Manager approval is required before uploading the ECAA approval.' });
  const approvalNo = String(req.body?.approvalNo || '').trim();
  if (!approvalNo) return res.status(400).json({ error: 'Enter the official ECAA Approval No. before uploading.' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const attachments = (rec.attachments as any) || {};
  deleteUploadedFile(attachments.stampFile?.url);
  attachments.stampFile = fileToRef(req.file, req.user!.name);
  const now = new Date();
  const updated = await prisma.application.update({
    where: { id: rec.id },
    data: {
      attachments,
      approvalNumber: approvalNo,
      stampUploadedAt: now,
      ecaaActionBy: req.user!.name,
      ecaaActionAt: now,
      status: 'ECAA_APPROVED',
    },
  });
  await logActivity({ action: 'ECAA Approval Uploaded', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

applicationsRouter.post('/:id/upload/supporting', requireCanEdit, upload.array('files', 10), async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (!['MANAGER_APPROVED', 'WAITING_ECAA_APPROVAL'].includes(rec.status)) {
    return res.status(400).json({ error: 'Manager approval is required before uploading supporting documents.' });
  }
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: 'No files uploaded.' });
  const attachments = (rec.attachments as any) || {};
  attachments.supportingDocuments = [...(attachments.supportingDocuments || []), ...files.map((f) => fileToRef(f, req.user!.name))];
  const updated = await prisma.application.update({ where: { id: rec.id }, data: { attachments } });
  await logActivity({ action: 'Supporting document(s) uploaded', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

applicationsRouter.delete('/:id/supporting/:index', requireCanEdit, async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  const attachments = (rec.attachments as any) || {};
  const idx = parseInt(req.params.index, 10);
  const docs = attachments.supportingDocuments || [];
  if (idx >= 0 && idx < docs.length) {
    deleteUploadedFile(docs[idx]?.url);
    docs.splice(idx, 1);
  }
  attachments.supportingDocuments = docs;
  const updated = await prisma.application.update({ where: { id: rec.id }, data: { attachments } });
  res.json({ record: serialize(updated) });
});

// ECAA's own electronic signature, uploaded at review time (not a saved account setting).
applicationsRouter.post('/:id/ecaa/signature', requireEcaa, upload.single('file'), async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (rec.status !== 'WAITING_ECAA_APPROVAL') return res.status(400).json({ error: 'This application is not waiting for ECAA approval.' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const attachments = (rec.attachments as any) || {};
  deleteUploadedFile(attachments.ecaaESignature?.url);
  const ref = fileToRef(req.file, req.user!.name);
  attachments.ecaaESignature = { url: ref.url, name: ref.name, by: req.user!.name, at: new Date().toISOString() };
  const updated = await prisma.application.update({ where: { id: rec.id }, data: { attachments } });
  res.json({ record: serialize(updated) });
});

// ECAA's alternative proof of approval: an uploaded physically-signed approval file.
applicationsRouter.post('/:id/ecaa/signed-approval', requireEcaa, upload.single('file'), async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  if (rec.status !== 'WAITING_ECAA_APPROVAL') return res.status(400).json({ error: 'This application is not waiting for ECAA approval.' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const attachments = (rec.attachments as any) || {};
  deleteUploadedFile(attachments.ecaaApprovalFile?.url);
  deleteUploadedFile(attachments.ecaaESignature?.url);
  attachments.ecaaApprovalFile = fileToRef(req.file, req.user!.name);
  attachments.ecaaESignature = null;
  const updated = await prisma.application.update({ where: { id: rec.id }, data: { attachments } });
  await logActivity({ action: 'ECAA Signed Approval Uploaded', applicationId: rec.id, type: rec.type, userId: req.user!.id, userName: req.user!.name });
  res.json({ record: serialize(updated) });
});

/* ---------- Inline editable fields ---------- */
applicationsRouter.patch('/:id/fields', async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  const body = req.body || {};
  const data: any = { ...(rec.data as any) };
  const updateData: any = {};

  if (typeof body.approvalNumber === 'string') {
    if (req.user!.role !== 'ECAA') return res.status(403).json({ error: 'Only ECAA can edit the Approval No. here.' });
    updateData.approvalNumber = body.approvalNumber;
  }
  if (typeof body.ecaaResponse === 'string') data.ecaaResponse = body.ecaaResponse;
  if (typeof body.salutationText === 'string') data.salutationText = body.salutationText;
  if (typeof body.coverLetterText === 'string') data.coverLetterText = body.coverLetterText;
  updateData.data = data;

  const updated = await prisma.application.update({ where: { id: rec.id }, data: updateData });
  res.json({ record: serialize(updated) });
});

/* ---------- Notifications ---------- */
applicationsRouter.post('/:id/notifications/read', async (req, res) => {
  const rec = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: 'Application not found.' });
  const type = req.body?.type;
  if (!type) return res.status(400).json({ error: 'Notification type is required.' });
  const reads = { ...((rec.notificationReads as any) || {}) };
  reads[notificationKey(rec, type)] = true;
  const updated = await prisma.application.update({ where: { id: rec.id }, data: { notificationReads: reads } });
  res.json({ record: serialize(updated) });
});
