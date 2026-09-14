import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

type AuthView = 'login' | 'register' | 'forgot';

export default function Login() {
  const { login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.body.classList.add('login-mode');
    document.body.classList.remove('authenticated-mode', 'role-ecaa');
    return () => document.body.classList.remove('login-mode');
  }, []);

  useEffect(() => {
    setError('');
    setMessage('');
  }, [view]);

  return (
    <div className="login-shell">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id="axisWaveClip" clipPathUnits="objectBoundingBox">
            <path d="M0,0 L0.85,0 C0.70,0.35 0.80,0.65 0.60,1 L0,1 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="login-card-pro">
        <div className="login-brand-panel login-brand-panel-v2">
          <img className="login-brand-photo" src="/assets/login-marketing.jpg" alt="AXIS — Air Cairo Permit Operations" />
          <div className="login-brand-footer-v2">
            <span>&copy; Air Cairo — Permit Operations &middot; Traffic Department</span>
          </div>
        </div>
        <div className="login-form-panel">
          {view === 'login' && (
            <LoginForm
              onSwitch={setView}
              onError={setError}
              error={error}
              onSubmit={async (email, password, remember) => {
                setError('');
                try {
                  await login(email, password, remember);
                  navigate('/dashboard');
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Sign in failed.');
                }
              }}
            />
          )}
          {view === 'register' && (
            <RegisterForm
              onSwitch={setView}
              error={error}
              message={message}
              onSubmit={async (name, email, password, confirm) => {
                setError('');
                setMessage('');
                try {
                  const msg = await register(name, email, password, confirm);
                  setMessage(msg);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Registration failed.');
                }
              }}
            />
          )}
          {view === 'forgot' && (
            <ForgotForm
              onSwitch={setView}
              error={error}
              message={message}
              onSubmit={async (email) => {
                setError('');
                setMessage('');
                try {
                  const msg = await forgotPassword(email);
                  setMessage(msg);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Request failed.');
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AxisLogoHeader({ compact }: { compact?: boolean }) {
  return (
    <div className={`login-axis-logo-wrap${compact ? ' login-axis-logo-wrap-compact' : ''}`}>
      <img src="/assets/axis-logo.png" alt="AXIS — airline eXtended integrated System" />
    </div>
  );
}

function LoginForm({
  onSubmit,
  onSwitch,
  error,
}: {
  onSubmit: (email: string, password: string, remember: boolean) => void;
  onSwitch: (v: AuthView) => void;
  onError: (m: string) => void;
  error: string;
}) {
  const [email, setEmail] = useState(() => localStorage.getItem('axis_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(!!localStorage.getItem('axis_remembered_email'));
  const [showPass, setShowPass] = useState(false);

  const submit = () => {
    if (remember) localStorage.setItem('axis_remembered_email', email);
    else localStorage.removeItem('axis_remembered_email');
    onSubmit(email.trim().toLowerCase(), password, remember);
  };

  return (
    <>
      <AxisLogoHeader />
      <div className="login-form-title">
        Welcome to <span className="login-axis-word">AXIS</span>
      </div>
      <div className="login-axis-tagline">Airline Extended Integrated System</div>
      <div className="login-form-sub">Sign in to access your permit operations workspace.</div>
      <div id="authMsg">{error && <div className="login-error">{error}</div>}</div>
      <div className="login-field">
        <label>Email</label>
        <div className="login-input-wrap">
          <span className="field-icon">&#9993;</span>
          <input
            type="email"
            placeholder="name@aircairo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
      </div>
      <div className="login-field">
        <label>Password</label>
        <div className="login-input-wrap">
          <span className="field-icon">&#128274;</span>
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button type="button" className="login-eye-btn" onClick={() => setShowPass((s) => !s)}>
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div className="login-row-between">
        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
        </label>
        <button type="button" className="login-link-btn" onClick={() => onSwitch('forgot')}>
          Forgot password?
        </button>
      </div>
      <button type="button" className="login-submit-btn" onClick={submit}>
        Sign in &nbsp;&#8594;
      </button>
      <div className="login-switch-line">
        Don't have an account?{' '}
        <button type="button" className="login-link-btn" onClick={() => onSwitch('register')}>
          Register
        </button>
      </div>
      <div className="login-footer-designed">AXIS Aviation Solutions &middot; Version 2.5.0</div>
    </>
  );
}

function RegisterForm({
  onSubmit,
  onSwitch,
  error,
  message,
}: {
  onSubmit: (name: string, email: string, password: string, confirm: string) => void;
  onSwitch: (v: AuthView) => void;
  error: string;
  message: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);

  const submit = () => onSubmit(name.trim(), email.trim(), password, confirm);

  return (
    <div className="login-form-compact">
      <AxisLogoHeader compact />
      <div className="login-form-title">
        Create your <span className="login-axis-word">AXIS</span> account
      </div>
      <div className="login-axis-tagline">Airline Extended Integrated System</div>
      <div className="login-form-sub">
        Register with your email and choose a password. An Admin will review and approve your account before you can sign in.
      </div>
      <div id="authMsg">
        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-success-box" dangerouslySetInnerHTML={{ __html: message }} />}
      </div>
      <div className="login-field">
        <label>Full name</label>
        <div className="login-input-wrap">
          <span className="field-icon">&#128100;</span>
          <input type="text" placeholder="e.g. Begad Fathy" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="login-field">
        <label>Email</label>
        <div className="login-input-wrap">
          <span className="field-icon">&#9993;</span>
          <input type="email" placeholder="name@aircairo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="login-field">
        <label>Password</label>
        <div className="login-input-wrap">
          <span className="field-icon">&#128274;</span>
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button type="button" className="login-eye-btn" onClick={() => setShowPass((s) => !s)}>
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div className="login-field">
        <label>Confirm password</label>
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
        Register
      </button>
      <div className="login-switch-line">
        Already have an account?{' '}
        <button type="button" className="login-link-btn" onClick={() => onSwitch('login')}>
          Sign in
        </button>
      </div>
      <div className="login-footer-designed">AXIS Aviation Solutions &middot; Version 2.5.0</div>
    </div>
  );
}

function ForgotForm({
  onSubmit,
  onSwitch,
  error,
  message,
}: {
  onSubmit: (email: string) => void;
  onSwitch: (v: AuthView) => void;
  error: string;
  message: string;
}) {
  const [email, setEmail] = useState('');
  return (
    <div className="login-form-compact">
      <AxisLogoHeader compact />
      <div className="login-form-title">
        Reset your <span className="login-axis-word">AXIS</span> password
      </div>
      <div className="login-axis-tagline">Airline Extended Integrated System</div>
      <div className="login-form-sub">Enter your account email — a new password will be emailed to you.</div>
      <div id="authMsg">
        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-success-box">{message}</div>}
      </div>
      <div className="login-field">
        <label>Email</label>
        <div className="login-input-wrap">
          <span className="field-icon">&#9993;</span>
          <input
            type="email"
            placeholder="name@aircairo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit(email.trim())}
          />
        </div>
      </div>
      <button type="button" className="login-submit-btn" onClick={() => onSubmit(email.trim())}>
        Send new password
      </button>
      <div className="login-switch-line">
        Remembered it?{' '}
        <button type="button" className="login-link-btn" onClick={() => onSwitch('login')}>
          Sign in
        </button>
      </div>
      <div className="login-footer-designed">AXIS Aviation Solutions &middot; Version 2.5.0</div>
    </div>
  );
}
