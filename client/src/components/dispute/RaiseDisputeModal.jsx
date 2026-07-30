import { useState } from 'react';
import api from '../../services/api.js';
import Alert from '../common/Alert.jsx';

export default function RaiseDisputeModal({ isOpen, onClose, transactionId, onSuccess }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (reason.length < 10) { setError('Reason must be at least 10 characters.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      // Match existing API contract from chunk 11a/12b
      await api.post('/disputes', {
        transactionId,
        reason,
        description
      });
      onSuccess?.();
      onClose();
      setReason('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Dispute submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Raise a Dispute</h2>
        <form onSubmit={submit}>
          {error && <Alert type="error">{error}</Alert>}
          <label>
            Reason (min 10 chars)*
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} required disabled={submitting} />
          </label>
          <label>
            Description (optional)
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={submitting} />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
