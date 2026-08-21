import { useState, useEffect, useRef } from 'react';

// Animated counter hook
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

export default function StatCard({ label, value, icon, accentColor, trend, trendLabel, prefix = '', suffix = '', delay = 0, onClick }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const animVal = useCountUp(visible ? (typeof value === 'number' ? value : 0) : 0);

  const displayValue = typeof value === 'number'
    ? `${prefix}${animVal.toLocaleString('en-IN')}${suffix}`
    : value;

  const trendClass = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';

  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{
        '--card-accent': `linear-gradient(90deg, ${accentColor || 'var(--blue-600)'}, ${accentColor || 'var(--blue-500)'}88)`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div className="stat-card-icon" style={{ background: `${accentColor || 'var(--blue-600)'}22`, color: accentColor || 'var(--blue-500)' }}>
        {icon}
      </div>
      <div className="stat-card-value">{displayValue}</div>
      <div className="stat-card-label">{label}</div>
      {trend !== undefined && (
        <span className={`stat-card-trend ${trendClass}`}>
          {trendArrow} {Math.abs(trend)}% {trendLabel || ''}
        </span>
      )}
    </div>
  );
}
