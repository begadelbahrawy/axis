import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPatch, apiPost, apiUpload, apiDelete, ApiError } from '../api/client';
import type { Application } from '../types';
import StatusBadge from '../components/StatusBadge';
import { useAuth, isEcaaUser, canEditApplications, canPrintApplication, canUploadEcaaApproval } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { managerChangesRequested, waitingEcaaApproval, ecaaChangesRequested, ecaaApproved, managerApproved, managerGateMessage } from '../lib/workflow';
import { useReferenceData } from '../hooks/useReferenceData';
import DocumentPreview from '../components/DocumentPreview';

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, refreshAll } = useAppData();
  const refData = useReferenceData();
  const [rec, setRec] = useState<Application | null>(null);
  const [ecaaNotes, setEcaaNotes] = useState('');
  const [ecaaApprovalNo, setEcaaApprovalNo] = useState('');
  const [manualApprovalNo, setManualApprovalNo] = useState('');

  const load = () =>
    id &&
    apiGet<{ record: Application }>(`/applications/${id}`).then((res) => {
      setRec(res.record);
      setEcaaNotes(res.record.ecaaNotes || '');
      setEcaaApprovalNo(res.record.approvalNumber || '');
      setManualApprovalNo(res.record.approvalNumber || '');
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!rec || !user) return;
    const isManager = user.role === 'MANAGER' || user.role === 'ADMIN';
    if (isManager && rec.status === 'PENDING_MANAGER_APPROVAL') {
      apiPost(`/applications/${rec.id}/notifications/read`, { type: 'manager-queue-view' }).then(refreshAll);
    }
    if (isEcaaUser(user) && rec.status === 'WAITING_ECAA_APPROVAL') {
      apiPost(`/applications/${rec.id}/notifications/read`, { type: 'ecaa-queue-view' }).then(refreshAll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.id, rec?.status]);

  if (!rec) return <div style={{ padding: '22px 18px' }}>Loading…</div>;
  const ecaa = isEcaaUser(user);

  const doPrint = () => window.print();

  const requestEcaaChanges = async () => {
    if (!ecaaNotes.trim()) return alert('Enter the ECAA comments / required changes first.');
    try {
      const res = await apiPost<{ record: Application }>(`/applications/${rec.id}/ecaa/request-changes`, { note: ecaaNotes });
      setRec(res.record);
      refreshAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed.');
    }
  };
  const approveEcaa = async () => {
    if (!ecaaApprovalNo.trim()) return alert('Enter the official ECAA Approval No. before approving.');
    try {
      const res = await apiPost<{ record: Application }>(`/applications/${rec.id}/ecaa/approve`, { approvalNo: ecaaApprovalNo, note: ecaaNotes });
      setRec(res.record);
      refreshAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed.');
    }
  };
  const uploadManual = async (file: File) => {
    if (!manualApprovalNo.trim()) return alert('Enter the official ECAA Approval No. before uploading.');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('approvalNo', manualApprovalNo);
    try {
      const res = await apiUpload<{ record: Application }>('POST', `/applications/${rec.id}/upload/manual-approval`, fd);
      setRec(res.record);
      refreshAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Upload failed.');
    }
  };
  const uploadSupporting = async (files: FileList) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const res = await apiUpload<{ record: Application }>('POST', `/applications/${rec.id}/upload/supporting`, fd);
      setRec(res.record);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Upload failed.');
    }
  };
  const removeSupporting = async (index: number) => {
    const res = await apiDelete<{ record: Application }>(`/applications/${rec.id}/supporting/${index}`);
    setRec(res.record);
  };
  const uploadEcaaSignature = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiUpload<{ record: Application }>('POST', `/applications/${rec.id}/ecaa/signature`, fd);
    setRec(res.record);
  };
  const uploadEcaaSignedApproval = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiUpload<{ record: Application }>('POST', `/applications/${rec.id}/ecaa/signed-approval`, fd);
    setRec(res.record);
  };

  const onFieldChange = async (field: 'salutationText' | 'coverLetterText' | 'ecaaResponse' | 'approvalNumber', value: string) => {
    if (field === 'approvalNumber') setEcaaApprovalNo(value);
    await apiPatch(`/applications/${rec.id}/fields`, { [field]: value });
  };

  const gate = settings ? managerGateMessage(rec) : null;
  const canEdit = canEditApplications(user);
  const canPrint = canPrintApplication(user);
  const canUpload = canUploadEcaaApproval(user);
  const supportingDocs = rec.attachments.supportingDocuments || [];

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <DocumentPreview
        rec={rec}
        refData={refData}
        isEcaa={ecaa}
        interactive
        onFieldChange={onFieldChange}
        onUploadEcaaSignature={ecaa && waitingEcaaApproval(rec) ? uploadEcaaSignature : undefined}
      />

      <div className="status-row">
        <StatusBadge status={rec.status} longForm />
      </div>

      <div className="internal-workflow-note">
        {managerChangesRequested(rec) && rec.managerNotes && (
          <div className="manager-gate">
            <b>Manager Comment:</b> {rec.managerNotes}
          </div>
        )}
        {ecaaChangesRequested(rec) && rec.ecaaNotes && (
          <div className="manager-gate">
            <b>ECAA Comment:</b> {rec.ecaaNotes}
          </div>
        )}
        {rec.ecaaNotes && !ecaaChangesRequested(rec) && (
          <div className="ecaa-returned-note">
            <b>{ecaaApproved(rec) ? 'ECAA Approved' : 'ECAA Note'}:</b> {rec.ecaaNotes}
            <br />
            <span style={{ opacity: 0.75 }}>By: {rec.ecaaActionBy || 'ECAA'}</span>
          </div>
        )}
      </div>

      {ecaa && waitingEcaaApproval(rec) && (
        <div className="ecaa-review-box">
          <h4>ECAA Review &amp; Comments</h4>
          {supportingDocs.length > 0 && (
            <div className="supporting-docs-list">
              <div className="supporting-docs-title">
                &#128206; Supported Documents <span className="supporting-docs-count">{supportingDocs.length}</span>
              </div>
              {supportingDocs.map((d, i) => (
                <div className="supporting-doc-item" key={i}>
                  <a href={d.url} download={d.name}>
                    {d.name}
                  </a>
                </div>
              ))}
            </div>
          )}
          <div className="ecaa-proof-row">
            <label className="ecaa-note-btn" style={{ cursor: 'pointer' }}>
              Upload signed approval
              <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadEcaaSignedApproval(e.target.files[0])} />
            </label>
          </div>
          <div className="ecaa-proof-note">&#8505; Upload your signature or a signed approval file in the circle under the ECAA Response box below before approving.</div>
          {rec.attachments.ecaaApprovalFile && (
            <div className="ecaa-proof-note">
              &#10003; Signed approval uploaded by <b>{rec.attachments.ecaaApprovalFile.uploadedBy}</b> —{' '}
              <a href={rec.attachments.ecaaApprovalFile.url} download={rec.attachments.ecaaApprovalFile.name}>
                Download
              </a>
            </div>
          )}
          <div className="ecaa-approval-no-row">
            <label>Approval No.</label>
            <input type="text" placeholder="Enter official ECAA approval number" value={ecaaApprovalNo} onChange={(e) => setEcaaApprovalNo(e.target.value)} />
          </div>
          <textarea placeholder="Enter ECAA comments or required changes..." value={ecaaNotes} onChange={(e) => setEcaaNotes(e.target.value)} />
          <div className="ecaa-action-row">
            <button type="button" className="ecaa-note-btn" onClick={requestEcaaChanges}>
              Request Changes
            </button>
            <button type="button" className="primary-btn" style={{ margin: 0 }} onClick={approveEcaa}>
              Approve Request
            </button>
          </div>
        </div>
      )}

      {gate && <div className={gate.cls} dangerouslySetInnerHTML={{ __html: gate.html }} />}

      <div className="actions-row">
        {(managerChangesRequested(rec) || ecaaChangesRequested(rec)) && canEdit && (
          <button type="button" className="primary-btn" style={{ margin: 0 }} onClick={() => navigate(`/new?edit=${rec.id}`)}>
            Edit application
          </button>
        )}
        {ecaaApproved(rec) && (canPrint || ecaa) && (
          <button type="button" className="action-btn ghost" onClick={doPrint}>
            Download Approved Application
          </button>
        )}
        {/* A record only ever sits at Manager Approved when it was never auto-signed (toggle OFF, or
            ON but no Company Signature on file — Section 5A's automatic fallback to the manual path),
            so the manual print + Approval No. + upload controls always apply here, never the esig-ON
            "Upload for ECAA approval" shortcut (which Manager Approve applies together with the
            auto-signature in one step, so that record is already at Waiting ECAA Approval instead). */}
        {managerApproved(rec) && canPrint && (
          <button type="button" className="action-btn ghost" onClick={doPrint}>
            Print application
          </button>
        )}
        {managerApproved(rec) && canUpload && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="ECAA Approval No."
              value={manualApprovalNo}
              onChange={(e) => setManualApprovalNo(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', minWidth: 180 }}
            />
            <label className="action-btn upload">
              Upload ECAA approval
              <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadManual(e.target.files[0])} />
            </label>
          </div>
        )}
        {(managerApproved(rec) || waitingEcaaApproval(rec)) && canUpload && (
          <label className="action-btn upload secondary-upload">
            &#128206; Upload supported documents
            <input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && uploadSupporting(e.target.files)} />
          </label>
        )}
      </div>
      {supportingDocs.length > 0 && (
        <div className="supporting-docs-list">
          <div className="supporting-docs-title">
            &#128206; Supported Documents <span className="supporting-docs-count">{supportingDocs.length}</span>
          </div>
          {supportingDocs.map((d, i) => (
            <div className="supporting-doc-item" key={i}>
              <a href={d.url} download={d.name}>
                {d.name}
              </a>
              {canUpload && (
                <button type="button" className="supporting-doc-remove" title="Remove" onClick={() => removeSupporting(i)}>
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
