import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ email: email.trim(), password });
      const role = result?.user?.role;
      if (role === 'citizen') {
        setError('This portal is restricted to Government Officers & Administrators. Citizen applicants must use the citizen login.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid Administrator credentials.');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoFill(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  }

  return (
    <div className="login-page">
      <div className="login-left" style={{ background: 'linear-gradient(135deg, #070d18 0%, #0c1a30 50%, #1e3a8a 100%)' }}>
        <div className="login-logo-area">
          <img src="/logo.svg" alt="SchemeSecure AI" style={{ width: 60, height: 60, marginBottom: 12, filter: 'drop-shadow(0 4px 16px rgba(37,99,235,0.6))' }} />
          <div className="login-logo-title" style={{ fontSize: 26, letterSpacing: 0.5 }}>SchemeSecure AI</div>
          <div className="login-logo-sub" style={{ fontSize: 13, color: '#93c5fd', marginTop: 6 }}>
            AI Government Scheme Fraud Detection & Verification System
          </div>

          <div style={{ marginTop: 28, padding: '14px 18px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', maxWidth: 360 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
              🔒 RESTRICTED GOVERNMENT ACCESS
            </div>
            <div style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
              Authorized state administrators, district collectors, and verification officers only. All actions are cryptographically signed and logged.
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box" style={{ maxWidth: 440 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: 22 }}>Admin Authentication</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
            Sign in to access scheme verification, fraud telemetry, and cross-application duplicate audits.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Official Admin Email</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@gov.in or officer@gov.in"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Admin Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--blue-400)', textDecoration: 'none' }}>
                  Forgot Password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-red" style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#f87171' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14, fontWeight: 700, marginBottom: 16 }}
              type="submit"
              disabled={loading}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Verifying Credentials...</> : 'Authenticate & Access Dashboard →'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: 10, padding: 14, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>
              ⚡ 1-Click Demo Administrator Access:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, padding: '6px 8px', justifyContent: 'center' }}
                onClick={() => handleDemoFill('admin@gov.in', 'admin123')}
              >
                👑 State Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, padding: '6px 8px', justifyContent: 'center' }}
                onClick={() => handleDemoFill('vo.k@gov.in', 'officer123')}
              >
                🔍 Verifying Officer
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
            Are you a citizen applicant?{' '}
            <Link to="/login" style={{ color: 'var(--blue-400)', fontWeight: 600, textDecoration: 'none' }}>
              Citizen Login Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
