export function Loading({ variant = 'spinner', count = 3, message = 'Loading...' }) {
  if (variant === 'skeleton-card') {
    return (
      <div className="skeleton-list" aria-busy="true" aria-live="polite">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line w-60" />
            <div className="skeleton-line w-90" />
            <div className="skeleton-line w-40" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'skeleton-table') {
    return (
      <div className="skeleton-table" aria-busy="true" aria-live="polite">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-line w-100" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="loading-spinner-wrap" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <span className="sr-only">{message}</span>
    </div>
  );
}

export default Loading;
