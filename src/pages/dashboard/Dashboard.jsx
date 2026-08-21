import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../../components/StatCard.jsx';
import ConcernBadge from '../../components/RiskBadge.jsx';
import { SkeletonCard, SkeletonTable } from '../../components/SkeletonLoader.jsx';
import { useDashboardSummary } from '../../hooks/useDashboard.js';
import { useBeneficiaries } from '../../hooks/useBeneficiaries.js';
import { useApplicationSummary } from '../../hooks/useApplications.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', padding:'10px 14px' }}>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey || p.name} style={{ fontSize:11.5, color:p.color || 'var(--text-primary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summaryData, loading: summaryLoading, isFallback } = useDashboardSummary();
  const { data: beneficiaryList, loading: benLoading } = useBeneficiaries({ limit: 100 });
  const { data: applicationSummary } = useApplicationSummary();

  const summary = useMemo(() => {
    if (!summaryData) return {
      total: 0, critical: 0, high: 0, moderate: 0, low: 0,
      potentialLeakageAmount: 0, casesRequiringVerification: 0,
      avgLeakageProbability: 0, approved: 0, pending: 0, flagged: 0, rejected: 0
    };

    if (summaryData.concern_distribution) {
      return {
        total: summaryData.total_beneficiaries,
        critical: summaryData.concern_distribution.critical || 0,
        high: summaryData.concern_distribution.high || 0,
        moderate: summaryData.concern_distribution.moderate || 0,
        low: summaryData.concern_distribution.low || 0,
        potentialLeakageAmount: summaryData.potential_leakage_amount || 0,
        casesRequiringVerification: summaryData.cases_requiring_verification || 0,
        avgLeakageProbability: summaryData.avg_leakage_probability || 0,
        approved: summaryData.status_distribution?.approved || 0,
        pending: summaryData.status_distribution?.pending || 0,
        flagged: summaryData.status_distribution?.flagged || 0,
        rejected: summaryData.status_distribution?.rejected || 0,
      };
    }
    return { ...summaryData, ...(applicationSummary || {}) };
  }, [summaryData, applicationSummary]);

  const priorityCases = useMemo(() => {
    if (!beneficiaryList || !beneficiaryList.length) return [];
    return beneficiaryList
      .filter(b => b.concern_level === 'critical' || b.concern_level === 'high' || (b.leakage_probability && b.leakage_probability >= 60))
      .slice(0, 8);
  }, [beneficiaryList]);

  const pieData = [
    { name: 'Critical Concern', value: summary.critical, color: '#DC2626' },
    { name: 'High Concern',     value: summary.high,     color: '#EA580C' },
    { name: 'Moderate Concern', value: summary.moderate, color: '#D97706' },
    { name: 'Low Concern',      value: summary.low,      color: '#16A34A' },
  ];

  const topDistricts = [];

  return (
    <div>
      {isFallback && (
        <div style={{ marginBottom: 16, padding: '8px 14px', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>⚡</span>
          <span style={{ fontSize: 12, color: 'var(--amber-500)' }}>
            <strong>Backend Unavailable:</strong> Live data cannot be displayed. Please check the API connection.
          </span>
        </div>
      )}

      {/* ─── 1. TOP STAT CARDS (4 CONCERN LEVELS & LEAKAGE STATS) ─── */}
            {applicationSummary && (
              <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                <div className="grid grid-4">
                  <StatCard label="Total Applications" value={applicationSummary.total_applications} icon="📋" accentColor="#3B82F6" onClick={() => navigate('/applications')} />
                  <StatCard label="Pending Applications" value={applicationSummary.pending_applications} icon="⏳" accentColor="#D97706" onClick={() => navigate('/applications')} />
                  <StatCard label="Approved Applications" value={applicationSummary.approved_applications} icon="✓" accentColor="#16A34A" onClick={() => navigate('/applications')} />
                  <StatCard label="Rejected Applications" value={applicationSummary.rejected_applications} icon="✕" accentColor="#DC2626" onClick={() => navigate('/applications')} />
                </div>
                <div className="grid grid-4">
                  <StatCard label="Verification Required" value={applicationSummary.verification_required} icon="🔍" accentColor="#EA580C" onClick={() => navigate('/applications')} />
                  <StatCard label="Flagged Applications" value={applicationSummary.flagged_applications} icon="🚩" accentColor="#EA580C" onClick={() => navigate('/applications')} />
                  <StatCard label="Critical Cases" value={applicationSummary.critical_cases} icon="🚨" accentColor="#DC2626" onClick={() => navigate('/applications')} />
                  <StatCard label="Potential Leakage Amount" value={applicationSummary.potential_leakage_amount} icon="💰" prefix="₹" accentColor="#16A34A" onClick={() => navigate('/applications')} />
                </div>
              </div>
            )}
      {summaryLoading ? (
        <div className="grid grid-4" style={{ marginBottom: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-4" style={{ marginBottom:20 }}>
          <StatCard 
            label="Total Beneficiaries" 
            value={summary.total} 
            icon="👥" 
            accentColor="#3B82F6" 
            trend={8} 
            trendLabel="enrolled" 
            delay={0} 
          />
          <StatCard 
            label="Critical Concern Cases" 
            value={summary.critical} 
            icon="🚨" 
            accentColor="#DC2626" 
            trend={12} 
            trendLabel="requires hold" 
            delay={60} 
          />
          <StatCard 
            label="High Concern Cases" 
            value={summary.high} 
            icon="⚡" 
            accentColor="#EA580C" 
            trend={-3} 
            trendLabel="under review" 
            delay={120} 
          />
          <StatCard 
            label="Potential Leakage Exposure" 
            value={summary.potentialLeakageAmount} 
            icon="💰" 
            accentColor="#16A34A" 
            prefix="₹" 
            trend={24} 
            trendLabel="preventable" 
            delay={180} 
          />
        </div>
      )}

      {summaryLoading ? (
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-4" style={{ marginBottom:24 }}>
          <StatCard 
            label="Moderate Concern" 
            value={summary.moderate} 
            icon="⚠️" 
            accentColor="#D97706" 
            delay={0} 
          />
          <StatCard 
            label="Low Concern (Clear)" 
            value={summary.low} 
            icon="✓" 
            accentColor="#16A34A" 
            delay={60} 
          />
          <StatCard 
            label="Requires Verification" 
            value={summary.casesRequiringVerification} 
            icon="🔍" 
            accentColor="#8B5CF6" 
            suffix=" cases"
            delay={120} 
          />
          <StatCard 
            label="Avg Leakage Probability" 
            value={summary.avgLeakageProbability} 
            icon="📊" 
            accentColor="#60A5FA" 
            suffix="%" 
            delay={180} 
          />
        </div>
      )}

      {/* ─── 2. CHARTS ROW (4-TIER DISTRIBUTION & RESOLUTION TREND) ─── */}
      <div className="grid grid-3" style={{ marginBottom:24 }}>
        {/* Concern Level Distribution Pie */}
        <div className="chart-card">
          <div className="chart-card-title">Concern Level Distribution</div>
          <div className="chart-card-sub">AI leakage probability population breakdown</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(val, entry) => (
                  <span style={{ fontSize:11, color:'var(--text-secondary)' }}>
                    {val} ({entry.payload.value})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Leakage Detection & Resolution */}
        <div className="chart-card" style={{ gridColumn:'span 2' }}>
          <div className="chart-card-title">Leakage Detection vs Resolution Trend</div>
          <div className="chart-card-sub">Monthly identified cases vs successfully verified</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={summaryData?.leakage_trend || []} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--text-muted)' }} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={val => <span style={{ fontSize:11.5, color:'var(--text-secondary)' }}>{val}</span>} />
              <Line type="monotone" dataKey="detected" stroke="#DC2626" strokeWidth={2.5} dot={{ fill:'#DC2626', r:4 }} name="Identified" />
              <Line type="monotone" dataKey="resolved" stroke="#16A34A" strokeWidth={2.5} dot={{ fill:'#16A34A', r:4 }} name="Verified & Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── 3. DISTRICT BAR + PRIORITY CASES REQUIRING VERIFICATION ─── */}
      <div className="grid grid-3" style={{ marginBottom:24 }}>
        {/* District Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-title">District Leakage Probability</div>
          <div className="chart-card-sub">Average probability index by district</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topDistricts} layout="vertical" margin={{ left:10, right:10, top:5, bottom:5 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:'var(--text-muted)' }} unit="%" domain={[0, 40]} />
              <YAxis type="category" dataKey="district" tick={{ fontSize:10, fill:'var(--text-muted)' }} width={72} />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leakage_pct" name="Leakage %" radius={[0,4,4,0]}>
                {topDistricts.map((entry, i) => (
                  <Cell 
                    key={i} 
                    fill={entry.leakage_pct >= 28 ? '#DC2626' : entry.leakage_pct >= 18 ? '#EA580C' : entry.leakage_pct >= 12 ? '#D97706' : '#16A34A'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Cases Table */}
        <div className="card" style={{ gridColumn:'span 2', padding:0, overflow:'hidden' }}>
          <div className="card-header" style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)' }}>
            <div>
              <div className="card-title">🔍 Cases Requiring Priority Officer Verification</div>
              <div className="card-subtitle">Critical and high concern applications flagged for decision support</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/beneficiaries')}>View All Registry →</button>
          </div>
          <div className="table-container" style={{ border:'none', borderRadius:0 }}>
            {benLoading ? (
              <div style={{ padding: 20 }}><SkeletonTable rows={4} cols={5} /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>AI Leakage Probability</th>
                    <th>Concern Level</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityCases.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No high concern cases found.</td></tr>
                  ) : priorityCases.map(b => {
                    const prob = b.leakage_probability || 65;
                    const barColor = prob >= 80 ? '#DC2626' : prob >= 60 ? '#EA580C' : prob >= 30 ? '#D97706' : '#16A34A';
                    return (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.full_name || '—'}</strong>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>ID #{b.id}</div>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div className="progress-bar-wrap" style={{ width:55 }}>
                              <div className="progress-bar" style={{ width:`${prob}%`, background:barColor }} />
                            </div>
                            <span style={{ fontWeight:800, color:barColor, fontSize:13 }}>{prob}%</span>
                          </div>
                        </td>
                        <td><ConcernBadge level={b.concern_level || (prob >= 80 ? 'critical' : 'high')} /></td>
                        <td>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(234,88,12,0.12)', color: '#EA580C', fontWeight: 600, textTransform: 'capitalize' }}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/beneficiaries/${b.id}`)}>
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. APPLICATION STATUS BREAKDOWN ─── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Registry Disposition Overview</div>
            <div className="card-subtitle">Current workflow statuses of all applications</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {[
            { label:'Approved',           value:summary.approved,  color:'var(--green-500)',  bg:'var(--green-100)',  icon:'✓' },
            { label:'Pending Review',     value:summary.pending,   color:'var(--amber-500)',  bg:'var(--amber-100)',  icon:'⏳' },
            { label:'Flagged for Action', value:summary.flagged,   color:'var(--red-500)',    bg:'var(--red-100)',    icon:'🚩' },
            { label:'Rejected',           value:summary.rejected,  color:'var(--text-muted)', bg:'rgba(107,114,128,0.12)', icon:'✕' },
          ].map(s => (
            <div key={s.label} style={{ flex:'1', minWidth:120, padding:'16px', background:s.bg, borderRadius:'var(--radius-md)', border:`1px solid ${s.color}33`, textAlign:'center' }}>
              <div style={{ fontSize:20 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, marginTop:6 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
            </div>
          ))}
          <div style={{ flex:'2', minWidth:200, padding:'16px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>Overall Population Distribution</div>
            <div style={{ display:'flex', height:8, borderRadius:'var(--radius-full)', overflow:'hidden', gap:2 }}>
              <div style={{ flex:summary.approved || 1, background:'var(--green-500)' }} title="Approved" />
              <div style={{ flex:summary.pending || 1,  background:'var(--amber-500)' }} title="Pending" />
              <div style={{ flex:summary.flagged || 1,  background:'var(--red-500)' }} title="Flagged" />
              <div style={{ flex:summary.rejected || 1, background:'var(--text-muted)' }} title="Rejected" />
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>Total: {summary.total} applicants across 20 districts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
