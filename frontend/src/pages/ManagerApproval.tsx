import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
import { FORM_TYPES } from '../types';
import type { Application } from '../types';
import { useAppData } from '../context/AppDataContext';

export default function ManagerApproval() {
  const [pending, setPending] = useState<Application[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { refreshAll } = useAppData();

  const load = () =>
    apiGet<{ pending: Application[]; changesRequested: Application[]; approvedCount: number }>('/manager-queue').then((r) => {
      const all = [...r.pending, ...r.changesRequested];
      setPending(all);
      setApprovedCount(r.approvedCount);
      setNotes((prev) => {
        const next = { ...prev };
        all.forEach((r) => {
          if (next[r.id] === undefined) next[r.id] = r.managerNotes || '';
        });
        return next;
      });
    });

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    await apiPost(`/applications/${id}/manager/approve`);
    load();
    refreshAll();
  };
  const requestChanges = async (id: string) => {
    const note = (notes[id] || '').trim();
    if (!note) return alert('Enter the Manager comments / required changes first.');
    await apiPost(`/applications/${id}/manager/request-changes`, { note });
    load();
    refreshAll();
  };

  const awaitingUserEditCount = pending.filter((r) => r.status === 'MANAGER_CHANGES_REQUESTED').length;
  const pendingCount = pending.filter((r) => r.status === 'PENDING_MANAGER_APPROVAL').length;

  return (
    <div className="manager-page">
      <div className="manager-hero">
        <h1>Manager Approval</h1>
        <p>Review applications, request changes with internal comments, or approve them.</p>
        <div className="manager-count">
          &#9201; {pendingCount} application{pendingCount === 1 ? '' : 's'} awaiting Manager action
        </div>
        {awaitingUserEditCount > 0 && (
          <div className="manager-count" style={{ background: '#fff7df', color: '#9a6700', marginTop: 8 }}>
            &#9998; {awaitingUserEditCount} application{awaitingUserEditCount === 1 ? '' : 's'} sent back for changes — waiting on the applicant to edit and resubmit
          </div>
        )}
      </div>

      <div className="manager-list">
        {pending.length ? (
          pending.map((r) => {
            const title = FORM_TYPES[r.type]?.title || r.type;
            const meta = r.data.meta || {};
            const country = meta.countryEn ? (meta.countryEn === 'Other' ? meta.countryOther || 'Other' : meta.countryEn) : '—';
            const rowCount = (r.data.rows || []).length;
            const requestLabel = r.status === 'MANAGER_CHANGES_REQUESTED' ? 'Manager Changes Requested' : 'Waiting Manager Approval';
            return (
              <div className="manager-card" key={r.id}>
                <div>
                  <h3>
                    {title} <span style={{ color: '#94a3b8', fontWeight: 500 }}>&middot; {r.id}</span>
                  </h3>
                  <div className="manager-meta">
                    <span>
                      Country: <b>{country}</b>
                    </span>
                    <span>
                      Created: <b>{new Date(r.createdAt).toLocaleDateString()}</b>
                    </span>
                    <span>
                      Prepared by: <b>{r.preparedBy || '—'}</b>
                    </span>
                    <span>
                      Flight rows: <b>{rowCount}</b>
                    </span>
                  </div>
                  <span className="manager-status">{requestLabel}</span>
                </div>
                <div className="manager-actions">
                  <button type="button" className="manager-open-btn" onClick={() => navigate(`/preview/${r.id}`)}>
                    Review
                  </button>
                  <button type="button" className="manager-approve-btn" onClick={() => approve(r.id)}>
                    Approve
                  </button>
                  <button type="button" className="manager-open-btn" onClick={() => requestChanges(r.id)}>
                    Request Changes
                  </button>
                </div>
                <div className="manager-review-note-wrap">
                  <label>Manager comments (internal — visible to users only)</label>
                  <textarea
                    className="manager-review-textarea"
                    placeholder="Enter required changes or comments..."
                    value={notes[r.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="manager-empty">
            <div style={{ fontSize: 28, marginBottom: 8 }}>&#10003;</div>
            <b>No applications are waiting for Manager action.</b>
            <div style={{ marginTop: 6, fontSize: 12 }}>New or re-submitted applications will appear here automatically.</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, color: '#64748b', fontSize: 11 }}>
        Manager-approved applications: <b>{approvedCount}</b>
      </div>
    </div>
  );
}
