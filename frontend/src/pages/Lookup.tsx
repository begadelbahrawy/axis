import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiDelete, ApiError } from '../api/client';
import { FORM_TYPES } from '../types';
import type { Application } from '../types';
import StatusBadge from '../components/StatusBadge';
import { canEditApplications, useAuth } from '../context/AuthContext';
import { managerGateMessage } from '../lib/workflow';
import { useAppData } from '../context/AppDataContext';

export default function Lookup() {
  const { user } = useAuth();
  const { settings, refreshAll } = useAppData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Application[] | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const canEdit = canEditApplications(user);

  const search = async (q: string) => {
    setQuery(q);
    setSelected(null);
    setNotice('');
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const res = await apiGet<{ records: Application[] }>(`/applications?q=${encodeURIComponent(q.trim())}`);
    const exact = res.records.find((r) => r.id.toLowerCase() === q.trim().toLowerCase());
    if (exact) {
      setSelected(exact);
      setResults(null);
    } else {
      setResults(res.records);
    }
  };

  // Cancel = permanent delete, creator only (Section 5D). Compared by user id,
  // never display name; the server returns 403 for anyone else including
  // Manager/Admin, which this button mirrors by disabling itself for them.
  const canDelete = (rec: Application) => !!user && rec.createdById === user.id;

  const cancelApp = async (rec: Application) => {
    if (!canDelete(rec)) return;
    if (!confirm(`Cancel application ${rec.id}?\n\nThis will PERMANENTLY DELETE it from the system, including its comments, approvals and uploaded files. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await apiDelete<{ message: string }>(`/applications/${rec.id}`);
      setSelected(null);
      setResults(null);
      setQuery('');
      setNotice(res.message);
      refreshAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Could not cancel this application.');
    } finally {
      setDeleting(false);
    }
  };

  if (!canEdit) {
    return (
      <div style={{ padding: '22px 18px 28px' }}>
        <div className="card">Edit / Cancel is available to Specialist, Manager and Admin users.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card">
        <div className="section-label">Find an application to edit or cancel</div>

        {notice && (
          <div className="manager-approved-note" style={{ marginBottom: 14 }}>
            {notice}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Search by flight no, country, airport, route, approval no, or request no"
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(query)}
            style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit' }}
          />
          <button type="button" style={{ background: '#4A1656', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }} onClick={() => search(query)}>
            Go
          </button>
        </div>

        {selected && (
          <>
            <div className="records-list" style={{ marginBottom: 10 }}>
              <div className="record-row" style={{ cursor: 'default' }}>
                <div>
                  <div className="rec-title">{FORM_TYPES[selected.type]?.title || selected.type}</div>
                  <div className="rec-sub">
                    {selected.id} &middot; {new Date(selected.createdAt).toLocaleDateString()} &middot; prepared by {selected.preparedBy}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
            </div>
            {settings && (
              <div className={managerGateMessage(selected).cls} dangerouslySetInnerHTML={{ __html: managerGateMessage(selected).html }} />
            )}
            <div className="actions-row">
              <button type="button" className="action-btn ghost" onClick={() => navigate(`/new?edit=${selected.id}`)}>
                Edit application
              </button>
              <button
                type="button"
                className="action-btn"
                style={{ background: '#dc2626', color: '#fff' }}
                disabled={!canDelete(selected) || deleting}
                title={canDelete(selected) ? undefined : 'Only the user who created this application can cancel it.'}
                onClick={() => cancelApp(selected)}
              >
                Cancel &amp; delete application
              </button>
            </div>
          </>
        )}

        {!selected && results && (
          <div className="records-list" style={{ marginBottom: 10 }}>
            {results.length ? (
              results.map((r) => (
                <div key={r.id} className="record-row" style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                  <div>
                    <div className="rec-title">{FORM_TYPES[r.type]?.title || r.type}</div>
                    <div className="rec-sub">
                      {r.id} &middot; {new Date(r.createdAt).toLocaleDateString()} &middot; prepared by {r.preparedBy}
                      {r.approvalNumber ? (
                        <>
                          {' '}
                          &middot; Approval No: <b>{r.approvalNumber}</b>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            ) : (
              <div className="empty-state">No application found matching "{query}"</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
