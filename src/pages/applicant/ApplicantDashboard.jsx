import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import api from '../../lib/api.js';

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [schemesRes, appsRes] = await Promise.all([
          api.get('/api/v1/schemes').catch(() => []),
          api.get('/api/v1/applications/my').catch(() => [])
        ]);
        setSchemes(Array.isArray(schemesRes) ? schemesRes : []);
        setMyApplications(Array.isArray(appsRes) ? appsRes : []);
      } catch {
        setError('Failed to load applicant portal data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <span className="status-badge approved">✅ Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">❌ Rejected</span>;
      case 'under_review':
        return <span className="status-badge pending" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>🔍 Under Review</span>;
      default:
        return <span className="status-badge pending">⏳ Pending Verification</span>;
    }
  };

  return (
    <div className="applicant-dashboard">
      {/* HEADER CARD */}
      <div className="profile-card" style={{ marginBottom: 24 }}>
        <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
          {user?.name ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('') : 'AP'}
        </div>
        <div className="profile-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>Welcome, {user?.name || 'Applicant'}</h2>
            <span className="status-badge approved" style={{ fontSize: 11 }}>Citizen Applicant</span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            Email: {user?.email} · District: Tamil Nadu Resident
          </p>
          <div className="profile-meta" style={{ marginTop: 8 }}>
            <span className="meta-chip">🏛️ Tamil Nadu Welfare Portal</span>
            <span className="meta-chip">🔒 Verified Applicant Identity</span>
            <span className="meta-chip">🤖 AI Forensics v1.0 Ready</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/schemes')}>
            Explore Schemes →
          </button>
        </div>
      </div>

      {error && <div className="alert-red" style={{ marginBottom: 20 }}>{error}</div>}

      {/* QUICK STATS */}
      <div className="grid grid-3" style={{ marginBottom: 24, gap: 16 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Submitted Applications
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {myApplications.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--blue-400)', marginTop: 4 }}>
            Direct benefit scheme applications
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Available Welfare Schemes
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green-500)', marginTop: 4 }}>
            {schemes.length || 6}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Tamil Nadu State Initiatives
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            AI Verification Engine
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green-400)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: 'var(--green-500)', borderRadius: '50%' }}></span>
            Active (CASIA v1)
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            OCR & Document Tampering Detector
          </div>
        </div>
      </div>

      {/* MY APPLICATIONS SECTION */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">My Scheme Applications</div>
            <div className="card-subtitle">Real-time status of your government welfare scheme submissions</div>
          </div>
          <Link to="/schemes" className="btn btn-secondary btn-sm">
            ＋ New Application
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading your applications...
          </div>
        ) : myApplications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              No applications submitted yet
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '8px auto 16px' }}>
              Explore available Tamil Nadu state welfare schemes, check your eligibility, and apply with direct document upload.
            </p>
          <button className="btn btn-primary" onClick={() => navigate('/scheme-directory')}>
              Browse Available Schemes
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Welfare Scheme</th>
                  <th>Submission Date</th>
                  <th>Benefit Amount</th>
                  <th>Application Status</th>
                  <th>AI Forensics</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myApplications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.application_id}</strong>
                    </td>
                    <td>{app.scheme_name}</td>
                    <td>{app.application_date ? new Date(app.application_date).toLocaleDateString('en-IN') : 'Recently'}</td>
                    <td>₹{Number(app.benefit_amount || 0).toLocaleString('en-IN')}</td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      <span className="status-badge approved" style={{ fontSize: 11 }}>
                        🛡️ AI Verified
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/applications/${app.id}/verification`)}
                      >
                        View Verification →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* POPULAR TAMIL NADU SCHEMES */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Featured Tamil Nadu Schemes</div>
            <div className="card-subtitle">Select a scheme to apply with automated AI document verification</div>
          </div>
          <Link to="/schemes" style={{ fontSize: 12, color: 'var(--blue-400)', fontWeight: 600, textDecoration: 'none' }}>
            View All Schemes →
          </Link>
        </div>

        <div className="grid grid-2" style={{ gap: 16, marginTop: 12 }}>
          {schemes.slice(0, 4).map((scheme) => (
            <div
              key={scheme.id}
              style={{
                padding: '16px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                    {scheme.name}
                  </h3>
                  <span className="meta-chip" style={{ fontSize: 10, flexShrink: 0 }}>
                    {scheme.category}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  {scheme.description}
                </p>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  💰 <strong>Benefit:</strong> ₹{Number(scheme.benefit_amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
                onClick={() => navigate(`/apply/${scheme.id}`)}
              >
                Apply for this Scheme →
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
