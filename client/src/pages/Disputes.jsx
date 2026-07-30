import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolution, setResolution] = useState('resolved_customer');
  const [adminNote, setAdminNote] = useState('');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await api.get(`/disputes?${params.toString()}`);
      const list = data?.data || [];
      setDisputes(list);
      setTotal(data?.total ?? list.length);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const resolve = async () => {
    if (!resolveTarget) return;
    try {
      await api.patch(`/disputes/${resolveTarget.id}/resolve`, {
        resolution,
        admin_note: adminNote,
      });
      toast.success('Dispute resolved.');
      setResolveTarget(null);
      setAdminNote('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="disputes-page">
      <h1>Disputes</h1>
      <select
        value={statusFilter}
        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
      >
        <option value="open">Open</option>
        <option value="under_review">Under review</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
        <option value="all">All</option>
      </select>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !disputes.length ? (
        <EmptyState icon="⚖️" title="No disputes" />
      ) : (
        <>
          <table className="disputes-table">
            <thead>
              <tr>
                <th>Raiser</th>
                <th>Transaction</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.id}>
                  <td>{d.raiser?.full_name || d.raised_by}</td>
                  <td>{String(d.transaction_id).slice(0, 8)}</td>
                  <td>{d.reason}</td>
                  <td><span className={`status status-${d.status}`}>{d.status}</span></td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    {d.status === 'open' && (
                      <button
                        onClick={() => setResolveTarget(d)}
                        className="btn btn-secondary"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / 20))}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmModal
        isOpen={!!resolveTarget}
        onConfirm={resolve}
        onCancel={() => { setResolveTarget(null); setAdminNote(''); }}
        title="Resolve dispute"
        confirmText="Resolve"
      >
        <label style={{ display: 'block', marginBottom: 12 }}>
          Resolution
          <select
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="resolved_customer">Resolved for customer (refund)</option>
            <option value="resolved_vendor">Resolved for vendor (release funds)</option>
            <option value="closed">Closed (no action)</option>
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Admin note
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Optional note..."
            rows={3}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
      </ConfirmModal>
    </div>
  );
}
