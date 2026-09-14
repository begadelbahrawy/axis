import React, { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '../api/client';
import { roleLabel, useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import type { Role, Settings, User } from '../types';

type Pending = { id: string; name: string; email: string; requestedAt: string };

export default function UserManagement() {
  const { user: me } = useAuth();
  const { settings, refreshAll } = useAppData();
  const [pending, setPending] = useState<Pending[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});
  const [localSettings, setLocalSettings] = useState<Settings | null>(settings);

  const load = () => {
    apiGet<{ pending: Pending[] }>('/admin/pending-users').then((r) => setPending(r.pending));
    apiGet<{ users: User[] }>('/admin/users').then((r) => setUsers(r.users));
  };
  useEffect(load, []);
  useEffect(() => setLocalSettings(settings), [settings]);

  const toggleEsig = async (checked: boolean) => {
    const res = await apiPatch<{ settings: Settings }>('/settings', { esigApproved: checked });
    setLocalSettings(res.settings);
    refreshAll();
  };

  const uploadSignature = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiUpload<{ settings: Settings }>('POST', '/settings/company-signature', fd);
    setLocalSettings(res.settings);
    refreshAll();
  };
  const removeSignature = async () => {
    const res = await apiDelete<{ settings: Settings }>('/settings/company-signature');
    setLocalSettings(res.settings);
    refreshAll();
  };

  const approveRequest = async (id: string, name: string, email: string) => {
    const role = pendingRoles[id] || 'SPECIALIST';
    await apiPost(`/admin/pending-users/${id}/approve`, { role });
    alert(`Approved. A confirmation email has been sent to ${name} (${email}) — they can now sign in with the ${roleLabel(role)} role.`);
    load();
    refreshAll();
  };
  const rejectRequest = async (id: string) => {
    await apiPost(`/admin/pending-users/${id}/reject`);
    load();
    refreshAll();
  };
  const changeRole = async (id: string, role: Role) => {
    await apiPatch(`/admin/users/${id}`, { role });
    load();
  };
  const deactivate = async (id: string, email: string) => {
    if (!confirm(`Deactivate account ${email}? The user will no longer be able to sign in.`)) return;
    await apiPatch(`/admin/users/${id}`, { active: false });
    load();
  };
  const activate = async (id: string, email: string) => {
    if (!confirm(`Activate account ${email}?`)) return;
    await apiPatch(`/admin/users/${id}`, { active: true });
    load();
  };

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card user-admin-card">
        <div className="section-label">Electronic Signature Approval</div>
        <p className="admin-section-note">
          Turn this ON once Electronic Signature has been officially approved (by both Manager and ECAA). While it is OFF (default), Manager approval does <b>not</b> apply an
          automatic signature — instead the User prints the application, gets it physically stamped, and uploads the stamped copy with the official ECAA Approval No. directly.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#21106f' }}>
          <input type="checkbox" style={{ width: 16, height: 16 }} checked={!!localSettings?.esigApproved} onChange={(e) => toggleEsig(e.target.checked)} />
          Electronic Signature is officially approved
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              borderRadius: 999,
              padding: '4px 10px',
              background: localSettings?.esigApproved ? '#ecfdf5' : '#fff7df',
              color: localSettings?.esigApproved ? '#047857' : '#9a6700',
            }}
          >
            {localSettings?.esigApproved ? 'ON — automatic signature' : 'OFF — manual print & stamp'}
          </span>
        </label>
      </div>

      <div className="card user-admin-card" style={{ marginTop: 16 }}>
        <div className="section-label">Company Electronic Signature</div>
        <p className="admin-section-note">The signature that is applied automatically to the signature circle whenever a Manager approves an application. One signature, managed here by Admin.</p>
        {localSettings?.companySignatureUrl ? (
          <>
            <div className="esign-preview" style={{ display: 'block', maxWidth: 220 }}>
              <img src={localSettings.companySignatureUrl} alt="Company electronic signature" />
              <div className="esign-caption">
                Uploaded by {localSettings.companySignatureUploadedBy}
                <br />
                {localSettings.companySignatureUploadedAt ? new Date(localSettings.companySignatureUploadedAt).toLocaleString() : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <label className="add-row-btn" style={{ cursor: 'pointer', margin: 0 }}>
                Replace signature
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadSignature(e.target.files[0])} />
              </label>
              <button type="button" className="ecaa-note-btn" style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={removeSignature}>
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="add-row-btn" style={{ cursor: 'pointer' }}>
              Upload signature image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadSignature(e.target.files[0])} />
            </label>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>No signature uploaded yet — the signature circle will stay empty until one is set.</div>
          </>
        )}
      </div>

      <div className="card user-admin-card" style={{ marginTop: 16 }}>
        <div className="section-label">User Management</div>
        <p className="admin-section-note">
          Anyone can register with their own email and password. New requests appear below for you to review, assign a role, and approve or reject — the requester is then
          notified they can sign in.
        </p>
        <div className="section-label" style={{ fontSize: 12 }}>
          Pending User Requests{pending.length > 0 && <span className="badge-count" style={{ marginLeft: 4 }}>{pending.length}</span>}
        </div>
        <div className="flight-table-wrap">
          <table className="flight-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.length ? (
                pending.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{new Date(u.requestedAt).toLocaleString()}</td>
                    <td className="user-row-actions">
                      <select className="role-select" value={pendingRoles[u.id] || 'SPECIALIST'} onChange={(e) => setPendingRoles({ ...pendingRoles, [u.id]: e.target.value as Role })}>
                        <option value="SPECIALIST">Specialist</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ECAA">ECAA</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button type="button" className="add-row-btn" style={{ margin: 0 }} onClick={() => approveRequest(u.id, u.name, u.email)}>
                        Approve User
                      </button>
                      <button type="button" className="ecaa-note-btn" onClick={() => rejectRequest(u.id)}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: '#94a3b8' }}>
                    No pending user requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section-label" style={{ fontSize: 12, marginTop: 22 }}>
          Active Accounts
        </div>
        <div className="flight-table-wrap">
          <table className="flight-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.name}</td>
                  <td>{acc.email}</td>
                  <td>
                    <span className={`role-chip role-${acc.role.toLowerCase()}`}>{roleLabel(acc.role)}</span>
                  </td>
                  <td>{acc.active === false ? <span className="admin-approval-pending">Deactivated</span> : <span className="admin-approval-approved">Active</span>}</td>
                  <td className="user-row-actions">
                    {acc.email !== me?.email ? (
                      <>
                        <select className="role-select" value={acc.role} onChange={(e) => changeRole(acc.id, e.target.value as Role)}>
                          <option value="SPECIALIST">Specialist</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ECAA">ECAA</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        {acc.active === false ? (
                          <button type="button" className="add-row-btn" style={{ margin: 0 }} onClick={() => activate(acc.id, acc.email)}>
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ecaa-note-btn"
                            style={{ color: '#b91c1c', borderColor: '#fecaca', background: '#fff7f7' }}
                            onClick={() => deactivate(acc.id, acc.email)}
                          >
                            Deactivate
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Current Admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
