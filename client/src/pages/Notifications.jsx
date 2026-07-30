import { useState, useEffect } from 'react';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Pagination from '../components/common/Pagination.jsx';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/notifications?page=${page}&limit=20`);
      const list = data?.data || [];
      setNotifications(list);
      setTotal(data?.total ?? list.length);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="notifications-page">
      <h1>Notifications</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : !notifications.length ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          message="You'll see account events here."
        />
      ) : (
        <>
          <ul className="notifications-list">
            {notifications.map(n => (
              <li key={n.id} className="notification-item">
                <div className="notification-event">{n.event}</div>
                <div className="notification-time">
                  {new Date(n.sent_at || n.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / 20))}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
