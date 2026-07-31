export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-modal-title">{title}</h2>
        {message && <p>{message}</p>}
        <div className="modal-actions">
          <button onClick={onCancel} className="btn btn-secondary">{cancelText}</button>
          <button
            onClick={onConfirm}
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Promise-based helper for ad-hoc confirmation. Falls back to window.confirm
 * so it works before the modal manager pattern lands in chunk 11a.
 */
export function confirmModal({ title, message, _confirmText, _variant } = {}) {
  console.warn('confirmModal: using window.confirm fallback. Use <ConfirmModal /> for styled UI.');
  return Promise.resolve(window.confirm(`${title ? title + '\n\n' : ''}${message || 'Are you sure?'}`));
}
