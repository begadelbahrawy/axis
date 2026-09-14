import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, isEcaaUser, isManagerUser, roleLabel } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { ManagerNotificationPanel, EcaaNotificationPanel } from './NotificationPanel';
import EcaaQueuePanel from './EcaaQueuePanel';

const PAGE_DISPLAY_NAMES: Record<string, string> = {
  '/dashboard': 'Home',
  '/new': 'New Request',
  '/records': 'Search & Records',
  '/lookup': 'Edit / Cancel',
  '/fleet': 'Fleet',
  '/countries': 'Countries',
  '/domestic-airports': 'Domestic Airports',
  '/admin': 'Admin Settings',
  '/account': 'My Account',
  '/activity-log': 'Activity Log',
  '/manager-approval': 'Manager Approval',
};

function pageName(pathname: string) {
  if (pathname.startsWith('/preview/')) return 'Application Preview';
  return PAGE_DISPLAY_NAMES[pathname] || '';
}

export default function Header() {
  const { user, logout } = useAuth();
  const { managerQueueCount, ecaaQueueCount, managerNotifications, ecaaNotifications } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();
  const ecaa = isEcaaUser(user);
  const manager = isManagerUser(user);
  const hideUserNotify = ecaa || user?.role === 'MANAGER';

  const [openPanel, setOpenPanel] = useState<null | 'manager' | 'ecaa' | 'ecaaQueue' | 'userMenu'>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenPanel(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="ui-header" ref={wrapRef}>
      <div className="ui-header-title">
        <img className="ui-title-logo" src="/assets/axis-logo.png" alt="AXIS" />
        <div className="ui-subtitle">{pageName(location.pathname)}</div>
      </div>
      <div className="ui-header-actions">
        {ecaa && (
          <div className="header-action-wrap" style={{ display: 'flex' }}>
            <button type="button" className="ui-icon-btn" title="Search & Records" onClick={() => navigate('/records')}>
              <svg className="notify-svg-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {manager && (
          <div className="header-action-wrap" style={{ display: 'flex' }}>
            <button type="button" className="ui-icon-btn manager-approval-header-btn" title="Manager Approval Queue" onClick={() => navigate('/manager-approval')}>
              <svg className="notify-svg-icon" viewBox="0 0 24 24" fill="none">
                <path d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {managerQueueCount > 0 && <span className="ui-notify-badge manager-approval-badge">{managerQueueCount}</span>}
            </button>
          </div>
        )}

        {ecaa && (
          <div className="header-action-wrap ecaa-header-wrap" style={{ display: 'flex' }}>
            <button
              type="button"
              className="ui-icon-btn ecaa-header-btn"
              title="ECAA Review Queue"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPanel((p) => (p === 'ecaaQueue' ? null : 'ecaaQueue'));
              }}
            >
              <svg className="notify-svg-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L20 6.5V11C20 15.63 16.84 19.9 12 21C7.16 19.9 4 15.63 4 11V6.5L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              {ecaaQueueCount > 0 && <span className="ui-notify-badge ecaa-queue-badge">{ecaaQueueCount}</span>}
            </button>
            <EcaaQueuePanel open={openPanel === 'ecaaQueue'} />
          </div>
        )}

        {!hideUserNotify && (
          <div className="approval-notify-wrap operations-notify-wrap" style={{ display: 'flex' }}>
            <button
              type="button"
              className="ui-icon-btn notification-btn manager-notify-btn"
              title="Manager notifications"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPanel((p) => (p === 'manager' ? null : 'manager'));
              }}
            >
              <svg className="notify-svg-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12.5L11 14.5L15.5 10M12 21C16.4183 21 20 17.4183 20 13C20 8.58172 16.4183 5 12 5C7.58172 5 4 8.58172 4 13C4 14.5215 4.42452 15.9424 5.16145 17.1493C5.32359 17.4147 5.37701 17.7414 5.29124 18.0413L4.62 20.3768C4.4243 21.0578 5.07093 21.6796 5.74212 21.4408L7.92063 20.6606C8.24449 20.5457 8.6008 20.5666 8.91302 20.7223C9.83587 21.1806 10.8845 21.4383 12 21.4383"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 5V3M12 3H10M12 3H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {managerNotifications.length > 0 && <span className="ui-notify-badge">{managerNotifications.length}</span>}
            </button>
            <ManagerNotificationPanel open={openPanel === 'manager'} onClose={() => setOpenPanel(null)} />
          </div>
        )}

        {!hideUserNotify && (
          <div className="approval-notify-wrap operations-notify-wrap" style={{ display: 'flex' }}>
            <button
              type="button"
              className="ui-icon-btn notification-btn ecaa-notify-btn"
              title="ECAA notifications"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPanel((p) => (p === 'ecaa' ? null : 'ecaa'));
              }}
            >
              <svg className="notify-svg-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L20 6.5V11C20 15.63 16.84 19.9 12 21C7.16 19.9 4 15.63 4 11V6.5L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 12L11 14L15.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {ecaaNotifications.length > 0 && <span className="ui-notify-badge">{ecaaNotifications.length}</span>}
            </button>
            <EcaaNotificationPanel open={openPanel === 'ecaa'} onClose={() => setOpenPanel(null)} />
          </div>
        )}

        <div className="user-menu-wrap">
          <button
            type="button"
            className="ui-user user-menu-trigger"
            title="My Account"
            onClick={(e) => {
              e.stopPropagation();
              setOpenPanel((p) => (p === 'userMenu' ? null : 'userMenu'));
            }}
          >
            <div className="ui-user-avatar">{initials}</div>
            <div>
              <div>{user?.name}</div>
              <small>{roleLabel(user?.role || '')}</small>
            </div>
            <span className="user-menu-chevron">⌄</span>
          </button>
          <div className={`user-menu-dropdown${openPanel === 'userMenu' ? ' open' : ''}`}>
            <button type="button" onClick={() => { setOpenPanel(null); navigate('/account'); }}>
              ⚙&nbsp; My Account Settings
            </button>
            <button type="button" onClick={() => logout().then(() => navigate('/login'))}>
              ↪&nbsp; Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
