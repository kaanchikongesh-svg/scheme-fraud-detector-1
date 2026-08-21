import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ResetPassword() {
  const { token: paramToken } = useParams();
  const searchToken = new URLSearchParams(window.location.search).get('token') || '';
  const token = paramToken || searchToken;
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(token ? '' : 'Password reset link is missing or invalid.');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(!token);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      setIsTokenInvalid(true);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const errMsg = err.message || 'Failed to reset password.';
      setError(errMsg);
      if (
        errMsg.toLowerCase().includes('expired') ||
        errMsg.toLowerCase().includes('invalid') ||
        errMsg.toLowerCase().includes('already been used')
      ) {
        setIsTokenInvalid(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-left">
          <div className="login-logo-area">
            <div className="login-logo">🛡️</div>
            <div className="login-logo-title">Verdant Shield</div>
            <div className="login-logo-sub">AI Government Scheme Leakage Detector</div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-box">
            <div className="alert-green" style={{ marginBottom: 20, padding: '16px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                🎉 Password Reset Successful!
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#bbf7d0', lineHeight: 1.5 }}>
                Your account password has been securely updated. Redirecting you to sign in...
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={() => navigate('/login')}
            >
              Sign In Now →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo-area">
          <div className="login-logo">🛡️</div>
          <div className="login-logo-title">Verdant Shield</div>
          <div className="login-logo-sub">AI Government Scheme Leakage Detector</div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <h2>Create New Password</h2>
          <p>Choose a secure password with at least 8 characters for your account.</p>

          {isTokenInvalid && !token && (
            <div className="alert-red" style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#f87171' }}>
              ⚠️ {error || 'Invalid or missing password reset link.'}
              <div style={{ marginTop: 12 }}>
                <Link to="/forgot-password" className="btn btn-secondary btn-sm" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Request New Reset Link
                </Link>
              </div>
            </div>
          )}

          {(!isTokenInvalid || token) && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="alert-red" style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#f87171' }}>
                  ⚠️ {error}
                  {isTokenInvalid && (
                    <div style={{ marginTop: 8 }}>
                      <Link to="/forgot-password" style={{ color: '#60a5fa', fontWeight: 600 }}>
                        → Request a new password reset link
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} type="submit" disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Updating Password...</> : 'Save New Password'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Remembered your credentials?{' '}
            <Link to="/login" style={{ color: 'var(--blue-400)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
