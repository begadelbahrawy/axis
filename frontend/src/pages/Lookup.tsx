import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/client';
import { FORM_TYPES } from '../types';
import type { Application } from '../types';
import StatusBadge from '../components/StatusBadge';
import { canEditApplications, useAuth } from '../context/AuthContext';
import { managerGateMessage } from '../lib/workflow';
import { useAppData } from '../context/AppDataContext';

export default function Lookup() {
  const { user } = useAuth();
  const { settings } = useAppData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Application[] | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);

  const canEdit = canEditApplications(user);

  const search = async (q: string) => {
    setQuery(q);
    setSelected(null);
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

  const cancelApp = async (rec: Application) => {
    if (!confirm(`Cancel application ${rec.id}? This will mark it as Cancelled.`)) return;
    const res = await apiPost<{ record: Application }>(`/applications/${rec.id}/cancel`);
    setSelected(res.record);
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
              <div className={managerGateMessage(selected, settings.esigApproved).cls} dangerouslySetInnerHTML={{ __html: managerGateMessage(selected, settings.esigApproved).html }} />
            )}
            <div className="actions-row">
              <button type="button" className="action-btn ghost" onClick={() => navigate(`/new?edit=${selected.id}`)}>
                Edit application
              </button>
              <button
                type="button"
                className="action-btn"
                style={{ background: '#dc2626', color: '#fff' }}
                disabled={selected.status === 'CANCELLED'}
                onClick={() => cancelApp(selected)}
              >
                {selected.status === 'CANCELLED' ? 'Already cancelled' : 'Cancel application'}
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
