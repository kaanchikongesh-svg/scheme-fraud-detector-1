import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComplaints } from '../../hooks/useComplaints.js';

export default function ComplaintPortal() {
  const navigate = useNavigate();
  const { data: complaintList, loading, error, isFallback, fileComplaint, updateComplaintStatus: updateStatus } = useComplaints();
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    beneficiary_id: '',
    complaint_type: 'duplicate_application',
    description: '',
    evidence_notes: '',
  });
  const [submittedMessage, setSubmittedMessage] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredComplaints = (complaintList || []).filter(c => 
    filterStatus === 'all' || c.status === filterStatus
  );

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await fileComplaint({
        beneficiary_id: Number(formData.beneficiary_id) || 1,
        complaint_type: formData.complaint_type,
        description: formData.description,
        evidence_urls: formData.evidence_notes ? [formData.evidence_notes] : [],
      });
      setSubmittedMessage(true);
      setFormData({ beneficiary_id: '', complaint_type: 'duplicate_application', description: '', evidence_notes: '' });
      setTimeout(() => {
        setSubmittedMessage(false);
        setActiveTab('list');
      }, 2000);
    } catch {
      // error handled by hook
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading complaints...</div>;
  if (error && isFallback) return <div className="alert-red">Backend unavailable. Cannot load complaints.</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Citizen Grievance & Complaint Portal</h1>
          <p>Report welfare leakage, ghost beneficiaries, and track investigation statuses</p>
        </div>
        <div className="page-header-actions">
          <button 
            className={`btn ${activeTab === 'file' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('file')}
          >
            ✍️ File New Complaint
          </button>
          <button 
            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('list')}
          >
            📋 View All Reports ({complaintList.length})
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20, maxWidth: 360 }}>
        <button 
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          🔍 Track Cases ({complaintList.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
          onClick={() => setActiveTab('file')}
        >
          📢 File Leakage Report
        </button>
      </div>

      {activeTab === 'file' && (
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Submit a Fraud / Leakage Report</div>
              <div className="card-subtitle">Your identity is protected under the Whistleblower Protection Protocol</div>
            </div>
            <span style={{ fontSize: 24 }}>🛡️</span>
          </div>

          {submittedMessage && (
            <div className="alert-green" style={{ marginBottom: 16, background: 'rgba(22,163,74,0.15)', border: '1px solid var(--green-500)', padding: 12, borderRadius: 'var(--radius-md)', color: 'var(--green-500)' }}>
              ✅ Complaint submitted successfully! Grievance tracking ID generated. Switching to tracker...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Beneficiary ID or Name (If known)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 43 or Suresh Gupta"
                value={formData.beneficiary_id}
                onChange={(e) => setFormData({ ...formData, beneficiary_id: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Complaint Category</label>
              <select
                className="form-select"
                value={formData.complaint_type}
                onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
              >
                <option value="duplicate_application">Duplicate / Multiple Identity Application</option>
                <option value="fake_beneficiary">Ghost / Ineligible Beneficiary</option>
                <option value="income_falsification">Income / Asset Concealment</option>
                <option value="fraud_ring">Organized Middleman / Fraud Ring</option>
                <option value="officer_collusion">Bribery / Officer Collusion</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description of Suspicion</label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Please describe specific addresses, repeated names, or discrepancy details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Supporting Evidence / Document URL (Optional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="Links to scan copies, photo proof, or notes"
                value={formData.evidence_notes}
                onChange={(e) => setFormData({ ...formData, evidence_notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('list')}>Cancel</button>
              <button type="submit" className="btn btn-primary">🚀 Submit Grievance</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="filter-bar" style={{ margin: 0 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status Filter:</span>
            {['all', 'open', 'investigating', 'resolved'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${filterStatus === st ? 'var(--blue-500)' : 'var(--border-default)'}`,
                  background: filterStatus === st ? 'rgba(37,99,235,0.2)' : 'var(--bg-card)',
                  color: filterStatus === st ? 'var(--blue-400)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Grievance ID</th>
                    <th>Reported Target</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Filed Date</th>
                    <th>Status</th>
                    <th>Officer Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📢</div>
                          <h3>No complaints in this category</h3>
                          <p>All citizen grievances have been reviewed or none match the filter.</p>
                        </div>
                      </td>
                    </tr>
                   ) : (
                     filteredComplaints.map(c => {
                       const linkedApplication = c.application_id;
                       return (
                         <tr key={c.id}>
                           <td>
                             <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-400)' }}>
                               #GRV-{String(c.id).padStart(4, '0')}
                             </span>
                           </td>
                           <td>
                             <strong>Beneficiary #{c.beneficiary_id}</strong>
                           </td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--text-secondary)',
                              textTransform: 'capitalize'
                            }}>
                              {c.complaint_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ maxWidth: 280, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                            {c.description}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.created_at}</td>
                          <td>
                            <span className={`status-badge ${c.status === 'investigating' ? 'pending' : c.status === 'open' ? 'flagged' : 'approved'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {c.status === 'open' && (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => updateStatus(c.id, 'investigating')}
                                  title="Mark as Investigating"
                                >
                                  🔎 Investigate
                                </button>
                              )}
                              {c.status === 'investigating' && (
                                <button 
                                  className="btn btn-success btn-sm"
                                  onClick={() => updateStatus(c.id, 'resolved')}
                                  title="Mark as Resolved"
                                >
                                  ✓ Resolve
                                </button>
                              )}
                              {c.status === 'resolved' && (
                                <span style={{ fontSize: 11, color: 'var(--green-500)', fontWeight: 600 }}>Resolved</span>
                              )}
                              {linkedApplication && (
                                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/applications/${typeof linkedApplication === 'string' ? linkedApplication : `APP-2026-${String(linkedApplication).padStart(6, '0')}`}`)}>View Application</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
