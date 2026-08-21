import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ConcernBadge, { CONCERN_CONFIG } from '../../components/RiskBadge.jsx';
import ReasonList from '../../components/ReasonList.jsx';
import { SkeletonTable } from '../../components/SkeletonLoader.jsx';
import { usePredictions } from '../../hooks/usePredictions.js';

export default function RiskExplorer() {
  const navigate = useNavigate();
  const [minProb, setMinProb] = useState(0);
  const [maxProb, setMaxProb] = useState(100);
  const [concernFilter, setConcern] = useState('all');
  const [factorFilter, setFactor]   = useState('all');
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);

  const { data: rawPredictions, loading } = usePredictions(concernFilter);

  const filtered = useMemo(() => {
    let data = (rawPredictions || []).map(p => ({
      ...p,
      beneficiary: p.beneficiary || { id: p.beneficiary_id, full_name: `Applicant #${p.beneficiary_id}` },
    }));

    data = data.filter(p => p.leakage_probability >= minProb && p.leakage_probability <= maxProb);
    if (factorFilter !== 'all') data = data.filter(p =>
      p.contributing_factors?.some(f => f.toLowerCase().includes(factorFilter.toLowerCase()))
    );
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.beneficiary?.full_name?.toLowerCase().includes(q) ||
        String(p.beneficiary_id).includes(q) ||
        p.contributing_factors?.some(f => f.toLowerCase().includes(q))
      );
    }

    return data.sort((a, b) => b.leakage_probability - a.leakage_probability);
  }, [rawPredictions, minProb, maxProb, factorFilter, search]);

  const selectedPred = selected ? filtered.find(p => p.beneficiary_id === selected) : null;
  const selectedBen  = selectedPred ? selectedPred.beneficiary : null;

  const counts = useMemo(() => ({
    critical: (rawPredictions || []).filter(p => p.concern_level === 'critical').length,
    high:     (rawPredictions || []).filter(p => p.concern_level === 'high').length,
    moderate: (rawPredictions || []).filter(p => p.concern_level === 'moderate').length,
    low:      (rawPredictions || []).filter(p => p.concern_level === 'low').length,
  }), [rawPredictions]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leakage Probability Explorer</h1>
          <p>AI leakage probability analysis — {filtered.length} applicants matching current filters</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm">📥 Export Flagged</button>
        </div>
      </div>

      {/* 4-Tier Concern Level Summary Chips */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { key:'critical', label:'Critical Concern', count:counts.critical, color:'#DC2626' },
          { key:'high',     label:'High Concern',     count:counts.high,     color:'#EA580C' },
          { key:'moderate', label:'Moderate Concern', count:counts.moderate, color:'#D97706' },
          { key:'low',      label:'Low Concern',      count:counts.low,      color:'#16A34A' },
        ].map(t => (
          <div key={t.key} onClick={() => setConcern(c => c === t.key ? 'all' : t.key)} style={{
            padding:'10px 18px',
            borderRadius:'var(--radius-md)',
            background:`${t.color}18`,
            border:`1px solid ${concernFilter === t.key ? t.color : `${t.color}44`}`,
            cursor:'pointer', transition:'all 0.15s',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background:t.color, display:'inline-block' }} />
            <span style={{ fontSize:13, fontWeight:600, color:t.color }}>{t.label}</span>
            <span style={{ fontSize:22, fontWeight:800, color:t.color }}>{t.count}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
        {/* LEFT: Filters + Results Table */}
        <div>
          {/* Filter Controls */}
          <div className="card" style={{ marginBottom:16, padding:'16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div className="search-input-wrap">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search name, ID, or contributing factor..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <select className="filter-select" value={factorFilter} onChange={e => setFactor(e.target.value)}>
                <option value="all">All Detected Patterns</option>
                <option value="Aadhaar">Duplicate Identity / Aadhaar</option>
                <option value="bank account">Duplicate Payout Account</option>
                <option value="income">Income Eligibility Deviation</option>
                <option value="similarity">Textual Similarity Match</option>
                <option value="scheme">Multi-Scheme Enrollment</option>
                <option value="cluster">Suspicious Cluster Network</option>
              </select>
            </div>
            {/* Probability Range Slider */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>Leakage Probability Range:</span>
              <input type="range" min={0} max={100} value={minProb} onChange={e => setMinProb(Number(e.target.value))} style={{ flex:1 }} />
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-accent)', minWidth:32 }}>{minProb}%</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>–</span>
              <input type="range" min={0} max={100} value={maxProb} onChange={e => setMaxProb(Number(e.target.value))} style={{ flex:1 }} />
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-accent)', minWidth:32 }}>{maxProb}%</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding: 20 }}><SkeletonTable rows={8} cols={5} /></div>
            ) : (
              <div style={{ maxHeight:520, overflowY:'auto' }}>
                <table>
                  <thead style={{ position:'sticky', top:0, zIndex:2 }}>
                    <tr>
                      <th>Applicant</th>
                      <th>AI Leakage Probability</th>
                      <th>Concern Level</th>
                      <th>Primary Detected Factor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5}><div className="empty-state" style={{ padding:32 }}>
                        <div className="empty-state-icon">🔍</div><h3>No cases match these filters</h3>
                      </div></td></tr>
                    ) : filtered.map(p => {
                      const prob = p.leakage_probability;
                      const barColor = prob >= 80 ? '#DC2626' : prob >= 60 ? '#EA580C' : prob >= 30 ? '#D97706' : '#16A34A';
                      return (
                        <tr key={p.id}
                          style={{ cursor:'pointer', background: selected === p.beneficiary_id ? 'rgba(30,64,175,0.08)' : undefined }}
                          onClick={() => setSelected(s => s === p.beneficiary_id ? null : p.beneficiary_id)}>
                          <td>
                            <strong style={{ fontSize:13 }}>{p.beneficiary?.full_name}</strong>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>#{p.beneficiary_id}</div>
                          </td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div className="progress-bar-wrap" style={{ width:50 }}>
                                <div className="progress-bar" style={{ width:`${prob}%`, background:barColor }} />
                              </div>
                              <span style={{ fontWeight:800, fontSize:15, color:barColor }}>{prob}%</span>
                            </div>
                          </td>
                          <td><ConcernBadge level={p.concern_level} /></td>
                          <td style={{ fontSize:12, color:'var(--text-secondary)', maxWidth:200 }}>
                            {p.contributing_factors?.[0]?.slice(0,60)}{p.contributing_factors?.[0]?.length > 60 ? '…' : ''}
                          </td>
                          <td>
                            <button className="btn btn-secondary btn-sm" style={{ whiteSpace:'nowrap' }}
                              onClick={e => { e.stopPropagation(); navigate(`/applications/${p.application_id || p.beneficiary_id}`); }}>
                              View Application →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Inspection Panel */}
        <div>
          {selectedPred && selectedBen ? (
            <div style={{ position:'sticky', top:80 }}>
              <div className="card">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700 }}>{selectedBen.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                      #{selectedBen.id} · {selectedBen.gender || 'other'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:32, fontWeight:900, lineHeight:1, color: CONCERN_CONFIG[selectedPred.concern_level]?.color }}>
                      {selectedPred.leakage_probability}%
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>LEAKAGE PROB.</div>
                  </div>
                </div>
                <ConcernBadge level={selectedPred.concern_level} size="lg" />

                <div style={{ height:'1px', background:'var(--border-subtle)', margin:'12px 0' }} />

                {/* Key Fields */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                  {[
                    ['Income', `₹${(selectedBen.declared_income || 0)?.toLocaleString('en-IN')}`],
                    ['Status', selectedBen.status || 'flagged'],
                    ['Phone', selectedBen.phone || '—'],
                    ['Evaluated', selectedPred.predicted_at || 'DB Record'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ padding:'8px 10px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)' }}>
                      <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)', textTransform:'capitalize' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Recommended Action */}
                <div style={{ padding:'10px 12px', background:`${CONCERN_CONFIG[selectedPred.concern_level]?.color}18`, borderRadius:'var(--radius-md)', border:`1px solid ${CONCERN_CONFIG[selectedPred.concern_level]?.color}33`, marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color: CONCERN_CONFIG[selectedPred.concern_level]?.color, marginBottom:4 }}>
                    🛡️ Recommended Officer Action
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--text-primary)' }}>{selectedPred.recommended_action}</div>
                </div>

                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
                  Contributing Factors
                </div>
                <ReasonList factors={selectedPred.contributing_factors} severity={selectedPred.severity} />

                <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:16 }}
                  onClick={() => navigate(`/applications/${selectedPred.application_id || selectedBen.id}`)}>
                  View Application →
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.4 }}>👈</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Select a case</div>
              <div style={{ fontSize:12, marginTop:4 }}>Click any row to see the AI leakage analysis and contributing factors</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
