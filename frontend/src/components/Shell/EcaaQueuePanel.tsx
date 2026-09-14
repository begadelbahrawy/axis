import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { FORM_TYPES } from '../../types';
import type { Application } from '../../types';

export default function EcaaQueuePanel({ open }: { open: boolean }) {
  const [pending, setPending] = useState<Application[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    apiGet<{ waiting: Application[] }>('/ecaa-queue').then((r) => setPending(r.waiting));
  }, [open]);

  if (!open) return null;
  return (
    <div className="approval-notify-panel ecaa-queue-panel open">
      <div className="approval-notify-head">
        ECAA Review Queue
        <div className="approval-notify-sub">
          {pending.length} application{pending.length === 1 ? '' : 's'} waiting for ECAA review
        </div>
      </div>
      {pending.length ? (
        pending.map((r) => {
          const docCount = r.attachments.supportingDocuments?.length || 0;
          return (
            <div key={r.id} className="ecaa-queue-item" onClick={() => navigate(`/preview/${r.id}`)}>
              <div className="ecaa-queue-title">
                {FORM_TYPES[r.type]?.title || r.type}
                {docCount > 0 && <span className="ecaa-queue-attach">&#128206; {docCount}</span>}
              </div>
              <div className="ecaa-queue-meta">
                Application: <b>{r.id}</b>
                <br />
                Manager approved by: <b>{r.managerApprovedBy || 'Manager'}</b> · {r.managerApprovedAt ? new Date(r.managerApprovedAt).toLocaleString() : ''}
              </div>
              <span className="ecaa-queue-action">Open ECAA Review</span>
            </div>
          );
        })
      ) : (
        <div className="ecaa-queue-empty">No applications are waiting for ECAA review.</div>
      )}
    </div>
  );
}
