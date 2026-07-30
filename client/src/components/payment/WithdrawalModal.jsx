import { useState } from 'react';
import api from '../../services/api.js';
import Alert from '../common/Alert.jsx';

export default function WithdrawalModal({ isOpen, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/wallet/withdrawals', {
        amount: Number(amount),
        bankAccount,
        bankCode
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Withdrawal request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Request Withdrawal</h2>
        <form onSubmit={submit}>
          {error && <Alert type="error">{error}</Alert>}
          <label>
            Amount (₦, min 1,000)
            <input type="number" min="1000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required disabled={submitting} />
          </label>
          <label>
            Bank Code
            <input type="text" value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="e.g. 044" required disabled={submitting} />
          </label>
          <label>
            Account Number
            <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="10 digits" required disabled={submitting} />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
