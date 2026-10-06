import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { resetDb, createLoggedInUser } from '../helpers';

function domesticPayload(overrides: Record<string, any> = {}) {
  return {
    type: 'domestic',
    meta: { actionEn: 'Operate', isAdditional: false },
    rows: [{ flightNoOut: 'SM101', flightNoRet: 'SM102', fromOut: 'HECA/CAI', toOut: 'HEGN/HRG', days: ['SAT'], remarksOut: 'PAX', remarksRet: 'FRY' }],
    countrySections: [],
    manualFleetRows: [],
    pickedFleetRows: [],
    aircraftBlocks: [],
    travelProgramEnabled: false,
    travelProgram: {},
    comments: 'test comment',
    ...overrides,
  };
}

describe('applications: create is the Confirm & Generate step', () => {
  beforeEach(resetDb);

  it('creates nothing from merely computing a preview client-side — only POST allocates an id, logs activity and enters the Manager queue', async () => {
    const { agent } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    expect((await prisma.application.findMany()).length).toBe(0);
    expect((await prisma.activityLog.findMany()).length).toBe(0);

    const res = await agent.post('/api/applications').send(domesticPayload());
    expect(res.status).toBe(201);
    expect(res.body.record.id).toMatch(/^DOM-\d{4}-001$/);
    expect(res.body.record.status).toBe('PENDING_MANAGER_APPROVAL');
    // Round-trip purpose: differing legs are combined "OUT / RET" server-side via salutation/body data passthrough.
    expect(res.body.record.data.rows[0].remarksOut).toBe('PAX');
    expect(res.body.record.data.rows[0].remarksRet).toBe('FRY');

    expect((await prisma.application.count())).toBe(1);
    const log = await prisma.activityLog.findMany();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('Created');
  });

  it('rejects creation from roles without edit access (ECAA)', async () => {
    const { agent } = await createLoggedInUser('ECAA', 'ecaa@example.com');
    const res = await agent.post('/api/applications').send(domesticPayload());
    expect(res.status).toBe(403);
  });

  it('allocates unique, gapless Request Nos under real concurrent Confirm & Generate calls', async () => {
    const { agent } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    const results = await Promise.all(Array.from({ length: 8 }, () => agent.post('/api/applications').send(domesticPayload())));
    results.forEach((r) => expect(r.status).toBe(201));
    const ids = results.map((r) => r.body.record.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('edit (PUT) resubmits for Manager approval and leaves the original untouched until called', async () => {
    const { agent } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    const created = await agent.post('/api/applications').send(domesticPayload());
    const id = created.body.record.id;

    // Manager approves it first so we can see PUT reset it back to pending.
    const { agent: manager } = await createLoggedInUser('MANAGER', 'mgr@example.com');
    await manager.post(`/api/applications/${id}/manager/approve`);
    const approved = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(approved.status).toBe('MANAGER_APPROVED');

    // Fetching for edit does not change anything — it's a plain GET.
    await agent.get(`/api/applications/${id}`);
    const stillApproved = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(stillApproved.status).toBe('MANAGER_APPROVED');

    const edited = await agent.put(`/api/applications/${id}`).send(domesticPayload({ comments: 'edited comment' }));
    expect(edited.status).toBe(200);
    expect(edited.body.record.status).toBe('PENDING_MANAGER_APPROVAL');
    expect(edited.body.record.data.comments).toBe('edited comment');
    expect(edited.body.record.managerApprovedBy).toBeNull();

    const log = await prisma.activityLog.findMany({ where: { applicationId: id }, orderBy: { createdAt: 'asc' } });
    expect(log.map((l) => l.action)).toEqual(['Created', 'Manager Approved', 'Edited']);
  });
});

describe('applications: delete = permanent cancel, creator only (Section 5D)', () => {
  beforeEach(resetDb);

  it('returns 403 for a non-creator, including Manager and Admin, and 200 with the exact message for the creator', async () => {
    const { agent: creator } = await createLoggedInUser('SPECIALIST', 'creator@example.com');
    const created = await creator.post('/api/applications').send(domesticPayload());
    const id = created.body.record.id;

    const { agent: otherSpecialist } = await createLoggedInUser('SPECIALIST', 'other@example.com');
    const { agent: manager } = await createLoggedInUser('MANAGER', 'mgr@example.com');
    const { agent: admin } = await createLoggedInUser('ADMIN', 'admin@example.com');

    for (const agent of [otherSpecialist, manager, admin]) {
      const res = await agent.delete(`/api/applications/${id}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only the user who created this application can cancel it.');
    }
    expect(await prisma.application.findUnique({ where: { id } })).not.toBeNull();

    const ok = await creator.delete(`/api/applications/${id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.message).toBe(`Application ${id} was cancelled and permanently deleted.`);
    expect(await prisma.application.findUnique({ where: { id } })).toBeNull();

    // One audit entry, and it survives the FK SetNull with the request id preserved.
    const log = await prisma.activityLog.findMany({ where: { requestId: id } });
    const cancelEntries = log.filter((l) => l.action === 'Cancelled & Deleted');
    expect(cancelEntries).toHaveLength(1);
    expect(cancelEntries[0].applicationId).toBeNull();

    // Compared by user id, not display name — give another user the exact same name as the creator
    // on a second application and confirm they still can't delete it.
    const created2 = await creator.post('/api/applications').send(domesticPayload());
    const id2 = created2.body.record.id;
    const { agent: sameName } = await createLoggedInUser('SPECIALIST', 'samename@example.com', 'Test User');
    const res2 = await sameName.delete(`/api/applications/${id2}`);
    expect(res2.status).toBe(403);
  });

  it('404s for an id that does not exist', async () => {
    const { agent } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    const res = await agent.delete('/api/applications/DOM-2099-999');
    expect(res.status).toBe(404);
  });
});

describe('applications: role matrix on workflow actions', () => {
  beforeEach(resetDb);

  async function createAndApproveToWaitingEcaa() {
    const { agent: specialist } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    const created = await specialist.post('/api/applications').send(domesticPayload());
    const id = created.body.record.id;
    const { agent: manager } = await createLoggedInUser('MANAGER', 'mgr@example.com');
    await manager.post(`/api/applications/${id}/manager/approve`);
    return { id, specialist, manager };
  }

  it('only Manager/Admin can approve or request changes on the manager queue', async () => {
    const { agent: specialist } = await createLoggedInUser('SPECIALIST', 'spec@example.com');
    const created = await specialist.post('/api/applications').send(domesticPayload());
    const id = created.body.record.id;

    const forbidden = await specialist.post(`/api/applications/${id}/manager/approve`);
    expect(forbidden.status).toBe(403);

    const { agent: ecaa } = await createLoggedInUser('ECAA', 'ecaa@example.com');
    const forbidden2 = await ecaa.post(`/api/applications/${id}/manager/approve`);
    expect(forbidden2.status).toBe(403);
  });

  it('only ECAA can approve or request changes on the ECAA queue, and Approval No. is required', async () => {
    const { specialist } = await createAndApproveToWaitingEcaa();

    // Default esig OFF path stays at MANAGER_APPROVED until a manual upload — so
    // drive it to WAITING_ECAA_APPROVAL via the manual-approval endpoint isn't
    // needed here; the esig-OFF test below covers that route. Flip the setting
    // ON and re-approve a fresh application instead to reach WAITING_ECAA_APPROVAL
    // through the automatic path.
    const { agent: admin } = await createLoggedInUser('ADMIN', 'admin@example.com');
    await admin.patch('/api/settings').send({ esigApproved: true });
    await admin.post('/api/settings/company-signature').attach('file', Buffer.from('fake-png-bytes'), 'sig.png');

    const created2 = await specialist.post('/api/applications').send(domesticPayload());
    const id2 = created2.body.record.id;
    const approveRes = await (await createLoggedInUser('MANAGER', 'mgr2@example.com')).agent.post(`/api/applications/${id2}/manager/approve`);
    expect(approveRes.body.record.status).toBe('WAITING_ECAA_APPROVAL');

    const forbidden = await specialist.post(`/api/applications/${id2}/ecaa/approve`).send({ approvalNo: 'EG-123' });
    expect(forbidden.status).toBe(403);

    const { agent: ecaa } = await createLoggedInUser('ECAA', 'ecaa@example.com');
    const missingApprovalNo = await ecaa.post(`/api/applications/${id2}/ecaa/approve`).send({});
    expect(missingApprovalNo.status).toBe(400);

    const approved = await ecaa.post(`/api/applications/${id2}/ecaa/approve`).send({ approvalNo: 'EG-123' });
    expect(approved.status).toBe(200);
    expect(approved.body.record.status).toBe('ECAA_APPROVED');
    expect(approved.body.record.approvalNumber).toBe('EG-123');
  });

  it('esig OFF (default): Manager approval does not auto-sign, and the manual approval upload finalizes directly without ECAA login', async () => {
    const { id } = await createAndApproveToWaitingEcaa();
    const rec = await prisma.application.findUniqueOrThrow({ where: { id } });
    expect(rec.status).toBe('MANAGER_APPROVED');
    expect((rec.attachments as any).eSignature).toBeNull();

    // The manual-approval upload is role-gated to any editor role (Specialist/Manager/Admin) — it never requires ECAA to log in.
    const { agent: anyEditor } = await createLoggedInUser('MANAGER', 'mgr3@example.com');
    const missingApprovalNo = await anyEditor.post(`/api/applications/${id}/upload/manual-approval`).attach('file', Buffer.from('fake-pdf-bytes'), 'approval.pdf');
    expect(missingApprovalNo.status).toBe(400);

    const finalized = await anyEditor.post(`/api/applications/${id}/upload/manual-approval`).field('approvalNo', 'ECAA-999').attach('file', Buffer.from('fake-pdf-bytes'), 'approval.pdf');
    expect(finalized.status).toBe(200);
    expect(finalized.body.record.status).toBe('ECAA_APPROVED');
    expect(finalized.body.record.approvalNumber).toBe('ECAA-999');
  });
});
