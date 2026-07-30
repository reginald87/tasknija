import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Endpoint may not exist on older backends; fall back gracefully
      const data = await api.get(`/transactions/${id}`).catch(() => null);
      const txData = data?.data;
      if (!txData) {
        setError(new Error('Transaction not found.'));
      } else {
        setTx(txData);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const cancel = async () => {
    try {
      await api.post(`/transactions/${id}/cancel`);
      toast.success('Transaction cancelled.');
      setShowCancel(false);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel transaction');
    }
  };

  const raiseDispute = async () => {
    if (disputeReason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters.');
      return;
    }
    setDisputeSubmitting(true);
    try {
      await api.post('/disputes', {
        transactionId: id,
        reason: disputeReason,
        description: disputeDescription
      });
      toast.success('Dispute raised.');
      setShowDispute(false);
      setDisputeReason('');
      setDisputeDescription('');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to raise dispute');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const isCustomer = tx?.customer_id === profile?.id;
  const isVendor = tx?.vendor_id === profile?.id;
  const isParticipant = isCustomer || isVendor;
  const canCancel = isCustomer && ['escrow', 'pending'].includes(tx?.status);
  const canDispute = isParticipant && ['escrow', 'completed'].includes(tx?.status);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={load} />;
  if (!tx) return <ErrorState message="Transaction not found." />;

  const escrowStates = ['escrow', 'pending'];
  const moneyHeld = escrowStates.includes(tx.status) || (tx.milestones || []).some(m => m.status === 'held');
  const moneyReleased = tx.status === 'completed' || (tx.milestones || []).some(m => m.status === 'released');

  const escrowBanner = (() => {
    if (moneyHeld && !moneyReleased) {
      return {
        tone: 'warn',
        text: 'Your payment is held in escrow and only released to the vendor when you confirm the work is done. Funds cannot be withdrawn by the vendor until then.',
      };
    }
    if (moneyReleased) {
      return {
        tone: 'ok',
        text: 'Funds have been released from escrow to the vendor. If something is wrong, you can still raise a dispute.',
      };
    }
    if (tx.status === 'cancelled') {
      return {
        tone: 'muted',
        text: 'This transaction was cancelled. Any held milestone funds are refunded to your wallet.',
      };
    }
    return {
      tone: 'muted',
      text: 'No money is held yet. Payment is placed in escrow when the work begins.',
    };
  })();

  return (
    <div className="transaction-detail">
      <h1>Transaction Details</h1>

      <div className={`escrow-banner escrow-banner-${escrowBanner.tone}`} role="status" style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 'var(--radius)',
        marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.4,
        background: escrowBanner.tone === 'warn' ? 'rgba(245,158,11,0.12)' : escrowBanner.tone === 'ok' ? 'rgba(16,185,129,0.12)' : 'var(--color-surface)',
        border: `1px solid ${escrowBanner.tone === 'warn' ? 'rgba(245,158,11,0.4)' : escrowBanner.tone === 'ok' ? 'rgba(16,185,129,0.4)' : 'var(--color-border)'}`,
      }}>
        <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>{escrowBanner.tone === 'warn' ? '🔒' : escrowBanner.tone === 'ok' ? '✅' : '💡'}</span>
        <span>{escrowBanner.text}</span>
      </div>

      <section className="tx-info">
        <div><strong>ID:</strong> {tx.id}</div>
        <div><strong>Amount:</strong> ₦{Number(tx.amount).toFixed(2)}</div>
        <div><strong>Status:</strong> {tx.status}</div>
        <div><strong>Created:</strong> {new Date(tx.created_at).toLocaleString()}</div>
      </section>

      <section className="tx-milestones">
        <h2>Milestones</h2>
        {tx.milestones?.length ? (
          <ul className="milestone-list">
            {tx.milestones.map(m => (
              <li key={m.id} className={`milestone milestone-${m.status}`}>
                <span className="milestone-status">{m.status}</span>
                <span className="milestone-amount">₦{Number(m.amount).toFixed(2)}</span>
                <span className="milestone-dates">
                  {m.held_at && `Held: ${new Date(m.held_at).toLocaleDateString()}`}
                  {m.completed_at && `Completed: ${new Date(m.completed_at).toLocaleDateString()}`}
                  {m.released_at && `Released: ${new Date(m.released_at).toLocaleDateString()}`}
                </span>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon="💰" title="No milestones" message="Single payment, no milestones." />}
      </section>

      <section className="tx-actions">
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
        {canCancel && (
          <button onClick={() => setShowCancel(true)} className="btn btn-danger">Cancel Transaction</button>
        )}
        {canDispute && (
          <button onClick={() => setShowDispute(true)} className="btn btn-secondary">Raise Dispute</button>
        )}
      </section>

      <ConfirmModal
        isOpen={showCancel}
        onConfirm={cancel}
        onCancel={() => setShowCancel(false)}
        title="Cancel transaction?"
        message="Held milestone funds will be refunded to your wallet. Released funds cannot be refunded."
        confirmText="Cancel transaction"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDispute}
        onConfirm={raiseDispute}
        onCancel={() => { if (!disputeSubmitting) setShowDispute(false); }}
        title="Raise a dispute"
        confirmText="Submit dispute"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <label>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Reason (min 10 characters)</span>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Description (optional)</span>
            <textarea
              value={disputeDescription}
              onChange={e => setDisputeDescription(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
            />
          </label>
        </div>
      </ConfirmModal>
    </div>
  );
}
