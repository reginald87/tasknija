export default function Alert({ type = 'info', children, dismissible = false, onDismiss }) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <div className="alert-content">{children}</div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="alert-dismiss"
          aria-label="Dismiss"
          type="button"
        >
          {'\u00D7'}
        </button>
      )}
    </div>
  );
}
