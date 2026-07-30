import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolution, setResolution] = useState('resolved');
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await api.get(`/admin/reports?${params.toString()}`);
      const list = data?.data || [];
      setReports(list);
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
      await api.patch(`/admin/reports/${resolveTarget.id}`, {
        action: resolution,
        admin_note: 'Resolved by admin',
      });
      toast.success('Report resolved.');
      setResolveTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="reports-page">
      <h1>Reports</h1>
      <select
        value={statusFilter}
        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
      >
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
        <option value="all">All</option>
      </select>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !reports.length ? (
        <EmptyState icon="📋" title="No reports" />
      ) : (
        <>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{r.reporter?.full_name || r.reporter_id}</td>
                  <td>{r.target_type}: {String(r.target_id).slice(0, 8)}</td>
                  <td>{r.reason}</td>
                  <td><span className={`status status-${r.status}`}>{r.status}</span></td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'open' && (
                      <button
                        onClick={() => setResolveTarget(r)}
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
        onCancel={() => setResolveTarget(null)}
        title="Resolve report"
        message={`Mark as ${resolution}?`}
      >
        <label style={{ display: 'block', marginBottom: 12 }}>
          Resolution
          <select
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
      </ConfirmModal>
    </div>
  );
}
