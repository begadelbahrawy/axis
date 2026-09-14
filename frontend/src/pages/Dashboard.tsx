import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../api/client';
import { FORM_TYPES } from '../types';
import type { Application, ApplicationStatus } from '../types';
import { useAuth, isEcaaUser, isManagerUser } from '../context/AuthContext';

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'Waiting Manager Approval',
  MANAGER_APPROVED: 'Manager Approved',
  WAITING_ECAA_APPROVAL: 'Waiting ECAA Approval',
  MANAGER_CHANGES_REQUESTED: 'Manager Changes Requested',
  ECAA_APPROVED: 'ECAA Approved',
  ECAA_CHANGES_REQUESTED: 'ECAA Changes Requested',
  CANCELLED: 'Cancelled',
};
const STATUS_CLASS: Record<string, string> = {
  PENDING_MANAGER_APPROVAL: 'pending',
  MANAGER_APPROVED: 'waiting',
  WAITING_ECAA_APPROVAL: 'waiting',
  MANAGER_CHANGES_REQUESTED: 'pending',
  ECAA_APPROVED: 'approved',
  ECAA_CHANGES_REQUESTED: 'pending',
  CANCELLED: 'cancelled',
};

function recordArchiveCountries(r: Application): string[] {
  const cfg = FORM_TYPES[r.type] || ({} as any);
  if (cfg.noCountry) return ['No Country / N/A'];
  if (cfg.multiCountry) {
    const set = new Set<string>();
    (r.data.countrySections || []).forEach((sec: any) => {
      const c = sec.countryEn === 'Other' ? sec.countryOther || 'Other' : sec.countryEn;
      if (c) set.add(c);
    });
    return set.size ? [...set] : ['Unspecified'];
  }
  const meta = r.data.meta || {};
  const c = meta.countryEn === 'Other' ? meta.countryOther || 'Other' : meta.countryEn;
  return [c || 'Unspecified'];
}

export default function Dashboard() {
  const { user } = useAuth();
  const ecaa = isEcaaUser(user);
  const manager = isManagerUser(user);
  const navigate = useNavigate();
  const [records, setRecords] = useState<Application[]>([]);
  const [dashboardDate, setDashboardDate] = useState(todayIso());

  useEffect(() => {
    apiGet<{ records: Application[] }>('/applications').then((r) => setRecords(r.records));
  }, []);

  const openStatus = (status: ApplicationStatus) => {
    if (status === 'PENDING_MANAGER_APPROVAL' && manager) {
      navigate('/manager-approval');
      return;
    }
    navigate(`/records?status=${status}`);
  };

  const all = useMemo(() => {
    return records
      .filter((r) => (r.createdAt.slice(0, 10) <= dashboardDate))
      .filter((r) => (ecaa ? ['ECAA_CHANGES_REQUESTED', 'WAITING_ECAA_APPROVAL', 'ECAA_APPROVED'].includes(r.status) : true));
  }, [records, dashboardDate, ecaa]);

  const count = (status: ApplicationStatus) => all.filter((r) => r.status === status).length;

  const total = all.length;
  const pendingManager = count('PENDING_MANAGER_APPROVAL');
  const managerApprovedCount = count('MANAGER_APPROVED');
  const waitingEcaa = count('WAITING_ECAA_APPROVAL');
  const ecaaApprovedCount = count('ECAA_APPROVED');
  const managerChanges = count('MANAGER_CHANGES_REQUESTED');
  const changesRequested = count('ECAA_CHANGES_REQUESTED');
  const cancelledCount = count('CANCELLED');

  const recent = [...all].reverse().slice(0, 8);

  const pipelineStages: [ApplicationStatus, string, number, string][] = [
    ['PENDING_MANAGER_APPROVAL', 'Waiting Manager Approval', pendingManager, '#9a6700'],
    ['MANAGER_CHANGES_REQUESTED', 'Manager Changes Requested', managerChanges, '#F7941D'],
    ['MANAGER_APPROVED', 'Manager Approved (ready to print/stamp)', managerApprovedCount, '#5b21b6'],
    ['WAITING_ECAA_APPROVAL', 'Waiting ECAA Approval', waitingEcaa, '#5b21b6'],
    ['ECAA_CHANGES_REQUESTED', 'ECAA Changes Requested', changesRequested, '#F7941D'],
    ['ECAA_APPROVED', 'ECAA Approved', ecaaApprovedCount, '#047857'],
  ];
  const maxStage = Math.max(...pipelineStages.map((s) => s[2]), 1);
  const approvalRate = total ? Math.round((ecaaApprovedCount / total) * 100) : 0;

  const countryTally: Record<string, number> = {};
  all.forEach((r) => {
    const cfg = FORM_TYPES[r.type] || ({} as any);
    if (cfg.noCountry) return;
    recordArchiveCountries(r).forEach((c) => {
      if (c === 'Unspecified') return;
      countryTally[c] = (countryTally[c] || 0) + 1;
    });
  });
  const topCountries = Object.entries(countryTally).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCountryCount = Math.max(...topCountries.map(([, c]) => c), 1);

  const typeTally: Record<string, number> = {};
  all.forEach((r) => (typeTally[r.type] = (typeTally[r.type] || 0) + 1));
  const typeBreakdown = Object.entries(typeTally).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTypeCount = Math.max(...typeBreakdown.map(([, c]) => c), 1);

  const donutBuckets = [
    { label: 'In Manager Review', count: pendingManager + managerChanges, color: '#F7941D' },
    { label: 'Manager Approved', count: managerApprovedCount, color: '#0ea5e9' },
    { label: 'In ECAA Review', count: waitingEcaa + changesRequested, color: '#7c3aed' },
    { label: 'Approved', count: ecaaApprovedCount, color: '#22c55e' },
    { label: 'Cancelled', count: cancelledCount, color: '#ef4444' },
  ];
  const donutTotal = donutBuckets.reduce((s, b) => s + b.count, 0);
  let donutGradient = '#eef1f6';
  if (donutTotal > 0) {
    let acc = 0;
    const stops: string[] = [];
    donutBuckets
      .filter((b) => b.count > 0)
      .forEach((b) => {
        const from = (acc / donutTotal) * 100;
        acc += b.count;
        const to = (acc / donutTotal) * 100;
        stops.push(`${b.color} ${from}% ${to}%`);
      });
    donutGradient = `conic-gradient(${stops.join(', ')})`;
  }

  const kpi = (cls: string, glyph: string, label: string, value: number, sub: string, status: ApplicationStatus) => (
    <div className={`dashboard-kpi ${cls}`} onClick={() => openStatus(status)}>
      <div className="dashboard-kpi-icon" dangerouslySetInnerHTML={{ __html: glyph }} />
      <div className="dashboard-kpi-body">
        <div className="dashboard-kpi-label">{label}</div>
        <div className="dashboard-kpi-value">{value}</div>
        <div className="dashboard-kpi-sub">{sub}</div>
      </div>
    </div>
  );

  return (
    <div id="viewDashboard">
      <div className="dashboard-hero-band">
        <div className="dashboard-hero-inner">
          <div>
            <div className="dashboard-hero-eyebrow">Permit Operations &middot; Traffic Department</div>
            <div className="dashboard-welcome">
              <h1>Operations Dashboard</h1>
              <p>Application status, approval pipeline and operational activity at a glance.</p>
            </div>
          </div>
          <div className="dashboard-hero-stats">
            {!ecaa && (
              <div className="dashboard-hero-stat">
                <span className="dashboard-hero-stat-value">{approvalRate}%</span>
                <span className="dashboard-hero-stat-label">Approval Rate</span>
              </div>
            )}
            <div className="dashboard-date">
              <span>&#128197;</span>
              <input type="date" className="dashboard-date-input" value={dashboardDate} onChange={(e) => setDashboardDate(e.target.value)} /> ·{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-wrap">
        <div className="dashboard-kpis">
          {ecaa ? (
            <>
              {kpi('warning', '&#9888;', 'ECAA Changes', changesRequested, 'Needs specialist update', 'ECAA_CHANGES_REQUESTED')}
              {kpi('info', '&#9724;', 'Waiting ECAA Approval', waitingEcaa, 'Ready for your response', 'WAITING_ECAA_APPROVAL')}
              {kpi('success', '&#10004;', 'ECAA Approved', ecaaApprovedCount, 'Approval complete', 'ECAA_APPROVED')}
            </>
          ) : (
            <>
              <div className="dashboard-kpi neutral" onClick={() => navigate('/records')}>
                <div className="dashboard-kpi-icon" dangerouslySetInnerHTML={{ __html: '&#8962;' }} />
                <div className="dashboard-kpi-body">
                  <div className="dashboard-kpi-label">Total Applications</div>
                  <div className="dashboard-kpi-value">{total}</div>
                  <div className="dashboard-kpi-sub">All active records</div>
                </div>
              </div>
              {kpi('warning', '&#9201;', 'Waiting Manager', pendingManager, 'Manager action required', 'PENDING_MANAGER_APPROVAL')}
              {kpi('warning', '&#9998;', 'Manager Changes', managerChanges, 'Needs user update', 'MANAGER_CHANGES_REQUESTED')}
              {kpi('info', '&#10003;', 'Manager Approved', managerApprovedCount, 'Ready to print / stamp', 'MANAGER_APPROVED')}
              {kpi('info', '&#9724;', 'Waiting ECAA', waitingEcaa, 'Ready for ECAA response', 'WAITING_ECAA_APPROVAL')}
              {kpi('warning', '&#9888;', 'ECAA Changes', changesRequested, 'Needs specialist update', 'ECAA_CHANGES_REQUESTED')}
              {kpi('success', '&#10004;', 'ECAA Approved', ecaaApprovedCount, 'Approval complete', 'ECAA_APPROVED')}
              {kpi('danger', '&#10005;', 'Cancelled', cancelledCount, 'Closed applications', 'CANCELLED')}
            </>
          )}
        </div>

        {!ecaa && (
          <>
            <div className="dashboard-main-grid">
              <div className="dashboard-card">
                <div className="dashboard-card-title">
                  <h2>Approval Pipeline</h2>
                  <span>Current application workflow</span>
                </div>
                <div className="dashboard-pipeline">
                  {pipelineStages.map(([status, label, cnt, color]) => (
                    <div key={status} className="dashboard-pline-row" onClick={() => openStatus(status)}>
                      <div className="dashboard-pline-top">
                        <span className="dashboard-pline-name">
                          <span className="dashboard-pline-dot" style={{ background: color }} />
                          {label}
                        </span>
                        <span className="dashboard-pline-count">{cnt}</span>
                      </div>
                      <div className="dashboard-pline-bar">
                        <i style={{ width: `${Math.min(100, Math.round((cnt / maxStage) * 100))}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-card-title" style={{ marginTop: 26 }}>
                  <h2>Recent Applications</h2>
                  <span>{recent.length} latest records</span>
                </div>
                {recent.length ? (
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Type</th>
                        <th>Created</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r) => (
                        <tr key={r.id} className="clickable" onClick={() => navigate(`/preview/${r.id}`)}>
                          <td>
                            <b>{r.id}</b>
                          </td>
                          <td>{FORM_TYPES[r.type]?.title || r.type}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`dashboard-status ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">No applications yet.</div>
                )}
              </div>

              <div>
                <div className="dashboard-card">
                  <div className="dashboard-card-title">
                    <h2>Work Queue</h2>
                    <span>Action required</span>
                  </div>
                  <div className="dashboard-queue-item q-warning" onClick={() => openStatus('PENDING_MANAGER_APPROVAL')}>
                    <div className="dashboard-queue-icon" dangerouslySetInnerHTML={{ __html: '&#9201;' }} />
                    <div className="dashboard-queue-body">
                      <div className="dashboard-queue-label">Manager approval queue</div>
                      <div className="dashboard-queue-sub">Awaiting Manager decision</div>
                    </div>
                    <div className="dashboard-queue-count">{pendingManager}</div>
                  </div>
                  <div className="dashboard-queue-item q-info" onClick={() => openStatus('WAITING_ECAA_APPROVAL')}>
                    <div className="dashboard-queue-icon" dangerouslySetInnerHTML={{ __html: '&#9724;' }} />
                    <div className="dashboard-queue-body">
                      <div className="dashboard-queue-label">ECAA approval queue</div>
                      <div className="dashboard-queue-sub">Stamped &amp; awaiting ECAA</div>
                    </div>
                    <div className="dashboard-queue-count">{waitingEcaa}</div>
                  </div>
                  <div className="dashboard-queue-item q-success" onClick={() => openStatus('ECAA_APPROVED')}>
                    <div className="dashboard-queue-icon" dangerouslySetInnerHTML={{ __html: '&#10004;' }} />
                    <div className="dashboard-queue-body">
                      <div className="dashboard-queue-label">Completed ECAA approvals</div>
                      <div className="dashboard-queue-sub">Ready for download</div>
                    </div>
                    <div className="dashboard-queue-count">{ecaaApprovedCount}</div>
                  </div>
                  <div className="dashboard-note">
                    <b>Workflow:</b> Generate Form → Manager Approval → Print / Stamp / Upload → ECAA Approval → Completed.
                    {manager ? (
                      <>
                        <br />
                        <br />
                        <b>Manager:</b> pending applications are waiting for your review.
                      </>
                    ) : (
                      <>
                        <br />
                        <br />
                        <b>Operations:</b> Manager approval is required before ECAA submission.
                      </>
                    )}
                  </div>
                </div>

                <div className="dashboard-card" style={{ marginTop: 16 }}>
                  <div className="dashboard-card-title">
                    <h2>Status Distribution</h2>
                    <span>{donutTotal} total</span>
                  </div>
                  <div className="dashboard-donut-wrap">
                    <div className="dashboard-donut-center">
                      <div className="dashboard-donut" style={{ background: donutGradient }} />
                      <div className="dashboard-donut-center-label">
                        <b>{donutTotal}</b>
                        <span>Total</span>
                      </div>
                    </div>
                    <div className="dashboard-legend">
                      {donutBuckets.map((b) => (
                        <div key={b.label} className="dashboard-legend-item">
                          <span className="dashboard-legend-dot" style={{ background: b.color }} />
                          {b.label}
                          <b>{b.count}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-main-grid" style={{ marginTop: 16 }}>
              <div className="dashboard-card">
                <div className="dashboard-card-title">
                  <h2>Top Destination Countries</h2>
                  <span>By application count</span>
                </div>
                {topCountries.length ? (
                  <div className="dashboard-pipeline">
                    {topCountries.map(([country, cnt]) => (
                      <div key={country} className="dashboard-pline-row" onClick={() => navigate(`/records?q=${encodeURIComponent(country)}`)}>
                        <div className="dashboard-pline-top">
                          <span className="dashboard-pline-name">
                            <span className="dashboard-pline-dot" style={{ background: '#4A1656' }} />
                            {country}
                          </span>
                          <span className="dashboard-pline-count">{cnt}</span>
                        </div>
                        <div className="dashboard-pline-bar">
                          <i style={{ width: `${Math.min(100, Math.round((cnt / maxCountryCount) * 100))}%`, background: '#4A1656' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No country data yet.</div>
                )}
              </div>
              <div className="dashboard-card">
                <div className="dashboard-card-title">
                  <h2>By Application Type</h2>
                  <span>{typeBreakdown.length} types in use</span>
                </div>
                {typeBreakdown.length ? (
                  <div className="dashboard-pipeline">
                    {typeBreakdown.map(([type, cnt]) => (
                      <div key={type} className="dashboard-pline-row" onClick={() => navigate('/records')}>
                        <div className="dashboard-pline-top">
                          <span className="dashboard-pline-name">
                            <span className="dashboard-pline-dot" style={{ background: '#F7941D' }} />
                            {FORM_TYPES[type]?.title || type}
                          </span>
                          <span className="dashboard-pline-count">{cnt}</span>
                        </div>
                        <div className="dashboard-pline-bar">
                          <i style={{ width: `${Math.min(100, Math.round((cnt / maxTypeCount) * 100))}%`, background: '#F7941D' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No applications yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
