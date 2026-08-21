import { NavLink } from 'react-router-dom';

const navConfig = {
  admin: [
    { section: 'Dashboard & Core', items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
      { to: '/applications', label: 'Applications', icon: '🗂️' },
    ]},
    { section: 'AI Verification & Fraud', items: [
      { to: '/ai/document-verifier', label: 'Verification', icon: '✅' },
      { to: '/ai/network-graph', label: 'Duplicate Detection', icon: '🔄' },
      { to: '/ai/risk-explorer', label: 'Fraud Detection', icon: '⚠️' },
      { to: '/ai/document-testing', label: 'Documents', icon: '📄' },
    ]},
    { section: 'Analytics & Management', items: [
      { to: '/analytics', label: 'Reports', icon: '📈' },
      { to: '/complaints', label: 'Complaints', icon: '📢', badge: '4' },
      { to: '/admin/controls', label: 'Admin Profile', icon: '👤' },
    ]},
  ],
  district_officer: [
    { section: 'Overview', items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    ]},
    { section: 'Beneficiaries', items: [
      { to: '/beneficiaries', label: 'All Beneficiaries', icon: '👥' },
      { to: '/schemes', label: 'Schemes', icon: '📋' },
    ]},
    { section: 'AI & Detection', items: [
      { to: '/ai/risk-explorer', label: 'Leakage Explorer', icon: '🔍' },
      { to: '/ai/network-graph', label: 'Network Graph', icon: '🕸️' },
      { to: '/ai/document-verifier', label: 'Document Testing Lab', icon: '🔬' },
      { to: '/geomap', label: 'District Heatmap', icon: '🗺️' },
    ]},
    { section: 'Reports', items: [
      { to: '/analytics', label: 'Analytics', icon: '📈' },
      { to: '/complaints', label: 'Complaints', icon: '📢' },
    ]},
  ],
  verifying_officer: [
    { section: 'Overview', items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    ]},
    { section: 'Work Queue', items: [
      { to: '/beneficiaries', label: 'Beneficiaries', icon: '👥' },
      { to: '/applications', label: 'Applications', icon: '🗂️' },
      { to: '/ai/risk-explorer', label: 'Leakage Explorer', icon: '🔍' },
      { to: '/ai/document-verifier', label: 'Document Testing Lab', icon: '🔬' },
    ]},
  ],
  citizen: [
    { section: 'Applicant Portal', items: [
      { to: '/applicant-dashboard', label: 'Applicant Dashboard', icon: '🏛️' },
      { to: '/scheme-directory', label: 'Welfare Schemes', icon: '📋' },
      { to: '/my-applications', label: 'My Applications', icon: '🗂️' },
      { to: '/ai/document-verifier', label: 'AI Document Verifier', icon: '🔬' },
      { to: '/complaints', label: 'Grievance & Complaints', icon: '📢' },
    ]},
  ],

};

export default function Sidebar({ user, onLogout }) {
  const role = user?.role || 'admin';
  const sections = navConfig[role] || navConfig.admin;

  const initials = user?.name?.split(' ').slice(0,2).map(w => w[0]).join('') || 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="GovKavach AI Logo" style={{ width: 34, height: 34, filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.4))' }} />
        <div className="sidebar-logo-text">
          <h1>GovKavach AI</h1>
          <span>Scheme Integrity</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="sidebar-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={onLogout} title="Click to logout">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">{role?.replace(/_/g, ' ')}</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>↩</span>
        </div>
      </div>
    </aside>
  );
}
