import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import AxisWaveClip from '../components/AxisWaveClip';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.body.classList.add('login-mode');
    document.body.classList.remove('authenticated-mode', 'role-ecaa');
    return () => document.body.classList.remove('login-mode');
  }, []);

  const submit = async () => {
    setError('');
    setMessage('');
    if (!token) return setError('This reset link is missing its token.');
    if (!password || password.length < 6) return setError('Choose a password with at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    try {
      const msg = await resetPassword(token, password);
      setMessage(msg);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reset your password.');
    }
  };

  return (
    <div className="login-shell">
      <AxisWaveClip />
      <div className="login-card-pro">
        <div className="login-brand-panel login-brand-panel-v2">
          <img className="login-brand-photo" src="/assets/login-left-panel.jpg" alt="AXIS — Air Cairo Permit Operations" />
          <div className="login-brand-footer-v2">
            <span>&copy; Air Cairo — Permit Operations &middot; Traffic Department</span>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-form-compact">
            <div className="login-axis-logo-wrap login-axis-logo-wrap-compact">
              <img src="/assets/axis-logo.png" alt="AXIS — airline eXtended integrated System" />
            </div>
            <div className="login-form-title">
              Choose a new <span className="login-axis-word">AXIS</span> password
            </div>
            <div className="login-axis-tagline">Airline Extended Integrated System</div>
            <div className="login-form-sub">This link can only be used once and expires one hour after it was sent.</div>
            <div id="authMsg">
              {error && <div className="login-error">{error}</div>}
              {message && <div className="login-success-box">{message}</div>}
            </div>
            {!message && (
              <>
                <div className="login-field">
                  <label>New password</label>
                  <div className="login-input-wrap">
                    <span className="field-icon">&#128274;</span>
                    <input type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <div className="login-field">
                  <label>Confirm new password</label>
                  <div className="login-input-wrap">
                    <span className="field-icon">&#128274;</span>
                    <input
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submit()}
                    />
                  </div>
                </div>
                <button type="button" className="login-submit-btn" onClick={submit}>
                  Update password
                </button>
              </>
            )}
            {message && (
              <button type="button" className="login-submit-btn" onClick={() => navigate('/login')}>
                Go to sign in
              </button>
            )}
            <div className="login-footer-designed">AXIS Aviation Solutions &middot; Version 2.5.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
