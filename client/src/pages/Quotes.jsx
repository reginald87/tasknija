import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import EmptyState from '../components/common/EmptyState';
import Alert from '../components/common/Alert';
import Loading from '../components/common/Loading';
import { MessageSquare, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function Quotes() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [quotesByConv, setQuotesByConv] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return navigate('/login');
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const convs = await api.get('/conversations');
      if (convs.success) {
        const allConvs = convs.data;
        setConversations(allConvs);
        const quotesMap = {};
        await Promise.all(
          allConvs.map(async (c) => {
            try {
              const qRes = await api.get(`/quotes/conversation/${c.id}`);
              if (qRes.success) quotesMap[c.id] = qRes.data;
            } catch {}
          })
        );
        setQuotesByConv(quotesMap);
      } else {
        setError(convs.error?.message || 'Could not load conversations');
      }
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuoteAction(quoteId, action) {
    try {
      const res = await api.put(`/quotes/${quoteId}/${action}`);
      if (res.success) {
        toast.success(`Quote ${action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'cancelled'}.`);
        loadAll();
      } else {
        toast.error(res.error?.message || `Could not ${action} quote.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `Could not ${action} quote.`);
    }
  }

  const roleBadge = (quote) => {
    if (quote.status === 'accepted') return <CheckCircle size={14} color="#16a34a" />;
    if (quote.status === 'rejected') return <XCircle size={14} color="#dc2626" />;
    if (quote.status === 'cancelled') return <AlertTriangle size={14} color="#f59e0b" />;
    return <Clock size={14} color="#3b82f6" />;
  };

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={22} /> Quotes & Requests
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        View quotes sent by vendors and accept, reject, or cancel them.
      </p>

      {error && <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>}

      {conversations.length === 0 ? (
        <EmptyState icon={<MessageSquare size={40} />} title="No quotes yet" message="Start a conversation with a service provider to request a quote." action={<button onClick={() => navigate('/search')} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}>Find a Provider</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {conversations.map((conv) => {
            const quotes = quotesByConv[conv.id] || [];
            return (
              <div key={conv.id} style={{
                background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{conv.business?.name || 'Conversation'}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: 10 }}>{conv.business?.category?.slug || ''}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{conv.latest_message_at ? new Date(conv.latest_message_at).toLocaleDateString() : ''}</span>
                </div>
                {quotes.length === 0 ? (
                  <div style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No quotes in this conversation yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {quotes.map((q) => (
                      <div key={q.id} style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        flexWrap: 'wrap', gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <strong style={{ fontSize: '0.88rem' }}>{q.title}</strong>
                            {roleBadge(q)}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 6px' }}>{q.description || ''}</p>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>₦{Number(q.amount).toLocaleString()}</div>
                          {q.milestones && q.milestones.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                              {q.milestones.map((m, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{m.description}</span>
                                  <span>₦{Number(m.amount).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {q.status === 'pending' && q.customer_id === user?.id && (
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => handleQuoteAction(q.id, 'accept')} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Accept</button>
                            <button onClick={() => handleQuoteAction(q.id, 'reject')} style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Reject</button>
                          </div>
                        )}
                        {q.status === 'pending' && q.vendor_id === user?.id && (
                          <button onClick={() => handleQuoteAction(q.id, 'cancel')} style={{ padding: '6px 14px', background: 'var(--color-border)', color: 'var(--color-text)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Cancel</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Quotes;
