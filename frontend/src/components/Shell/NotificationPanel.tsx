import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FORM_TYPES } from '../../types';
import { apiPost } from '../../api/client';
import type { NotificationRow } from '../../context/AppDataContext';
import { useAppData } from '../../context/AppDataContext';

function openRecord(navigate: ReturnType<typeof useNavigate>, refreshAll: () => void, row: NotificationRow, onClose: () => void) {
  apiPost(`/applications/${row.id}/notifications/read`, { type: row.type }).finally(() => {
    refreshAll();
    onClose();
    navigate(`/preview/${row.id}`);
  });
}

export function ManagerNotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { managerNotifications, refreshAll } = useAppData();
  const navigate = useNavigate();
  if (!open) return null;
  const approved = managerNotifications.filter((x) => x.kind === 'approval');
  const changes = managerNotifications.filter((x) => x.kind === 'comment');
  return (
    <div className="approval-notify-panel open">
      <div className="approval-notify-head">
        Manager notifications
        <div className="approval-notify-sub">Approval &amp; comments on your applications</div>
      </div>
      {approved.length > 0 && (
        <div className="approval-notify-section section-approval">
          &#10003; Approved <span className="approval-notify-section-count">{approved.length}</span>
        </div>
      )}
      {approved.map((r) => (
        <div key={r.id + r.type} className="approval-notify-item manager-approved" onClick={() => openRecord(navigate, refreshAll, r, onClose)}>
          <div className="approval-notify-title">{FORM_TYPES[r.recType]?.title || r.recType}</div>
          <div className="approval-notify-meta">
            Application: <b>{r.id}</b>
            <br />
            Manager approval granted by <b>{r.managerApprovedBy || 'Manager'}</b>.
          </div>
          <span className="approval-notify-ok">&#10003; Open application</span>
        </div>
      ))}
      {changes.length > 0 && (
        <div className="approval-notify-section section-comment">
          &#9888; Comment / Changes Required <span className="approval-notify-section-count">{changes.length}</span>
        </div>
      )}
      {changes.map((r) => (
        <div key={r.id + r.type} className="approval-notify-item change-request" onClick={() => openRecord(navigate, refreshAll, r, onClose)}>
          <div className="approval-notify-title">{FORM_TYPES[r.recType]?.title || r.recType}</div>
          <div className="approval-notify-meta">
            Application: <b>{r.id}</b>
            <br />
            Manager comment: <b>{r.managerNotes || 'Please review the requested changes.'}</b>
          </div>
          <span className="approval-notify-ok">⚠ Changes required — Click to open</span>
        </div>
      ))}
      {!managerNotifications.length && <div className="approval-notify-empty">No new Manager notifications.</div>}
    </div>
  );
}

export function EcaaNotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ecaaNotifications, refreshAll } = useAppData();
  const navigate = useNavigate();
  if (!open) return null;
  const waiting = ecaaNotifications.filter((x) => x.kind === 'info');
  const approved = ecaaNotifications.filter((x) => x.kind === 'approval');
  const changes = ecaaNotifications.filter((x) => x.kind === 'comment');
  return (
    <div className="approval-notify-panel open">
      <div className="approval-notify-head">
        ECAA notifications
        <div className="approval-notify-sub">Approval &amp; comments on your applications</div>
      </div>
      {approved.length > 0 && (
        <div className="approval-notify-section section-approval">
          &#10003; Approved <span className="approval-notify-section-count">{approved.length}</span>
        </div>
      )}
      {approved.map((r) => (
        <div key={r.id + r.type} className="approval-notify-item ecaa-approved" onClick={() => openRecord(navigate, refreshAll, r, onClose)}>
          <div className="approval-notify-title">{FORM_TYPES[r.recType]?.title || r.recType}</div>
          <div className="approval-notify-meta">
            Application: <b>{r.id}</b>
            <br />
            Approval No: <b>{r.approvalNumber || '—'}</b>
          </div>
          <span className="approval-notify-ok">&#10003; ECAA Approved — Click to open</span>
        </div>
      ))}
      {changes.length > 0 && (
        <div className="approval-notify-section section-comment">
          &#9888; Comment / Changes Required <span className="approval-notify-section-count">{changes.length}</span>
        </div>
      )}
      {changes.map((r) => (
        <div key={r.id + r.type} className="approval-notify-item change-request" onClick={() => openRecord(navigate, refreshAll, r, onClose)}>
          <div className="approval-notify-title">{FORM_TYPES[r.recType]?.title || r.recType}</div>
          <div className="approval-notify-meta">
            Application: <b>{r.id}</b>
            <br />
            ECAA comment: <b>{r.ecaaNotes || 'Please review ECAA comments.'}</b>
          </div>
          <span className="approval-notify-ok">⚠ Changes required — Click to open</span>
        </div>
      ))}
      {waiting.length > 0 && (
        <div className="approval-notify-section section-info">
          Waiting ECAA Approval <span className="approval-notify-section-count">{waiting.length}</span>
        </div>
      )}
      {waiting.map((r) => (
        <div key={r.id + r.type} className="approval-notify-item ecaa-approved" onClick={() => openRecord(navigate, refreshAll, r, onClose)}>
          <div className="approval-notify-title">{FORM_TYPES[r.recType]?.title || r.recType}</div>
          <div className="approval-notify-meta">
            Application: <b>{r.id}</b>
            <br />
            The stamped application has been uploaded and is waiting for ECAA approval.
          </div>
          <span className="approval-notify-ok">Open application</span>
        </div>
      ))}
      {!ecaaNotifications.length && <div className="approval-notify-empty">No new ECAA notifications.</div>}
    </div>
  );
}
