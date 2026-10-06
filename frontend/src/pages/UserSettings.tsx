import React, { useState } from 'react';
import { useAuth, roleLabel } from '../context/AuthContext';
import { apiPost, ApiError } from '../api/client';

export default function UserSettings() {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);

  if (!user) return null;

  const savePassword = async () => {
    setMsg(null);
    try {
      await apiPost('/auth/change-password', { currentPassword: current, newPassword: next, confirmPassword: confirm });
      setMsg({ type: 'ok', text: 'Password updated.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof ApiError ? e.message : 'Update failed.' });
    }
  };

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="section-label">My Account</div>
        <div className="field-grid" style={{ marginBottom: 18 }}>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={user.email} disabled style={{ background: '#f8fafc', color: '#94a3b8' }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <span className={`role-chip role-${user.role.toLowerCase()}`}>{roleLabel(user.role)}</span>
        </div>
        <button type="button" className="add-row-btn" onClick={() => updateName(name)}>
          Save name
        </button>

        <div className="divider">
          <div className="section-label">Change password</div>
          {msg && <div className={msg.type === 'error' ? 'login-error' : 'login-success-box'}>{msg.text}</div>}
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Current password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>New password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button type="button" className="primary-btn" onClick={savePassword}>
            Update password
          </button>
        </div>
      </div>
    </div>
  );
}
