import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import { FORM_TYPES } from '../types';
import type { Application, ApplicationStatus } from '../types';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING_MANAGER_APPROVAL', label: 'Waiting Manager Approval' },
  { value: 'MANAGER_CHANGES_REQUESTED', label: 'Manager Changes Requested' },
  { value: 'MANAGER_APPROVED', label: 'Manager Approved (ready to print/stamp)' },
  { value: 'WAITING_ECAA_APPROVAL', label: 'Waiting ECAA Approval' },
  { value: 'ECAA_CHANGES_REQUESTED', label: 'ECAA Changes Requested' },
  { value: 'ECAA_APPROVED', label: 'ECAA Approved' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function Records() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [records, setRecords] = useState<Application[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (status !== 'all') params.set('status', status);
    apiGet<{ records: Application[] }>(`/applications?${params.toString()}`).then((r) => setRecords(r.records));
  }, [query, status]);

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="search-row">
        <div className="search-box">
          &#128269;
          <input type="text" placeholder="Search by flight no, airport, country, route, or approval no" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus | 'all')}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {records.length === 0 ? (
        <div className="empty-state">No requests match your search</div>
      ) : (
        <div className="records-list">
          {records.map((r) => (
            <div key={r.id} className="record-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/preview/${r.id}`)}>
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
          ))}
        </div>
      )}
    </div>
  );
}
