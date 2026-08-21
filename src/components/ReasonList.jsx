// Contributing Factors (AI Explainability Display Component)
export default function ReasonList({ factors, reasons, severity = [] }) {
  const items = factors || reasons || [];

  if (items.length === 0) {
    return (
      <div className="reason-item low" style={{ justifyContent: 'center', color: 'var(--concern-low)' }}>
        <span className="reason-icon">✓</span>
        <span>No anomalies detected — profile conforms to scheme requirements</span>
      </div>
    );
  }

  const sev = (i) => severity[i] || 'medium';
  const icons = { high: '🚨', medium: '⚠️', low: 'ℹ️' };

  return (
    <div className="reason-list">
      {items.map((item, i) => (
        <div key={i} className={`reason-item ${sev(i)}`}>
          <span className="reason-icon">{icons[sev(i)] || '⚠️'}</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
