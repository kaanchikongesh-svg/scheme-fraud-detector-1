// ConcernBadge (AI Leakage Probability)
// 0-29%: Low Concern, 30-59%: Moderate Concern, 60-79%: High Concern, 80-100%: Critical Concern

export const CONCERN_CONFIG = {
  low: {
    label: 'Low Concern',
    icon: '✓',
    color: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.12)',
    action: 'Continue normal processing.'
  },
  moderate: {
    label: 'Moderate Concern',
    icon: '⚠️',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    action: 'Perform additional document verification.'
  },
  high: {
    label: 'High Concern',
    icon: '⚡',
    color: '#EA580C',
    bg: 'rgba(234, 88, 12, 0.12)',
    action: 'Send for manual officer verification.'
  },
  critical: {
    label: 'Critical Concern',
    icon: '🚨',
    color: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.12)',
    action: 'Hold the application temporarily and conduct priority investigation.'
  }
};

export function getConcernLevel(probability) {
  const p = Number(probability) || 0;
  if (p >= 80) return 'critical';
  if (p >= 60) return 'high';
  if (p >= 30) return 'moderate';
  return 'low';
}

export function getRecommendedAction(concernLevel) {
  return CONCERN_CONFIG[concernLevel]?.action || 'Continue normal processing.';
}

export default function ConcernBadge({ 
  level, 
  tier, 
  probability, 
  score, 
  showProbability = false, 
  showScore = false, 
  size = 'sm' 
}) {
  // Normalize level
  let concernKey = level || tier || 'low';
  if (concernKey === 'green') concernKey = 'low';
  if (concernKey === 'yellow') concernKey = 'moderate';
  if (concernKey === 'orange') concernKey = 'high';
  if (concernKey === 'red') concernKey = 'critical';

  const cfg = CONCERN_CONFIG[concernKey] || CONCERN_CONFIG.low;
  const probVal = probability !== undefined ? probability : score;

  return (
    <span 
      className={`concern-badge ${concernKey}`} 
      style={size === 'lg' ? { padding: '6px 14px', fontSize: '13px' } : {}}
    >
      <span className="concern-badge-dot" />
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {(showProbability || showScore) && probVal !== undefined && (
        <span style={{ opacity: 0.85, marginLeft: 3, fontWeight: 800 }}>({probVal}%)</span>
      )}
    </span>
  );
}

// Named alias for backward compatibility
export const RiskBadge = ConcernBadge;
