export function SkeletonBox({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <SkeletonBox width="40%" height="14px" style={{ marginBottom: '12px' }} />
      <SkeletonBox width="70%" height="28px" style={{ marginBottom: '8px' }} />
      <SkeletonBox width="50%" height="12px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <SkeletonBox width="30%" height="18px" />
      </div>
      <div style={{ padding: '16px 20px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: i === rows - 1 ? 0 : '16px', alignItems: 'center' }}>
            {Array.from({ length: cols }).map((_, j) => (
              <SkeletonBox key={j} width={`${100 / cols}%`} height="16px" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  SkeletonBox,
  SkeletonCard,
  SkeletonTable,
};
