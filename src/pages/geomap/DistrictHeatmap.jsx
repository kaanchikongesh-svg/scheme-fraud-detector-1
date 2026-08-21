import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api.js';

function lerp(a, b, t) { return a + (b - a) * t; }
function riskColor(pct) {
  if (pct >= 28) return `hsl(0, ${lerp(60,90,(pct-28)/12)}%, ${lerp(35,28,(pct-28)/12)}%)`;
  if (pct >= 15) return `hsl(${lerp(38,20,(pct-15)/13)}°, 80%, 35%)`;
  return `hsl(${lerp(145,95,(pct-0)/15)}°, 60%, 28%)`;
}

export default function DistrictHeatmap() {
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState('risk_pct');
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get('/api/v1/districts');
        setDistricts(Array.isArray(res) ? res : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const districtData = useMemo(() => districts.map(d => ({
    district: d.name,
    state: d.state,
    total: d.total || 0,
    flagged: d.flagged || 0,
    risk_pct: d.total ? Math.round((d.flagged / d.total) * 100) : 0,
  })), [districts]);

  const sorted = [...districtData].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxRisk = Math.max(...districtData.map(d => d.risk_pct), 1);
  const selectedData = selected ? districtData.find(d => d.district === selected) : null;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading district data...</div>;
  if (error) return <div className="alert-red">Failed to load districts: {error}</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>District Fraud Heatmap</h1>
          <p>Geographic distribution of leakage risk across 20 districts</p>
        </div>
        <div className="page-header-actions">
          <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="risk_pct">Sort by Risk %</option>
            <option value="flagged">Sort by Flagged Count</option>
            <option value="total">Sort by Total</option>
          </select>
        </div>
      </div>

      {/* Risk legend */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>Risk Intensity:</span>
        {[
          { label:'< 10% Low',   bg:'hsl(145,60%,28%)' },
          { label:'10–20% Med',  bg:'hsl(38,80%,35%)' },
          { label:'20–28% High', bg:'hsl(20,80%,30%)' },
          { label:'> 28% Critical', bg:'hsl(0,90%,28%)' },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-secondary)' }}>
            <div style={{ width:14, height:14, borderRadius:3, background:l.bg }} />
            {l.label}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>
        {/* Heatmap Grid */}
        <div>
          <div className="heatmap-grid" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
            {sorted.map(d => {
              const bg = riskColor(d.risk_pct);
              const isSelected = selected === d.district;
              return (
                <div key={d.district}
                  className="heatmap-cell"
                  style={{
                    background: bg,
                    border:`1px solid ${isSelected ? 'white' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isSelected ? '0 0 0 2px white' : undefined,
                    transform: isSelected ? 'scale(1.06)' : undefined,
                    zIndex: isSelected ? 2 : undefined,
                  }}
                  onClick={() => setSelected(s => s === d.district ? null : d.district)}>
                  <div className="heatmap-cell-val" style={{ fontSize:20, color:'rgba(255,255,255,0.95)', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
                    {d.risk_pct}%
                  </div>
                  <div className="heatmap-cell-name" style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:4, lineHeight:1.2 }}>
                    {d.district}
                  </div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', marginTop:2 }}>{d.state}</div>
                </div>
              );
            })}
          </div>

          {/* Bar visualization below */}
          <div className="card" style={{ marginTop:20, padding:'20px' }}>
            <div className="card-title" style={{ marginBottom:14 }}>Risk Ranking — All Districts</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sorted.map((d, i) => (
                <div key={d.district} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setSelected(s => s === d.district ? null : d.district)}>
                  <span style={{ fontSize:11, color:'var(--text-muted)', width:16, textAlign:'right' }}>{i+1}</span>
                  <span style={{ fontSize:12, color:'var(--text-secondary)', width:100, flexShrink:0 }}>{d.district}</span>
                  <div style={{ flex:1, height:20, background:'var(--bg-elevated)', borderRadius:'var(--radius-full)', overflow:'hidden', position:'relative' }}>
                    <div style={{
                      width:`${(d.risk_pct/maxRisk)*100}%`, height:'100%',
                      background: riskColor(d.risk_pct),
                      borderRadius:'var(--radius-full)',
                      transition:'width 0.8s ease',
                    }} />
                    <span style={{ position:'absolute', right:8, top:2, fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,0.8)' }}>
                      {d.flagged} flagged
                    </span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:riskColor(d.risk_pct), width:36, textAlign:'right' }}>{d.risk_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {selectedData ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">📍 {selectedData.district}</div>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{selectedData.state}</span>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:48, fontWeight:800, color:riskColor(selectedData.risk_pct), lineHeight:1 }}>
                  {selectedData.risk_pct}%
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Fraud Risk Index</div>
              </div>
              <div className="progress-bar-wrap" style={{ height:8, marginBottom:16 }}>
                <div className="progress-bar" style={{ width:`${(selectedData.risk_pct/maxRisk)*100}%`, background:riskColor(selectedData.risk_pct) }} />
              </div>
              {[
                ['Total Beneficiaries', selectedData.total, 'var(--text-primary)'],
                ['Flagged Cases',       selectedData.flagged, 'var(--red-500)'],
                ['Clean Cases',        selectedData.total - selectedData.flagged, 'var(--green-500)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-subtle)', fontSize:13 }}>
                  <span style={{ color:'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight:700, color:c }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign:'center', padding:32 }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.4 }}>🗺️</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Click a district</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Select any cell in the heatmap to view district stats</div>
            </div>
          )}

          {/* Top 5 */}
          <div className="card">
            <div className="card-title" style={{ marginBottom:12 }}>⚠️ Highest Risk Districts</div>
            {districtData.sort((a,b)=>b.risk_pct-a.risk_pct).slice(0,5).map((d, i) => (
              <div key={d.district} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                <span style={{ fontSize:14, fontWeight:800, color:riskColor(d.risk_pct), width:24 }}>#{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{d.district}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{d.state} · {d.flagged} flagged</div>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:riskColor(d.risk_pct) }}>{d.risk_pct}%</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card">
            <div className="card-title" style={{ marginBottom:12 }}>📊 Overall Summary</div>
            {[
              ['Total Districts', districtData.length],
              ['Total Beneficiaries', districtData.reduce((s,d)=>s+d.total,0)],
              ['Total Flagged', districtData.reduce((s,d)=>s+d.flagged,0)],
              ['Avg Risk Rate', `${districtData.length ? Math.round(districtData.reduce((s,d)=>s+d.risk_pct,0)/districtData.length) : 0}%`],
            ].map(([l, v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border-subtle)', fontSize:12 }}>
                <span style={{ color:'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight:700, color:'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
