import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api.js';

const CATEGORY_COLORS = {
  'Agriculture': '#16A34A', 'Housing': '#2563EB', 'Healthcare': '#DC2626',
  'Social Security': '#7C3AED', 'Education': '#D97706', 'Employment': '#0891B2',
  'Financial Inclusion': '#0D9488', 'Energy': '#EA580C',
};

export default function SchemeList() {
  const [search, setSearch] = useState('');
  const [catFilter, setCat] = useState('all');
  const [selected, setSelected] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [schemesRes, appsRes, bensRes] = await Promise.all([
          api.get('/api/v1/schemes').catch(() => []),
          api.get('/api/v1/applications').catch(() => []),
          api.get('/api/v1/beneficiaries?limit=500').catch(() => []),
        ]);
        setSchemes(Array.isArray(schemesRes) ? schemesRes : []);
        setApplications(Array.isArray(appsRes) ? (appsRes.items || appsRes) : []);
        setBeneficiaries(Array.isArray(bensRes) ? (bensRes.items || bensRes) : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = useMemo(() => [...new Set(schemes.map(s => s.category))], [schemes]);

  const filtered = schemes.filter(s =>
    (catFilter === 'all' || s.category === catFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || (s.description || '').toLowerCase().includes(search.toLowerCase()))
  );

  const selectedScheme = selected ? schemes.find(s => s.id === selected) : null;
  const schemeApps = selectedScheme ? applications.filter(a => String(a.scheme_id) === String(selectedScheme.id)) : [];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading schemes...</div>;
  if (error) return <div className="alert-red">Failed to load schemes: {error}</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Scheme Registry</h1>
          <p>Government welfare schemes with eligibility criteria and fraud statistics</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm">➕ New Scheme</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search schemes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={catFilter} onChange={e => setCat(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:20 }}>
        {/* Scheme Cards Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16, alignContent:'start' }}>
          {filtered.map(scheme => {
            const color = CATEGORY_COLORS[scheme.category] || '#3B82F6';
            const fraudRate = Math.round((scheme.flagged_count / scheme.beneficiary_count) * 100);
            return (
              <div key={scheme.id}
                className="card"
                style={{ cursor:'pointer', borderColor: selected === scheme.id ? 'var(--border-blue)' : undefined, transition:'all 0.2s' }}
                onClick={() => setSelected(s => s === scheme.id ? null : scheme.id)}>
                {/* Top stripe */}
                <div style={{ height:4, background:color, borderRadius:'4px 4px 0 0', margin:'-20px -20px 16px' }} />

                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.8px', background:`${color}18`, padding:'2px 8px', borderRadius:'var(--radius-full)' }}>
                      {scheme.category}
                    </span>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginTop:8, lineHeight:1.3 }}>{scheme.name}</h3>
                  </div>
                  <div style={{ fontSize:24, flexShrink:0 }}>
                    {scheme.category === 'Agriculture' ? '🌾' : scheme.category === 'Housing' ? '🏠' : scheme.category === 'Healthcare' ? '🏥' : scheme.category === 'Education' ? '📚' : scheme.category === 'Employment' ? '💼' : '🛡️'}
                  </div>
                </div>

                <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:8, lineHeight:1.5, marginBottom:14 }}>
                  {scheme.description.slice(0, 100)}{scheme.description.length > 100 ? '…' : ''}
                </p>

                {/* Stats Row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div style={{ textAlign:'center', padding:'8px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)' }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>{scheme.beneficiary_count}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Beneficiaries</div>
                  </div>
                  <div style={{ textAlign:'center', padding:'8px', background:'rgba(220,38,38,0.08)', borderRadius:'var(--radius-md)', border:'1px solid rgba(220,38,38,0.15)' }}>
                    <div style={{ fontSize:16, fontWeight:800, color:'var(--red-500)' }}>{scheme.flagged_count}</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Flagged</div>
                  </div>
                  <div style={{ textAlign:'center', padding:'8px', background: fraudRate > 20 ? 'rgba(220,38,38,0.08)' : fraudRate > 10 ? 'rgba(217,119,6,0.08)' : 'rgba(22,163,74,0.08)', borderRadius:'var(--radius-md)', border:`1px solid ${fraudRate > 20 ? 'rgba(220,38,38,0.2)' : fraudRate > 10 ? 'rgba(217,119,6,0.2)' : 'rgba(22,163,74,0.2)'}` }}>
                    <div style={{ fontSize:16, fontWeight:800, color: fraudRate > 20 ? 'var(--red-500)' : fraudRate > 10 ? 'var(--amber-500)' : 'var(--green-500)' }}>{fraudRate}%</div>
                    <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Fraud Rate</div>
                  </div>
                </div>

                {/* Benefit Amount */}
                <div style={{ marginTop:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>Benefit Amount</span>
                  <span style={{ fontSize:14, fontWeight:700, color:color }}>
                    ₹{scheme.benefit_amount?.toLocaleString('en-IN')}
                    {scheme.benefit_amount < 5000 ? '/month' : scheme.benefit_amount < 50000 ? '/year' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selectedScheme && (
          <div style={{ position:'sticky', top:80, maxHeight:'80vh', overflowY:'auto' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">{selectedScheme.name}</div>
                <button style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }} onClick={() => setSelected(null)}>×</button>
              </div>

              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:16 }}>{selectedScheme.description}</p>

              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Eligibility Criteria</div>
              <div style={{ display:'grid', gap:6, marginBottom:20 }}>
                {Object.entries(selectedScheme.eligibility).map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'8px 10px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)' }}>
                    <span style={{ color:'var(--text-muted)', textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                    <span style={{ fontWeight:600, color:'var(--text-primary)' }}>
                      {typeof v === 'boolean' ? (v ? '✓ Required' : '✗ Not required') : typeof v === 'number' ? (k.includes('income') ? `₹${v.toLocaleString('en-IN')}` : v) : Array.isArray(v) ? v.join(', ') : String(v)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Applications ({schemeApps.length})</div>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {schemeApps.slice(0, 10).map(a => {
                  const b = beneficiaries.find(x => x.id === a.beneficiary_id);
                  return (
                    <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border-subtle)', fontSize:12 }}>
                      <span style={{ color:'var(--text-secondary)' }}>{b?.full_name}</span>
                      <span className={`status-badge ${a.status === 'under_review' ? 'pending' : a.status}`} style={{ fontSize:10 }}>{a.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
