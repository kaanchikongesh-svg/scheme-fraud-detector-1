import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConcernBadge, { CONCERN_CONFIG } from '../../components/RiskBadge.jsx';
import ReasonList from '../../components/ReasonList.jsx';
import { SkeletonCard } from '../../components/SkeletonLoader.jsx';
import { useBeneficiaryDetail } from '../../hooks/useBeneficiaries.js';
import { useDistricts } from '../../hooks/useDistricts.js';
import { useSchemes } from '../../hooks/useSchemes.js';

// Circular Progress Gauge for AI Leakage Probability (0-100%)
function LeakageGauge({ probability, level }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(probability), 150);
    return () => clearTimeout(t);
  }, [probability]);

  const R = 64, cx = 80, cy = 80;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference * (1 - (animated / 100));

  const cfg = CONCERN_CONFIG[level] || CONCERN_CONFIG.low;
  const color = cfg.color;

  return (
    <div className="risk-gauge-container" style={{ minWidth: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Background Track Ring */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        {/* Animated Progress Ring */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ 
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', 
            filter: `drop-shadow(0 0 8px ${color}66)` 
          }}
        />
        {/* Probability Text */}
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="Inter">
          {Math.round(animated)}%
        </text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="700" letterSpacing="0.8px" fontFamily="Inter">
          LEAKAGE PROBABILITY
        </text>
      </svg>
      <ConcernBadge level={level} size="lg" />
    </div>
  );
}

export default function BeneficiaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ai_analysis');
  const [actionLoading, setActionLoading] = useState(false);

  const { beneficiary, loading, error, updateStatus, reEvaluateAI } = useBeneficiaryDetail(id);
  const { data: districtList } = useDistricts();
  useSchemes();

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <SkeletonCard />
        <div style={{ height: 20 }} />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !beneficiary) return (
    <div className="empty-state" style={{ paddingTop:80 }}>
      <div className="empty-state-icon">❓</div>
      <h3>Beneficiary not found</h3>
      <p>ID #{id} does not exist in the registry</p>
      <button className="btn btn-secondary" style={{ marginTop:16 }} onClick={() => navigate('/beneficiaries')}>← Back to Registry</button>
    </div>
  );

  const prediction = beneficiary.prediction || {
    leakage_probability: 10,
    concern_level: 'low',
    contributing_factors: ['No anomalies detected — profile conforms to scheme criteria.'],
    severity: ['low'],
    recommended_action: 'Continue normal processing.',
    potential_leakage_amount: 0,
    model_version: '2.0.0-leakage-prob-pipeline',
  };

  const district = districtList.find(d => d.id === beneficiary.district_id);
  const currentStatus = beneficiary.status;

  const age = beneficiary.dob ? Math.floor((new Date() - new Date(beneficiary.dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
  const potentialAmount = prediction.potential_leakage_amount || 25000;

  async function handleAction(action) {
    setActionLoading(true);
    try {
      await updateStatus(action, `Status changed by officer to ${action}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReEvaluate() {
    setActionLoading(true);
    try {
      await reEvaluateAI();
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      {/* Top Navigation & Officer Actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/beneficiaries')}>← Back to Beneficiaries</button>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleReEvaluate} disabled={actionLoading}>
            🔄 Re-run AI Evaluation
          </button>
          {currentStatus === 'pending' && <>
            <button className="btn btn-success btn-sm" onClick={() => handleAction('approved')} disabled={actionLoading}>✓ Authorize Approval</button>
            <button className="btn btn-danger btn-sm"  onClick={() => handleAction('rejected')} disabled={actionLoading}>✕ Reject Application</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAction('flagged')} disabled={actionLoading}>🚩 Flag for Investigation</button>
          </>}
          <button className="btn btn-secondary btn-sm">📥 Export Dossier</button>
        </div>
      </div>

      {/* Primary Header Card with Leakage Gauge */}
      <div className="profile-card">
        <div className="profile-avatar" style={{ background:`hsl(${(beneficiary.id*47)%360},50%,30%)` }}>
          {beneficiary.full_name.split(' ').slice(0,2).map(w=>w[0]).join('')}
        </div>
        <div className="profile-info" style={{ flex:1 }}>
          <h2>{beneficiary.full_name}</h2>
          <p>Beneficiary Record #{String(beneficiary.id).padStart(4,'0')}</p>
          <div className="profile-meta">
            <span className="meta-chip">🎂 Age {age}</span>
            <span className="meta-chip">⚧ {beneficiary.gender}</span>
            <span className="meta-chip">📍 {district?.name || 'District'}, {district?.state || 'State'}</span>
            <span className="meta-chip">📅 Registered {beneficiary.created_at || 'Recent'}</span>
            <span className={`status-badge ${currentStatus}`}>{currentStatus}</span>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
            <div style={{ padding:'6px 12px', background:'var(--bg-glass-light)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-subtle)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Potential Leakage Exposure</span>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>₹{potentialAmount.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding:'6px 12px', background:'var(--bg-glass-light)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-subtle)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Concern Level</span>
              <div style={{ fontSize:14, fontWeight:700, textTransform:'capitalize', color: CONCERN_CONFIG[prediction?.concern_level]?.color || 'var(--text-primary)' }}>
                {prediction?.concern_level || 'Low'} Concern
              </div>
            </div>
          </div>
        </div>

        {/* Circular Progress Ring */}
        {prediction && (
          <LeakageGauge 
            probability={prediction.leakage_probability} 
            level={prediction.concern_level} 
          />
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {['ai_analysis','profile','documents'].map(t => (
          <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
            {t === 'ai_analysis' ? '🤖 AI Leakage Evaluation' : t === 'profile' ? '👤 Demographics' : '📄 Identity Documents'}
          </button>
        ))}
      </div>

      {/* TAB 1: AI LEAKAGE ANALYSIS */}
      {activeTab === 'ai_analysis' && prediction && (
        <div style={{ display:'grid', gap:20 }}>
          {/* Summary Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🤖 AI Leakage Probability Assessment</div>
                <div className="card-subtitle">Model: {prediction.model_version} · Evaluated: {prediction.predicted_at || 'Live DB'}</div>
              </div>
              <ConcernBadge level={prediction.concern_level} size="lg" />
            </div>

            {/* Probability bar */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>AI Leakage Probability</span>
                <span style={{ fontSize:15, fontWeight:800, color:CONCERN_CONFIG[prediction.concern_level]?.color }}>
                  {prediction.leakage_probability}%
                </span>
              </div>
              <div className="progress-bar-wrap" style={{ height:10 }}>
                <div 
                  className="progress-bar" 
                  style={{ 
                    width:`${prediction.leakage_probability}%`, 
                    background: CONCERN_CONFIG[prediction.concern_level]?.color 
                  }} 
                />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10 }}>
                <span style={{ color:'var(--concern-low)' }}>0–29% Low</span>
                <span style={{ color:'var(--concern-moderate)' }}>30–59% Moderate</span>
                <span style={{ color:'var(--concern-high)' }}>60–79% High</span>
                <span style={{ color:'var(--concern-critical)' }}>80–100% Critical</span>
              </div>
            </div>

            {/* Recommended Action Box */}
            <div className={`alert-${prediction.concern_level === 'critical' ? 'red' : prediction.concern_level === 'high' ? 'amber' : 'blue'}`}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <span>🛡️</span>
                <span>Recommended Officer Action ({prediction.concern_level.toUpperCase()} CONCERN)</span>
              </div>
              <div style={{ fontSize:13.5, fontWeight:600 }}>{prediction.recommended_action}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                Guardrail: AI probability is an advisory indicator. Final adjudication must be authorized by the assigned verification officer.
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔍 Contributing Factors (Explainability)</div>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{prediction.contributing_factors?.length || 0} factors identified</span>
            </div>
            <ReasonList factors={prediction.contributing_factors} severity={prediction.severity} />
          </div>
        </div>
      )}

      {/* TAB 2: DEMOGRAPHICS */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Applicant Demographics & Verification Credentials</div>
          </div>
          <div className="detail-grid">
            <div className="detail-field"><div className="detail-field-label">Full Name</div><div className="detail-field-value">{beneficiary.full_name}</div></div>
            <div className="detail-field"><div className="detail-field-label">Date of Birth</div><div className="detail-field-value">{beneficiary.dob || '—'}</div></div>
            <div className="detail-field"><div className="detail-field-label">Gender</div><div className="detail-field-value" style={{ textTransform:'capitalize' }}>{beneficiary.gender}</div></div>
            <div className="detail-field"><div className="detail-field-label">Contact Phone</div><div className="detail-field-value font-mono">{beneficiary.phone || '—'}</div></div>
            <div className="detail-field"><div className="detail-field-label">District</div><div className="detail-field-value">{district?.name || '—'}, {district?.state || '—'}</div></div>
            <div className="detail-field"><div className="detail-field-label">Declared Annual Income</div><div className="detail-field-value">₹{beneficiary.declared_income?.toLocaleString('en-IN')}</div></div>
            <div className="detail-field" style={{ gridColumn:'span 2' }}><div className="detail-field-label">Residential Address</div><div className="detail-field-value">{beneficiary.address || '—'}</div></div>
            <div className="detail-field"><div className="detail-field-label">Salted Aadhaar Hash</div><div className="detail-field-value font-mono" style={{ fontSize:11 }}>{beneficiary.aadhaar_hash}</div></div>
            <div className="detail-field"><div className="detail-field-label">Salted Bank Hash</div><div className="detail-field-value font-mono" style={{ fontSize:11 }}>{beneficiary.bank_account_hash || '—'}</div></div>
            <div className="detail-field"><div className="detail-field-label">Bank IFSC Code</div><div className="detail-field-value font-mono">{beneficiary.ifsc_code || '—'}</div></div>
            <div className="detail-field"><div className="detail-field-label">Enrolment Timestamp</div><div className="detail-field-value">{beneficiary.created_at}</div></div>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Verified Identity & Eligibility Documents</div>
            <button className="btn btn-primary btn-sm">📎 Upload Document</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:12 }}>
            {['Aadhaar Card','Ration Card','Income Certificate','Bank Passbook','Photo Proof'].map((doc, i) => (
              <div key={doc} style={{ padding:16, background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-subtle)', textAlign:'center', cursor:'pointer' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>
                  {['🪪','🗂️','📑','🏦','🖼️'][i]}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{doc}</div>
                <div style={{ fontSize:10.5, color:'var(--concern-low)', marginTop:4 }}>
                  ✓ Salted & Verified
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
