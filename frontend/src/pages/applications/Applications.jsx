import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplications } from '../../hooks/useApplications.js';
import { useDistricts } from '../../hooks/useDistricts.js';
import { useSchemes } from '../../hooks/useSchemes.js';
import ConcernBadge from '../../components/RiskBadge.jsx';
import { SkeletonTable } from '../../components/SkeletonLoader.jsx';

const statuses = ['all', 'pending', 'under_review', 'approved', 'rejected', 'flagged'];
const statusLabels = { all: 'All', pending: 'Pending', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected', flagged: 'Verification Required' };

function displayDate(value) { return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

export default function Applications({ citizenMode = false }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', schemeId: 'all', districtId: 'all', status: 'all', aiAnalysis: 'all', appliedDate: '', concernLevel: 'all' });
  const { data, total, loading, error, isFallback, refetch } = useApplications(filters);
  const { data: districts } = useDistricts();
  const { data: schemes } = useSchemes();
  const update = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  const clearFilters = () => setFilters({ search: '', schemeId: 'all', districtId: 'all', status: 'all', aiAnalysis: 'all', appliedDate: '', concernLevel: 'all' });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>{citizenMode ? 'My Applications' : 'Scheme Applications'}</h1><p>{citizenMode ? 'Track submitted applications and their review status.' : 'Review, verify and monitor government scheme applications.'}</p></div>
        <div className="page-header-actions"><button className="btn btn-secondary btn-sm" onClick={refetch}>↻ Refresh</button></div>
      </div>
      <div className={`alert-${isFallback ? 'red' : 'green'}`} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <span>{isFallback ? '🔴 Backend unavailable · Live data cannot be displayed' : '🟢 Backend Connected · Live development records'}</span>
        {isFallback && <button className="btn btn-secondary btn-sm" onClick={refetch}>Retry Connection</button>}
      </div>
      {error && isFallback && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>Connection detail: {error}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <div className="search-input-wrap" style={{ flex: 1, minWidth: 280 }}><span className="search-icon">🔍</span><input value={filters.search} onChange={event => update('search', event.target.value)} placeholder="Search by Application ID, Beneficiary Name, Mobile Number..." /></div>
          <select className="filter-select" value={filters.schemeId} onChange={event => update('schemeId', event.target.value)}><option value="all">All Schemes</option>{schemes.map(scheme => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}</select>
          <select className="filter-select" value={filters.districtId} onChange={event => update('districtId', event.target.value)}><option value="all">All Districts</option>{districts.map(district => <option key={district.id} value={district.id}>{district.name}</option>)}</select>
          <select className="filter-select" value={filters.status} onChange={event => update('status', event.target.value)}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
          <select className="filter-select" value={filters.aiAnalysis} onChange={event => update('aiAnalysis', event.target.value)}><option value="all">All AI Analysis</option><option value="clear">Clear</option><option value="flagged">Flagged</option><option value="critical">Critical</option></select>
          <input className="form-input" type="date" value={filters.appliedDate} onChange={event => update('appliedDate', event.target.value)} aria-label="Application date" />
          <select className="filter-select" value={filters.concernLevel} onChange={event => update('concernLevel', event.target.value)}><option value="all">All Concern Levels</option><option value="low">Low Concern</option><option value="moderate">Moderate Concern</option><option value="high">High Concern</option><option value="critical">Critical Concern</option></select>
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '16px 20px' }}><div><div className="card-title">Submitted Applications</div><div className="card-subtitle">{total} records match the current review filters</div></div><span className="status-badge pending">Advisory AI review only</span></div>
        {loading ? <div style={{ padding: 20 }}><SkeletonTable rows={8} cols={10} /></div> : <div className="table-container" style={{ border: 'none', borderRadius: 0 }}><table><thead><tr><th>Application ID</th><th>Beneficiary</th><th>Scheme</th><th>District</th><th>Applied Date</th><th>Eligibility</th><th>Application Status</th><th>AI Leakage Probability</th><th>Concern Level</th><th>Action</th></tr></thead><tbody>{data.length === 0 ? <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">📋</div><h3>No applications found</h3><p>Adjust the search or filters and try again.</p></div></td></tr> : data.map(application => <tr key={application.application_id}><td><span style={{ fontFamily: 'monospace', color: 'var(--blue-400)' }}>{application.application_id}</span></td><td><strong>{application.beneficiary_name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Beneficiary #{application.beneficiary_id}</div></td><td style={{ fontSize: 12 }}>{application.scheme_name}</td><td style={{ fontSize: 12 }}>{application.district}</td><td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{displayDate(application.application_date)}</td><td><span className={`status-badge ${application.eligibility_status === 'eligible' ? 'approved' : 'pending'}`}>{application.eligibility_status === 'eligible' ? 'Eligible' : 'Needs Review'}</span></td><td><span className={`status-badge ${application.status === 'approved' ? 'approved' : application.status === 'rejected' ? 'rejected' : application.status === 'under_review' || application.status === 'flagged' ? 'flagged' : 'pending'}`}>{statusLabels[application.status] || application.status}</span></td><td><strong style={{ color: application.leakage_probability >= 80 ? 'var(--red-500)' : application.leakage_probability >= 60 ? 'var(--orange-500)' : 'var(--green-500)' }}>{Math.round(application.leakage_probability || 0)}%</strong></td><td><ConcernBadge level={application.concern_level} /></td><td><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/applications/${application.application_id}`)}>View</button></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}
