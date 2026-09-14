import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isEcaaUser, isAdminUser } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { apiGet } from '../../api/client';
import type { Application } from '../../types';
import ArchiveSidebar from './ArchiveSidebar';

const GROUPS = ['groupOperations', 'groupReference', 'groupArchive', 'groupAdministration'] as const;

export default function Sidebar() {
  const { user } = useAuth();
  const { pendingUserCount } = useAppData();
  const navigate = useNavigate();
  const ecaa = isEcaaUser(user);
  const admin = isAdminUser(user);
  const [open, setOpen] = useState<Record<string, boolean>>({ groupOperations: true, groupReference: false, groupArchive: false, groupAdministration: false });
  const [records, setRecords] = useState<Application[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ records: Application[] }>('/applications').then((r) => !cancelled && setRecords(r.records));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <aside className="ui-sidebar">
      <div className="ui-sidebar-brand">
        <img src="/assets/aircairo-logo-sidebar.png" alt="AIR CAIRO" />
      </div>
      <div className="ui-sidebar-nav">
        <div className={`sidebar-group${open.groupOperations ? ' open' : ''}`}>
          <button type="button" className="sidebar-category-btn" onClick={() => toggle('groupOperations')}>
            <span>OPERATIONS</span>
            <span className="sidebar-chevron">⌄</span>
          </button>
          <div className="sidebar-group-items">
            <button type="button" className="nav-btn" id="navHomeVisual" onClick={() => navigate('/dashboard')}>
              <span className="ui-nav-icon">⌂</span>
              <span>Home</span>
            </button>
            {!ecaa && (
              <button type="button" className="nav-btn" id="navNew" onClick={() => navigate('/new')}>
                <span className="ui-nav-icon">✈</span>
                <span>New Request</span>
              </button>
            )}
            <button type="button" className="nav-btn" id="navRecords" onClick={() => navigate('/records')}>
              <span className="ui-nav-icon">⌕</span>
              <span>Search &amp; Records</span>
            </button>
            {!ecaa && (
              <button type="button" className="nav-btn" id="navLookup" onClick={() => navigate('/lookup')}>
                <span className="ui-nav-icon">↻</span>
                <span>Edit / Cancel</span>
              </button>
            )}
          </div>
        </div>

        {!ecaa && (
          <div className={`sidebar-group${open.groupReference ? ' open' : ''}`} id="groupReference">
            <button type="button" className="sidebar-category-btn" onClick={() => toggle('groupReference')}>
              <span>REFERENCE DATA</span>
              <span className="sidebar-chevron">⌄</span>
            </button>
            <div className="sidebar-group-items">
              <button type="button" className="nav-btn" onClick={() => navigate('/fleet')}>
                <span className="ui-nav-icon">✈</span>
                <span>Fleet</span>
              </button>
              <button type="button" className="nav-btn" onClick={() => navigate('/countries')}>
                <span className="ui-nav-icon">◎</span>
                <span>Countries</span>
              </button>
              <button type="button" className="nav-btn" onClick={() => navigate('/domestic-airports')}>
                <span className="ui-nav-icon">⌖</span>
                <span>Domestic Airports</span>
              </button>
            </div>
          </div>
        )}

        <div className={`sidebar-group${open.groupArchive ? ' open' : ''}`} id="groupArchive">
          <button type="button" className="sidebar-category-btn" onClick={() => toggle('groupArchive')}>
            <span>ECAA APPROVALS ARCHIVE</span>
            <span className="sidebar-chevron">⌄</span>
          </button>
          <div className="sidebar-group-items archive-tree-wrap">
            <div className="archive-tree">
              <ArchiveSidebar records={records} isEcaa={ecaa} />
            </div>
          </div>
        </div>

        {admin && (
          <div className={`sidebar-group${open.groupAdministration ? ' open' : ''}`} id="groupAdministration">
            <button type="button" className="sidebar-category-btn" onClick={() => toggle('groupAdministration')}>
              <span>ADMINISTRATION</span>
              <span className="sidebar-chevron">⌄</span>
            </button>
            <div className="sidebar-group-items">
              <button type="button" className="nav-btn" onClick={() => navigate('/admin')}>
                <span className="ui-nav-icon">⚙</span>
                <span>Admin Settings</span>
                {pendingUserCount > 0 && <span className="badge-count" style={{ marginLeft: 'auto' }}>{pendingUserCount}</span>}
              </button>
              <button type="button" className="nav-btn" onClick={() => navigate('/activity-log')}>
                <span className="ui-nav-icon">▥</span>
                <span>Activity Log</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
