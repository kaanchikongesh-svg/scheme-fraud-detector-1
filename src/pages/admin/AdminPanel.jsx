import { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import { useAuditLogs } from '../../hooks/useAuditLogs.js';
import { useDistricts } from '../../hooks/useDistricts.js';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const { data: logs } = useAuditLogs();
  const { data: districts } = useDistricts();
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'verifying_officer',
    district_id: 1,
  });

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.get('/api/v1/admin/users');
        setUsers(Array.isArray(res) ? res : []);
      } catch {
        setUsers([]);
      }
    }
    loadUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const created = await api.post('/api/v1/admin/users', newUser);
      if (created && created.id) {
        setUsers(prev => [...prev, created]);
      }
      setShowAddUser(false);
      setNewUser({ name: '', email: '', role: 'verifying_officer', district_id: 1 });
    } catch {
      // handle error
    }
  };

  const filteredLogs = (logs || []).filter(l => {
    const matchSearch = l.action.toLowerCase().includes(searchLog.toLowerCase()) ||
      JSON.stringify(l.details).toLowerCase().includes(searchLog.toLowerCase());
    const matchAction = filterAction === 'all' || l.action === filterAction;
    return matchSearch && matchAction;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>System Administration & Security</h1>
          <p>Role-based access control, audit logs, and AI parameter management</p>
        </div>
        <div className="page-header-actions">
          {activeTab === 'users' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(true)}>
              ➕ Provision Officer Account
            </button>
          )}
          <button className="btn btn-secondary btn-sm">🔒 Security Report</button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="tabs" style={{ marginBottom: 20, maxWidth: 450 }}>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Access ({users.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📜 Audit Trails ({logs ? logs.length : 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ AI Model Config
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {showAddUser && (
            <div className="card" style={{ border: '1px solid var(--border-blue)', background: 'var(--bg-elevated)' }}>
              <div className="card-header">
                <div className="card-title">Provision New Officer / System Account</div>
                <button 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
                  onClick={() => setShowAddUser(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    required 
                    placeholder="e.g. Ramesh Varma"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Government Email</label>
                  <input 
                    className="form-input" 
                    type="email" 
                    required 
                    placeholder="e.g. ramesh@gov.in"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Assigned Role</label>
                  <select 
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="admin">System Admin</option>
                    <option value="district_officer">District Officer</option>
                    <option value="verifying_officer">Verifying Officer</option>
                    <option value="citizen">Citizen Representative</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Jurisdiction District</label>
                  <select 
                    className="form-select"
                    value={newUser.district_id}
                    onChange={(e) => setNewUser({ ...newUser, district_id: e.target.value })}
                  >
                     {districts && districts.map(d => (
                       <option key={d.id} value={d.id}>{d.name} ({d.state || 'Tamil Nadu'})</option>
                     ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddUser(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Save & Send Credentials</button>
                </div>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Officer Name</th>
                    <th>Email Address</th>
                    <th>Assigned Role</th>
                    <th>District Access</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const dist = districts && districts.find(d => d.id === u.district_id);
                    return (
                      <tr key={u.id}>
                        <td><span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#USR-0{u.id}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                              {u.avatar || 'U'}
                            </div>
                            <strong>{u.name}</strong>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-full)',
                            background: u.role === 'admin' ? 'rgba(220,38,38,0.15)' : u.role === 'district_officer' ? 'rgba(37,99,235,0.15)' : 'rgba(22,163,74,0.15)',
                            color: u.role === 'admin' ? 'var(--red-400)' : u.role === 'district_officer' ? 'var(--blue-400)' : 'var(--green-500)',
                            textTransform: 'capitalize'
                          }}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {dist ? `${dist.name} (${dist.state})` : 'All Jurisdictions (Global)'}
                        </td>
                        <td>
                          <span className="status-badge approved">Active</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="filter-bar" style={{ margin: 0 }}>
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search audit actions, notes..." 
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
              />
            </div>
            <select 
              className="filter-select" 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="APPROVE_APPLICATION">APPROVE_APPLICATION</option>
              <option value="REJECT_APPLICATION">REJECT_APPLICATION</option>
              <option value="FLAG_BENEFICIARY">FLAG_BENEFICIARY</option>
              <option value="VIEW_PREDICTION">VIEW_PREDICTION</option>
              <option value="FILE_COMPLAINT">FILE_COMPLAINT</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Action</th>
                    <th>Target Entity</th>
                    <th>Actor ID</th>
                    <th>Details & Notes</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(l => (
                    <tr key={l.id}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#LOG-{l.id}</span></td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: l.action.includes('FLAG') ? 'rgba(81, 12, 12, 0.15)' : l.action.includes('REJECT') ? 'rgba(217,119,6,0.15)' : 'rgba(37,99,235,0.15)',
                          color: l.action.includes('FLAG') ? 'var(--red-400)' : l.action.includes('REJECT') ? 'var(--amber-400)' : 'var(--blue-400)',
                        }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize', fontSize: 12 }}>
                        {l.entity_type} #{l.entity_id}
                      </td>
                      <td style={{ fontSize: 12 }}>Officer #{l.user_id}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {l.details?.note || JSON.stringify(l.details)}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {new Date(l.created_at).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIG */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>⚖️ Risk Weight Matrix</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Adjust module point contributions for composite scoring:
            </p>
            {[
              { name: 'Duplicate Aadhaar Hash Match', defaultWeight: 40 },
              { name: 'Duplicate Bank Account Hash Match', defaultWeight: 30 },
              { name: 'Identity Fuzzy String Match (Levenshtein)', defaultWeight: 20 },
              { name: 'Network Ring / Shared Contact Cluster', defaultWeight: 20 },
              { name: 'Income Eligibility Threshold Deviation', defaultWeight: 15 },
              { name: 'Conflicting Multi-Scheme Enrolment', defaultWeight: 10 },
            ].map(w => (
              <div key={w.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{w.name}</span>
                  <strong style={{ color: 'var(--blue-400)' }}>{w.defaultWeight} pts</strong>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar" style={{ width: `${(w.defaultWeight / 50) * 100}%`, background: 'var(--blue-600)' }} />
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
              💾 Update Weight Parameters
            </button>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>🛡️ Security & Privacy Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Salted Aadhaar Hashing</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SHA-256 + HMAC key rotation</div>
                </div>
                <span className="status-badge approved">Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Zero Raw PII Storage Policy</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Strict masking enforced across views</div>
                </div>
                <span className="status-badge approved">Compliant</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Automatic Audit Trail</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Immutable ledger logging on actions</div>
                </div>
                <span className="status-badge approved">Enabled</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Rate Limiting on Auth</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>10 req / min per IP address</div>
                </div>
                <span className="status-badge approved">Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
