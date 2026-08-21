import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your registered email address or mobile number.');
      return;
    }

    setLoading(true);

    try {
      const isEmail = trimmed.includes('@');
      const res = await forgotPassword(isEmail ? trimmed : undefined, isEmail ? undefined : trimmed);
      setSubmitted(true);
      setMessage(res?.message || 'If an account exists for this information, a password-reset link has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to initiate password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setMessage('');
    setError('');
    setIdentifier('');
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
          <h2>Forgot Password?</h2>
          <p>Enter your registered email address to receive a secure, single-use password reset link.</p>

          {submitted ? (
            <div>
              <div className="alert-green" style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✉️</span> Reset Link Dispatched
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#bbf7d0' }}>
                  {message}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#86efac', borderTop: '1px solid rgba(34,197,94,0.2)', paddingTop: 8 }}>
                  💡 <strong>Tip:</strong> The reset link is valid for <strong>15 minutes</strong>. If you don't see it in your inbox, please check your spam or junk folder.
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                onClick={handleReset}
              >
                Send to Another Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Registered Email Address / Mobile</label>
                <input
                  className="form-input"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. citizen@gmail.com or 9876543210"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="alert-red" style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#f87171' }}>
                  ⚠️ {error}
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} type="submit" disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Sending Reset Email...</> : 'Send Password Reset Link'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: 'var(--blue-400)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
