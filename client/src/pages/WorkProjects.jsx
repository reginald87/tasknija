import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import EmptyState from '../components/common/EmptyState';
import Alert from '../components/common/Alert';
import Loading from '../components/common/Loading';
import { Briefcase, ChevronRight, ChevronDown, Clock, Loader, CheckCircle2, XCircle } from 'lucide-react';

function WorkProjects() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [projectsByConv, setProjectsByConv] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedConv, setExpandedConv] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [newTitle, setNewTitle] = useState({});
  const [newDesc, setNewDesc] = useState({});

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
        setConversations(convs.data);
        const projMap = {};
        await Promise.all(
          convs.data.map(async (c) => {
            try {
              const pRes = await api.get(`/work-projects/conversation/${c.id}`);
              if (pRes.success) projMap[c.id] = pRes.data;
            } catch {}
          })
        );
        setProjectsByConv(projMap);
      } else {
        setError(convs.error?.message || 'Could not load conversations');
      }
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(conversationId) {
    const title = newTitle[conversationId]?.trim();
    if (!title) { toast.error('Project title is required.'); return; }
    setSubmitting(conversationId);
    try {
      const res = await api.post(`/work-projects/conversation/${conversationId}`, { title, description: newDesc[conversationId] || '' });
      if (res.success) {
        toast.success('Project created.');
        setNewTitle((prev) => ({ ...prev, [conversationId]: '' }));
        setNewDesc((prev) => ({ ...prev, [conversationId]: '' }));
        loadAll();
      } else {
        toast.error(res.error?.message || 'Could not create project.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create project.');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleUpdateStatus(projectId, status) {
    try {
      const res = await api.put(`/work-projects/${projectId}`, { status });
      if (res.success) {
        toast.success(`Project marked as ${status}.`);
        loadAll();
      } else {
        toast.error(res.error?.message || 'Could not update project.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update project.');
    }
  }

  const statusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 size={14} color="#16a34a" />;
    if (status === 'cancelled') return <XCircle size={14} color="#dc2626" />;
    return <Clock size={14} color="#3b82f6" />;
  };

  if (loading) return <Loading />;

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Briefcase size={22} /> Work Projects
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Track work progress with milestones, updates, and status.
      </p>

      {error && <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>}

      {conversations.length === 0 ? (
        <EmptyState icon={<Briefcase size={40} />} title="No projects yet" message="Start a conversation with a provider to initiate a work project." action={<button onClick={() => navigate('/search')} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}>Find a Provider</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {conversations.map((conv) => {
            const projects = projectsByConv[conv.id] || [];
            const isExpanded = expandedConv === conv.id;
            return (
              <div key={conv.id} style={{
                background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setExpandedConv(isExpanded ? null : conv.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Briefcase size={18} color="var(--color-primary)" />
                    <strong style={{ fontSize: '0.9rem' }}>{conv.business?.name || 'Conversation'}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 20px 16px' }}>
                    {projects.length === 0 ? (
                      <div style={{ padding: '12px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No projects yet for this conversation.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                        {projects.map((p) => (
                          <div key={p.id} style={{
                            padding: '12px 16px', background: 'var(--color-bg)',
                            borderRadius: 'var(--radius)', border: '1px solid var(--color-border)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <strong style={{ fontSize: '0.88rem' }}>{p.title}</strong>
                                  {statusIcon(p.status)}
                                </div>
                                {p.description && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 6px' }}>{p.description}</p>}
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                  Status: <strong style={{ textTransform: 'capitalize' }}>{p.status || 'pending'}</strong>
                                  {' · '}Updated: {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {p.status !== 'completed' && (
                                  <button onClick={() => handleUpdateStatus(p.id, 'completed')} style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Complete</button>
                                )}
                                {p.status !== 'cancelled' && p.status !== 'completed' && (
                                  <button onClick={() => handleUpdateStatus(p.id, 'cancelled')} style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Cancel</button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <input placeholder="New project title" value={newTitle[conv.id] || ''} onChange={(e) => setNewTitle((prev) => ({ ...prev, [conv.id]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '0.82rem', background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <input placeholder="Description (optional)" value={newDesc[conv.id] || ''} onChange={(e) => setNewDesc((prev) => ({ ...prev, [conv.id]: e.target.value }))} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '0.82rem', background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }} />
                      </div>
                      <button onClick={() => handleCreateProject(conv.id)} disabled={submitting === conv.id} style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {submitting === conv.id ? <Loader size={14} className="spin" /> : 'Add Project'}
                      </button>
                    </div>
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

export default WorkProjects;
