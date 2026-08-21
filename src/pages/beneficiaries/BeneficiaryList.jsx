import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ConcernBadge from '../../components/RiskBadge.jsx';
import { SkeletonTable } from '../../components/SkeletonLoader.jsx';
import { useBeneficiaries } from '../../hooks/useBeneficiaries.js';
import { useDistricts } from '../../hooks/useDistricts.js';

const PAGE_SIZE = 15;

export default function BeneficiaryList() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [concernFilter, setConcern]     = useState('all');
  const [statusFilter, setStatus]       = useState('all');
  const [districtFilter, setDist]       = useState('all');
  const [sort, setSort]                 = useState({ key: 'leakage_probability', dir: 'desc' });
  const [page, setPage]                 = useState(1);

  const { data: rawList, loading } = useBeneficiaries({
    status: statusFilter,
    district_id: districtFilter !== 'all' ? districtFilter : undefined,
    concern_level: concernFilter !== 'all' ? concernFilter : undefined,
    search: search || undefined,
  });

  const { data: districtList } = useDistricts();

  const filtered = useMemo(() => {
    let data = (rawList || []).map(b => ({
      ...b,
      district_name: districtList.find(d => d.id === b.district_id)?.name || '—',
    }));

    data.sort((a, b) => {
      let av = a[sort.key] ?? 0;
      let bv = b[sort.key] ?? 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [rawList, districtList, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    setPage(1);
  }
  function sortIcon(key) {
    if (sort.key !== key) return ' ↕';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Beneficiary Registry</h1>
          <p>AI leakage probability analysis — {filtered.length} applicant records shown</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm">📥 Export CSV</button>
          <button className="btn btn-primary btn-sm">➕ Add Beneficiary</button>
        </div>
      </div>

      {/* Quick Concern Level Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { key:'all',      label:'All Records',         color:'var(--blue-400)' },
          { key:'critical', label:'🚨 Critical Concern', color:'#DC2626' },
          { key:'high',     label:'⚡ High Concern',     color:'#EA580C' },
          { key:'moderate', label:'⚠️ Moderate Concern', color:'#D97706' },
          { key:'low',      label:'✓ Low Concern',       color:'#16A34A' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setConcern(t.key); setPage(1); }}
            style={{
              padding:'7px 14px',
              borderRadius:'var(--radius-md)',
              border:`1px solid ${concernFilter === t.key ? t.color : 'var(--border-default)'}`,
              background: concernFilter === t.key ? `${t.color}18` : 'var(--bg-card)',
              color: concernFilter === t.key ? t.color : 'var(--text-muted)',
              fontSize:12.5, fontWeight:600, cursor:'pointer',
              transition:'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search name, ID, district..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All Application Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="flagged">Flagged</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="filter-select" value={districtFilter} onChange={e => { setDist(e.target.value); setPage(1); }}>
          <option value="all">All Districts</option>
          {districtList.map(d => <option key={d.id} value={d.id}>{d.name}, {d.state}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}><SkeletonTable rows={10} cols={8} /></div>
        ) : (
          <div className="table-container" style={{ border:'none', borderRadius:0 }}>
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('id')}>ID{sortIcon('id')}</th>
                  <th className="sortable" onClick={() => toggleSort('full_name')}>Applicant Name{sortIcon('full_name')}</th>
                  <th>District</th>
                  <th>Gender</th>
                  <th className="sortable" onClick={() => toggleSort('declared_income')}>Declared Income{sortIcon('declared_income')}</th>
                  <th className="sortable" onClick={() => toggleSort('leakage_probability')}>AI Leakage Probability{sortIcon('leakage_probability')}</th>
                  <th>Concern Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <h3>No beneficiaries found</h3>
                      <p>Try adjusting your search or concern level filter criteria</p>
                    </div>
                  </td></tr>
                ) : paged.map(b => {
                  const prob = b.leakage_probability ?? 0;
                  const barColor = prob >= 80 ? '#DC2626' : prob >= 60 ? '#EA580C' : prob >= 30 ? '#D97706' : '#16A34A';
                  return (
                    <tr key={b.id} style={{ cursor:'pointer' }} onClick={() => navigate(`/beneficiaries/${b.id}`)}>
                      <td><span style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-muted)' }}>#{String(b.id).padStart(4,'0')}</span></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{
                            width:32, height:32, borderRadius:'50%', flexShrink:0,
                            background:`hsl(${(b.id * 47) % 360},50%,35%)`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.9)',
                          }}>
                            {b.full_name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{b.full_name}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>DOB: {b.dob}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:12 }}>{b.district_name}</td>
                      <td style={{ fontSize:12, textTransform:'capitalize' }}>{b.gender}</td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-secondary)' }}>
                          ₹{((b.declared_income || 0) / 100000).toFixed(1)}L
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div className="progress-bar-wrap" style={{ width:50 }}>
                            <div className="progress-bar" style={{ width:`${prob}%`, background:barColor }} />
                          </div>
                          <span style={{ fontWeight:800, fontSize:13, color:barColor }}>{prob}%</span>
                        </div>
                      </td>
                      <td><ConcernBadge level={b.concern_level || (prob >= 80 ? 'critical' : prob >= 60 ? 'high' : prob >= 30 ? 'moderate' : 'low')} /></td>
                      <td>
                        <span className={`status-badge ${b.status}`}>{b.status}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-secondary btn-sm btn-icon" title="View Profile" onClick={() => navigate(`/beneficiaries/${b.id}`)}>👁</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="pagination">
          <div className="pagination-info">
            Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page===1} onClick={() => setPage(p => p-1)}>‹</button>
            {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
              const p = i + 1;
              return <button key={p} className={`page-btn ${page===p?'active':''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            {totalPages > 7 && <button className="page-btn" disabled>…</button>}
            <button className="page-btn" disabled={page===totalPages} onClick={() => setPage(p => p+1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
