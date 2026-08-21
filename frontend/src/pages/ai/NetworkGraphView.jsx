import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetworkGraph } from '../../hooks/useNetworkGraph.js';
import { useBeneficiaries } from '../../hooks/useBeneficiaries.js';

// SVG simulation
function ForceGraph({ nodes = [], links = [], onNodeClick, selectedId }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [hovered, setHovered] = useState(null);
  const W = 800, H = 480;

  // Initialize positions
  useEffect(() => {
    if (!nodes.length) return;
    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const group = n.group;
      const r = group === 'ring' || group === 'suspicious_cluster' ? 130 : 180;
      const cx = W / 2;
      const cy = H / 2;
      pos[n.id] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    setPositions(pos);
  }, [nodes]);

  // Spring simulation
  useEffect(() => {
    if (Object.keys(positions).length === 0) return;
    let animPos = { ...positions };
    let running = true;
    let frame;

    const step = () => {
      if (!running) return;
      const next = { ...animPos };

      // Repulsion
      for (const a of nodes) {
        if (!animPos[a.id]) continue;
        for (const b of nodes) {
          if (a.id === b.id || !animPos[b.id]) continue;
          const dx = animPos[a.id].x - animPos[b.id].x;
          const dy = animPos[a.id].y - animPos[b.id].y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const force = 1800 / (dist * dist);
          next[a.id] = { x: next[a.id].x + dx/dist * force * 0.08, y: next[a.id].y + dy/dist * force * 0.08 };
        }
      }
      // Spring attraction
      for (const l of links) {
        const a = animPos[l.source], b = animPos[l.target];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const ideal = 100, force = (dist - ideal) * 0.04;
        const fx = dx/dist * force, fy = dy/dist * force;
        next[l.source] = { x: next[l.source].x + fx, y: next[l.source].y + fy };
        next[l.target] = { x: next[l.target].x - fx, y: next[l.target].y - fy };
      }
      // Center gravity
      for (const n of nodes) {
        if (!next[n.id]) continue;
        next[n.id] = {
          x: Math.max(40, Math.min(W-40, next[n.id].x + (W/2 - next[n.id].x) * 0.003)),
          y: Math.max(40, Math.min(H-40, next[n.id].y + (H/2 - next[n.id].y) * 0.003)),
        };
      }

      animPos = next;
      setPositions({ ...next });
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    const stopAfter = setTimeout(() => { running = false; cancelAnimationFrame(frame); }, 2500);
    return () => { running = false; cancelAnimationFrame(frame); clearTimeout(stopAfter); };
  }, [nodes, links]);

  function startDrag(nodeId, e) {
    e.preventDefault();
    const svg = svgRef.current.getBoundingClientRect();
    const onMove = (ev) => {
      const cx = (ev.clientX - svg.left), cy = (ev.clientY - svg.top);
      setPositions(p => ({ ...p, [nodeId]: { x: Math.max(20, Math.min(W-20, cx)), y: Math.max(20, Math.min(H-20, cy)) } }));
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background:'#070e1c', borderRadius:'var(--radius-lg)', cursor:'default' }}>
      {/* Links */}
      {links.map((l, i) => {
        const a = positions[l.source], b = positions[l.target];
        if (!a || !b) return null;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={l.color || '#555'} strokeWidth={2} opacity={0.6} />
            <text x={(a.x+b.x)/2} y={(a.y+b.y)/2 - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="Inter">
              {l.type?.replace(/_/g,' ')}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;
        const isSelected = selectedId === n.id;
        const isHovered  = hovered === n.id;
        const r = (n.size || 10) + (isSelected || isHovered ? 4 : 0);
        return (
          <g key={n.id} style={{ cursor:'pointer' }}
            onMouseDown={e => startDrag(n.id, e)}
            onClick={() => onNodeClick(n.id)}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}>
            {(isSelected || n.group === 'ring' || n.group === 'focal') && (
              <circle cx={pos.x} cy={pos.y} r={r + 8} fill={n.color || '#DC2626'} opacity={0.2} />
            )}
            <circle cx={pos.x} cy={pos.y} r={r}
              fill={n.color || '#3B82F6'}
              stroke={isSelected ? 'white' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isSelected ? 2.5 : 1}
              style={{ filter:`drop-shadow(0 0 ${isSelected ? 8 : 3}px ${n.color || '#3B82F6'}88)` }}
            />
            <text x={pos.x} y={pos.y + r + 12} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9.5" fontFamily="Inter" fontWeight="600">
              {n.label?.split(' ')[0]}
            </text>
            {(isHovered || isSelected) && (
              <text x={pos.x} y={pos.y - r - 5} textAnchor="middle" fill="white" fontSize="10" fontFamily="Inter" fontWeight="700">
                #{n.id}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function NetworkGraphView() {
  const navigate = useNavigate();
  const [focalId, setFocalId] = useState(7);
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: graphData } = useNetworkGraph(focalId);
  useBeneficiaries({ limit: 100 });

  const nodes = graphData?.nodes || [];
  const links = graphData?.links || [];

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Relationship Network Graph</h1>
          <p>Real-time graph analysis of shared credentials and suspicious cluster connections</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <select className="filter-select" value={focalId} onChange={e => setFocalId(Number(e.target.value))}>
            <option value={7}>Focal: #7 (Lucknow Ring Cluster)</option>
            <option value={1}>Focal: #1 (Aadhaar Match)</option>
            <option value={4}>Focal: #4 (Bank Account Match)</option>
            <option value={10}>Focal: #10 (Ring Member)</option>
          </select>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="alert-red" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:20 }}>🚨</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--red-500)' }}>High-Concern Relationship Cluster Detected</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Multiple applicants share contact or payout credentials, indicating potential coordinated claim rings.</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
        {/* Graph */}
        <div>
          <div className="network-container" style={{ height:500, position:'relative' }}>
            <div className="network-legend">
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Edge Signals</div>
              <div className="legend-item">
                <div style={{ width:20, height:2, background:'#DC2626', borderRadius:1 }} />
                <span style={{ fontSize:11 }}>Shared phone / contact</span>
              </div>
              <div className="legend-item">
                <div style={{ width:20, height:2, background:'#8B5CF6', borderRadius:1 }} />
                <span style={{ fontSize:11 }}>Shared bank account</span>
              </div>
            </div>

            <div style={{ padding:12 }}>
              <ForceGraph
                nodes={nodes}
                links={links}
                onNodeClick={setSelectedNode}
                selectedId={selectedNode}
              />
            </div>
          </div>

          <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
            💡 Click a node to inspect · Drag nodes to rearrange · Edges computed dynamically from database
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {selectedNodeData ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Selected Applicant</div>
                <button style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }} onClick={() => setSelectedNode(null)}>×</button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:selectedNodeData?.color || '#3B82F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white' }}>
                  {selectedNodeData.label?.split(' ').slice(0,2).map(w=>w[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{selectedNodeData.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    ID #{selectedNodeData.id} · {selectedNodeData.group}
                  </div>
                </div>
              </div>

              <div style={{ display:'grid', gap:6, marginBottom:16 }}>
                {[
                  ['Concern Level', selectedNodeData.concern_level || 'high'],
                  ['Leakage Probability', `${selectedNodeData.leakage_probability || 70}%`],
                  ['Cluster Role', selectedNodeData.id === focalId ? 'Primary Target' : 'Connected Node'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                    <span style={{ color:'var(--text-muted)' }}>{l}</span>
                    <span style={{ fontWeight:600, textTransform:'capitalize' }}>{v}</span>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:16 }} onClick={() => navigate(`/beneficiaries/${selectedNodeData.id}`)}>
                View Full Profile →
              </button>
            </div>
          ) : (
            <div className="card" style={{ textAlign:'center', padding:32 }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.4 }}>🕸️</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Click a node</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Select any node to inspect relationship links</div>
            </div>
          )}

          <div className="card">
            <div className="card-title" style={{ marginBottom:12 }}>Network Summary</div>
            {[
              { label:'Identified Graph Nodes', value:nodes.length, color:'var(--blue-400)' },
              { label:'Credential Link Edges', value:links.length, color:'var(--red-500)' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
