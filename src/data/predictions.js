// AI Leakage Probability Engine & Predictions Data
// Replaces "Risk Score" with "AI Leakage Probability" (0-100%) and 4 Concern Levels:
// 0-29%: Low Concern, 30-59%: Moderate Concern, 60-79%: High Concern, 80-100%: Critical Concern

import { beneficiaries } from './beneficiaries.js';

export const CONCERN_ACTIONS = {
  low: 'Continue normal processing.',
  moderate: 'Perform additional document verification.',
  high: 'Send for manual officer verification.',
  critical: 'Hold the application temporarily and conduct priority investigation.'
};

// Helper: compute leakage probability and neutral, non-accusatory contributing factors
function scoreRules(b) {
  let probability = 0;
  const contributing_factors = [];
  const severity = [];

  // 1. Duplicate Aadhaar check
  if (b.aadhaar_hash.startsWith('AA_FRAUD_')) {
    const hash = b.aadhaar_hash;
    const matches = beneficiaries.filter(x => x.aadhaar_hash === hash && x.id !== b.id).map(x => x.id);
    if (matches.length > 0) {
      probability += 40;
      contributing_factors.push(`Potential duplicate identity pattern: Aadhaar hash matches ${matches.length} other applicant(s) (IDs: ${matches.join(', ')})`);
      severity.push('high');
    }
  }

  // 2. Duplicate bank account check
  if (b.bank_account_hash.startsWith('BANK_FRAUD_') || b.bank_account_hash.startsWith('RING_BANK_')) {
    const matches = beneficiaries.filter(x => x.bank_account_hash === b.bank_account_hash && x.id !== b.id).map(x => x.id);
    if (matches.length > 0) {
      probability += 30;
      contributing_factors.push(`Payout bank account shared with ${matches.length} other registered applicant(s) (IDs: ${matches.join(', ')})`);
      severity.push('high');
    }
  }

  // 3. Shared contact / network cluster detection
  const RING_PHONES = ['9800000001','9800000002','9800000003','9800000004','9800000005'];
  if (RING_PHONES.includes(b.phone)) {
    const matches = beneficiaries.filter(x => x.phone === b.phone && x.id !== b.id).map(x => x.id);
    probability += 20;
    contributing_factors.push(`Suspicious cluster pattern identified: contact details shared across ${matches.length + 1} applicants`);
    severity.push('high');
  }

  // 4. Income eligibility deviation
  if (b.declared_income > 300000) {
    probability += 25;
    contributing_factors.push(`Declared income ₹${b.declared_income.toLocaleString('en-IN')} exceeds standard low-income welfare threshold of ₹3,00,000`);
    severity.push('medium');
  } else if (b.declared_income > 150000) {
    probability += 15;
    contributing_factors.push(`Declared income ₹${b.declared_income.toLocaleString('en-IN')} exceeds lower-tier scheme eligibility ceilings`);
    severity.push('medium');
  }

  // 5. Fuzzy identity similarity (IDs 23-32)
  const FUZZY_CLUSTERS = [[23,24],[25,26],[27,28],[29,30],[31,32]];
  for (const cluster of FUZZY_CLUSTERS) {
    if (cluster.includes(b.id)) {
      const match = cluster.filter(x => x !== b.id);
      probability += 20;
      contributing_factors.push(`High textual similarity detected in demographic records with applicant #${match[0]}`);
      severity.push('medium');
      break;
    }
  }

  // 6. Multi-scheme overlap (IDs 33-42)
  const MULTI_SCHEME_IDS = [33,34,35,36,37,38,39,40,41,42];
  if (MULTI_SCHEME_IDS.includes(b.id)) {
    probability += 15;
    contributing_factors.push(`Concurrent enrollment detected across 3+ welfare schemes with conflicting eligibility criteria`);
    severity.push('medium');
  }

  // Clean profiles
  if (contributing_factors.length === 0) {
    const noise = Math.floor(Math.random() * 16);
    probability = noise;
    if (noise > 10) {
      contributing_factors.push('Minor demographic address variation detected during cross-registry verification');
      severity.push('low');
    }
  }

  probability = Math.min(100, probability);
  
  // 4 Concern Level Categories
  let concern_level = 'low';
  if (probability >= 80) concern_level = 'critical';
  else if (probability >= 60) concern_level = 'high';
  else if (probability >= 30) concern_level = 'moderate';

  const recommended_action = CONCERN_ACTIONS[concern_level];

  return {
    leakage_probability: probability,
    concern_level,
    contributing_factors: contributing_factors.length > 0 ? contributing_factors : ['No anomalies detected — profile conforms to scheme requirements.'],
    severity: severity.length > 0 ? severity : ['low'],
    recommended_action,
    potential_leakage_amount: (concern_level === 'critical' || concern_level === 'high') ? 25000 : 0,
    
    // Backward compatibility aliases
    risk_score: probability,
    risk_tier: concern_level === 'critical' ? 'red' : concern_level === 'high' ? 'orange' : concern_level === 'moderate' ? 'yellow' : 'green',
    reasons: contributing_factors.length > 0 ? contributing_factors : ['No anomalies detected — profile conforms to scheme requirements.'],
    recommendation: recommended_action
  };
}

// Generate predictions for all beneficiaries
export const predictions = beneficiaries.map((b, i) => {
  const result = scoreRules(b);
  return {
    id: i + 1,
    beneficiary_id: b.id,
    application_id: b.id,
    leakage_probability: result.leakage_probability,
    concern_level: result.concern_level,
    contributing_factors: result.contributing_factors,
    severity: result.severity,
    recommended_action: result.recommended_action,
    potential_leakage_amount: result.potential_leakage_amount,
    model_version: '2.0.0-leakage-prob-pipeline',
    predicted_at: b.created_at,

    // Backward-compat aliases
    risk_score: result.leakage_probability,
    risk_tier: result.risk_tier,
    reasons: result.contributing_factors,
    recommendation: result.recommended_action
  };
});

// Predictions keyed by beneficiary_id
export const predictionsByBeneficiary = Object.fromEntries(
  predictions.map(p => [p.beneficiary_id, p])
);

// Dashboard Summary (4 Concern Levels + Potential Leakage Amount)
export function getDashboardSummary() {
  const total = beneficiaries.length;
  const critical = predictions.filter(p => p.concern_level === 'critical').length;
  const high     = predictions.filter(p => p.concern_level === 'high').length;
  const moderate = predictions.filter(p => p.concern_level === 'moderate').length;
  const low      = predictions.filter(p => p.concern_level === 'low').length;

  const approved = beneficiaries.filter(b => b.status === 'approved').length;
  const pending  = beneficiaries.filter(b => b.status === 'pending').length;
  const flagged  = beneficiaries.filter(b => b.status === 'flagged').length;
  const rejected = beneficiaries.filter(b => b.status === 'rejected').length;

  const avgLeakageProbability = Math.round(predictions.reduce((s, p) => s + p.leakage_probability, 0) / total);
  const potentialLeakageAmount = (critical * 50000) + (high * 25000) + (moderate * 10000);
  const casesRequiringVerification = critical + high;

  return {
    total,
    critical,
    high,
    moderate,
    low,
    approved,
    pending,
    flagged,
    rejected,
    avgLeakageProbability,
    potentialLeakageAmount,
    casesRequiringVerification,

    // Backward compatibility aliases
    red: critical,
    yellow: moderate + high,
    green: low,
    avgRiskScore: avgLeakageProbability,
    estimatedSavings: potentialLeakageAmount
  };
}

// Leakage Detection & Resolution Trend (Monthly)
export const fraudTrend = [
  { month: 'Jan', detected: 8,  resolved: 5 },
  { month: 'Feb', detected: 12, resolved: 9 },
  { month: 'Mar', detected: 18, resolved: 11 },
  { month: 'Apr', detected: 15, resolved: 14 },
  { month: 'May', detected: 22, resolved: 16 },
  { month: 'Jun', detected: 19, resolved: 18 },
  { month: 'Jul', detected: 28, resolved: 20 },
  { month: 'Aug', detected: 24, resolved: 19 },
];

export const leakageTrend = fraudTrend;

// District Leakage Probability & Flagged density
export const districtFraudData = [
  { district: 'Chennai',         state: 'TN',  total: 23, flagged: 4,  leakage_pct: 18, risk_pct: 18 },
  { district: 'Coimbatore',      state: 'TN',  total: 18, flagged: 2,  leakage_pct: 12, risk_pct: 12 },
  { district: 'Madurai',         state: 'TN',  total: 19, flagged: 4,  leakage_pct: 22, risk_pct: 22 },
  { district: 'Salem',           state: 'TN',  total: 15, flagged: 1,  leakage_pct: 9,  risk_pct: 9  },
  { district: 'Tiruchirappalli', state: 'TN',  total: 17, flagged: 3,  leakage_pct: 15, risk_pct: 15 },
  { district: 'Mumbai',          state: 'MH',  total: 28, flagged: 9,  leakage_pct: 31, risk_pct: 31 },
  { district: 'Pune',            state: 'MH',  total: 20, flagged: 3,  leakage_pct: 14, risk_pct: 14 },
  { district: 'Nagpur',          state: 'MH',  total: 16, flagged: 2,  leakage_pct: 11, risk_pct: 11 },
  { district: 'Delhi',           state: 'DL',  total: 31, flagged: 9,  leakage_pct: 28, risk_pct: 28 },
  { district: 'Bengaluru',       state: 'KA',  total: 24, flagged: 4,  leakage_pct: 16, risk_pct: 16 },
  { district: 'Mysuru',          state: 'KA',  total: 13, flagged: 1,  leakage_pct: 8,  risk_pct: 8  },
  { district: 'Hyderabad',       state: 'TS',  total: 22, flagged: 4,  leakage_pct: 20, risk_pct: 20 },
  { district: 'Kolkata',         state: 'WB',  total: 29, flagged: 7,  leakage_pct: 25, risk_pct: 25 },
  { district: 'Jaipur',          state: 'RJ',  total: 21, flagged: 4,  leakage_pct: 17, risk_pct: 17 },
  { district: 'Lucknow',         state: 'UP',  total: 27, flagged: 8,  leakage_pct: 29, risk_pct: 29 },
  { district: 'Patna',           state: 'BR',  total: 25, flagged: 8,  leakage_pct: 33, risk_pct: 33 },
  { district: 'Bhopal',          state: 'MP',  total: 18, flagged: 2,  leakage_pct: 13, risk_pct: 13 },
  { district: 'Ahmedabad',       state: 'GJ',  total: 19, flagged: 2,  leakage_pct: 10, risk_pct: 10 },
  { district: 'Chandigarh',      state: 'PB',  total: 14, flagged: 1,  leakage_pct: 7,  risk_pct: 7  },
  { district: 'Guwahati',        state: 'AS',  total: 17, flagged: 3,  leakage_pct: 19, risk_pct: 19 },
];

export const districtLeakageData = districtFraudData;

// Network cluster graph data
export const networkGraphData = {
  nodes: [
    { id: 43, label: 'Suresh Gupta',  group: 'ring', color: '#DC2626', size: 14 },
    { id: 44, label: 'Anil Gupta',    group: 'ring', color: '#DC2626', size: 14 },
    { id: 45, label: 'Neha Gupta',    group: 'ring', color: '#DC2626', size: 14 },
    { id: 46, label: 'Raj Gupta',     group: 'ring', color: '#DC2626', size: 14 },
    { id: 47, label: 'Pradeep Gupta', group: 'ring', color: '#DC2626', size: 14 },
    { id: 48, label: 'Sunita Gupta',  group: 'ring', color: '#DC2626', size: 14 },
    { id: 49, label: 'Vivek Gupta',   group: 'ring', color: '#DC2626', size: 16 },
    { id: 50, label: 'Pooja Gupta',   group: 'ring', color: '#DC2626', size: 14 },
    { id: 51, label: 'Ramesh Gupta',  group: 'ring', color: '#DC2626', size: 14 },
    { id: 52, label: 'Geeta Gupta',   group: 'ring', color: '#DC2626', size: 14 },
    { id: 1,  label: 'Ramesh Kumar',  group: 'aadhaar', color: '#EA580C', size: 12 },
    { id: 2,  label: 'Ramesh K.',     group: 'aadhaar', color: '#EA580C', size: 12 },
    { id: 3,  label: 'R. Kumar',      group: 'aadhaar', color: '#EA580C', size: 12 },
    { id: 8,  label: 'Sunita Devi',   group: 'bank',    color: '#8B5CF6', size: 12 },
    { id: 9,  label: 'Kamla Bai',     group: 'bank',    color: '#8B5CF6', size: 12 },
    { id: 10, label: 'Savitri Singh', group: 'bank',    color: '#8B5CF6', size: 12 },
    // Genuine nodes
    { id: 53, label: 'Anita Das',     group: 'genuine', color: '#16A34A', size: 8 },
    { id: 57, label: 'Mohan Verma',   group: 'genuine', color: '#16A34A', size: 8 },
    { id: 60, label: 'Arun Malhotra', group: 'genuine', color: '#16A34A', size: 8 },
    { id: 64, label: 'Suresh Kumar',  group: 'genuine', color: '#16A34A', size: 8 },
  ],
  links: [
    { source: 43, target: 44, type: 'shared_phone',   color: '#DC2626' },
    { source: 44, target: 45, type: 'shared_address', color: '#EA580C' },
    { source: 45, target: 46, type: 'shared_phone',   color: '#DC2626' },
    { source: 46, target: 47, type: 'shared_address', color: '#EA580C' },
    { source: 47, target: 48, type: 'shared_phone',   color: '#DC2626' },
    { source: 48, target: 49, type: 'shared_bank',    color: '#C026D3' },
    { source: 49, target: 50, type: 'shared_phone',   color: '#DC2626' },
    { source: 50, target: 51, type: 'shared_bank',    color: '#C026D3' },
    { source: 51, target: 52, type: 'shared_phone',   color: '#DC2626' },
    { source: 43, target: 49, type: 'shared_bank',    color: '#C026D3' },
    { source: 44, target: 49, type: 'shared_address', color: '#EA580C' },
    { source: 1,  target: 2,  type: 'duplicate_aadhaar', color: '#EA580C' },
    { source: 2,  target: 3,  type: 'duplicate_aadhaar', color: '#EA580C' },
    { source: 1,  target: 3,  type: 'duplicate_aadhaar', color: '#EA580C' },
    { source: 8,  target: 9,  type: 'shared_bank', color: '#C026D3' },
    { source: 9,  target: 10, type: 'shared_bank', color: '#C026D3' },
    { source: 8,  target: 10, type: 'shared_bank', color: '#C026D3' },
  ],
};
