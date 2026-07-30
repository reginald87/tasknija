import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ConfirmModal from '../components/common/ConfirmModal';
import AttachmentUpload from '../components/message/AttachmentUpload.jsx';
import { useRealtimeMessages } from '../components/message/RealtimeMessages.jsx';
import {
  Send, Paperclip, Image as ImageIcon, X, User, MoreVertical,
  Clock, CheckCircle, Briefcase, Plus, FileText, DollarSign,
  ThumbsUp, ThumbsDown, AlertCircle, MessageCircle
} from 'lucide-react';

function MessageDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useRealtimeMessages(id, []);
  const [attachment, setAttachment] = useState(null);
  const [projects, setProjects] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [mobileTab, setMobileTab] = useState('messages');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteDesc, setQuoteDesc] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteTerms, setQuoteTerms] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteMilestones, setQuoteMilestones] = useState([{ description: 'Upfront deposit', amount: '' }]);
  const [pendingAcceptQuote, setPendingAcceptQuote] = useState(null);
  const [pendingRejectQuote, setPendingRejectQuote] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchConversation();
      fetchMessages();
      fetchProjects();
      fetchQuotes();
    }
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchConversation() {
    try {
      const res = await api.get(`/conversations/${id}`);
      if (res.success) {
        setConversation(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  }

  async function fetchMessages() {
    try {
      const res = await api.get(`/messages/${id}`);
      if (res && res.success && Array.isArray(res.data)) {
        setMessages(res.data);
      } else if (Array.isArray(res)) {
        setMessages(res);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      const res = await api.get(`/work-projects/conversation/${id}`);
      if (res.success) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }

  async function fetchQuotes() {
    try {
      const res = await api.get(`/quotes/conversation/${id}`);
      if (res.success) setQuotes(res.data);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    }
  }

  function resetQuoteForm() {
    setQuoteTitle(''); setQuoteDesc(''); setQuoteAmount(''); setQuoteTerms('');
    setQuoteMilestones([{ description: 'Upfront deposit', amount: '' }]);
    setQuoteError('');
  }

  async function handleSendQuote(e) {
    e.preventDefault(); setQuoteError('');
    if (!quoteTitle.trim() || !quoteAmount) { setQuoteError('Title and amount are required'); return; }
    setQuoteLoading(true);
    try {
      const validMilestones = quoteMilestones
        .filter(m => m.description.trim() && parseFloat(m.amount) > 0)
        .map(m => ({ description: m.description, amount: parseFloat(m.amount) }));

      const payload = {
        conversationId: id,
        title: quoteTitle,
        description: quoteDesc,
        amount: parseFloat(quoteAmount),
        terms: quoteTerms,
      };
      if (validMilestones.length >= 1) {
        payload.milestones = validMilestones;
        payload.amount = validMilestones.reduce((sum, m) => sum + m.amount, 0);
      }

      const res = await api.post('/quotes', payload);
      if (res.success) {
        setQuotes([...quotes, res.data]);
        setShowQuoteModal(false);
        resetQuoteForm();
      } else setQuoteError(res.error);
    } catch (err) {
      setQuoteError(err.response?.data?.error || err.message);
    } finally { setQuoteLoading(false); }
  }

  async function handleAcceptQuote(quoteId) {
    const q = quotes.find(q => q.id === quoteId);
    try {
      const res = await api.put(`/quotes/${quoteId}/accept`);
      if (res.success) {
        toast.success('Quote accepted.');
        fetchQuotes();
        fetchMessages();
      } else {
        toast.error(res.error || 'Failed to accept quote.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to accept quote.');
    }
    setPendingAcceptQuote(null);
  }

  async function handleRejectQuote(quoteId) {
    try {
      const res = await api.put(`/quotes/${quoteId}/reject`);
      if (res.success) {
        toast.success('Quote rejected.');
        fetchQuotes();
        fetchMessages();
      } else {
        toast.error(res.error || 'Failed to reject quote.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to reject quote.');
    }
    setPendingRejectQuote(null);
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() && !attachment) return;

    // Optimistic insert (review #2.8)
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content: messageText,
      sender_id: user.id,
      conversation_id: id,
      created_at: new Date().toISOString(),
      attachments: attachment ? [attachment] : [],
      status: 'sending'
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setSending(true);
    try {
      const res = await api.post(`/messages/${id}`, {
        content: messageText,
        messageType: 'text',
        attachments: attachment ? [attachment] : []
      });
      const serverMsg = (res && (res.data || res)) || {};
      // Replace optimistic with server response
      setMessages(prev => prev.map(m => m.id === tempId ? { ...serverMsg, status: 'sent' } : m));
      setMessageText('');
      setAttachment(null);
      toast.success('Message sent.');
    } catch (err) {
      // Mark as failed (still visible in UI for retry)
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      console.error('Failed to send message:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      const res = await api.post(`/work-projects/conversation/${id}`, {
        title: projectTitle,
        description: projectDescription,
      });
      if (res.success) {
        setProjects([...projects, res.data]);
        setShowProjectModal(false);
        setProjectTitle('');
        setProjectDescription('');
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }

  function scrollToBottom() {
    const list = messagesListRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  if (loading) {
    return (
      <div className="message-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="message-detail-error">
        <p>Conversation not found</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  const otherUser = conversation.customer_id === user.id ? conversation.vendor : conversation.customer;

  return (
    <div className="message-detail">
      {/* Mobile-only pane switcher (hidden on desktop via CSS) */}
      <div className="mobile-message-tabs">
        <button
          type="button"
          className={mobileTab === 'projects' ? 'active' : ''}
          onClick={() => setMobileTab('projects')}
        >
          Projects
        </button>
        <button
          type="button"
          className={mobileTab === 'quotes' ? 'active' : ''}
          onClick={() => setMobileTab('quotes')}
        >
          Quotes
        </button>
        <button
          type="button"
          className={mobileTab === 'messages' ? 'active' : ''}
          onClick={() => setMobileTab('messages')}
        >
          Messages
        </button>
      </div>

      <div className="message-header">
        <div className="message-header-left">
          <Link to="/dashboard" className="back-link">
            ← Back
          </Link>
          <div className="message-partner">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt={otherUser.full_name} />
            ) : (
              <div className="avatar-placeholder">
                <User size={24} />
              </div>
            )}
            <div className="partner-info">
              <h2>{otherUser?.full_name || 'Service Provider'}</h2>
              <p>{conversation.business?.name}</p>
            </div>
          </div>
        </div>
        <div className="message-header-actions">
          {profile?.role === 'vendor' && (
            <button
              className="btn-secondary"
              onClick={() => setShowQuoteModal(true)}
              style={{ marginRight: 8 }}
            >
              <FileText size={16} />
              Send Quote
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => setShowProjectModal(true)}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      <div className="message-body">
        <div className="projects-panel" data-mobile-tab="projects" data-active={mobileTab === 'projects'}>
          <div className="projects-header">
            <h3>
              <Briefcase size={18} />
              Active Projects
            </h3>
          </div>
          {projects.length === 0 ? (
            <div className="no-projects">
              <p>No active projects</p>
              <button
                className="btn-text"
                onClick={() => setShowProjectModal(true)}
              >
                Create one
              </button>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h4>{project.title}</h4>
                    <span className={`project-status ${project.status}`}>
                      {project.status === 'completed' ? (
                        <CheckCircle size={14} />
                      ) : project.status === 'in_progress' ? (
                        <Clock size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  {project.description && (
                    <p className="project-description">{project.description}</p>
                  )}
                  <div className="project-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="progress-text">{project.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="quotes-panel" data-mobile-tab="quotes" data-active={mobileTab === 'quotes'}>
          <div className="quotes-header">
            <h3>
              <FileText size={18} />
              Quotes
            </h3>
          </div>
          {quotes.length === 0 ? (
            <div className="no-quotes">
              <p>No quotes yet</p>
              {profile?.role === 'vendor' && (
                <button className="btn-text" onClick={() => setShowQuoteModal(true)}>Send one</button>
              )}
            </div>
          ) : (
            <div className="quotes-list">
              {quotes.map((q) => {
                const isPending = q.status === 'pending';
                const isAccepted = q.status === 'accepted';
                const isRejected = q.status === 'rejected';
                const isCustomer = profile?.role === 'user';
                return (
                  <div key={q.id} className={`quote-card quote-${q.status}`}>
                    <div className="quote-card-header">
                      <h4>{q.title}</h4>
                      <span className={`quote-status-badge ${q.status}`}>{q.status}</span>
                    </div>
                    {q.description && <p className="quote-description">{q.description}</p>}
                    <div className="quote-amount">
                      <DollarSign size={16} />
                      <strong>₦{parseFloat(q.amount).toLocaleString()}</strong>
                    </div>
                    {q.milestones && q.milestones.length > 0 && (
                      <div className="quote-milestones" style={{ marginTop: 8, padding: 8, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                        <strong>Payment Milestones:</strong>
                        {q.milestones.map((m, mi) => (
                          <div key={mi} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>{m.description}</span>
                            <span>₦{parseFloat(m.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.terms && (
                      <div className="quote-terms">
                        <strong>Terms:</strong>
                        <p>{q.terms}</p>
                      </div>
                    )}
                    {isPending && isCustomer && (
                      <div className="quote-actions">
                        <button className="btn-accept" onClick={() => setPendingAcceptQuote(q)}>
                          <ThumbsUp size={16} /> Accept & Pay
                        </button>
                        <button className="btn-reject" onClick={() => setPendingRejectQuote(q)}>
                          <ThumbsDown size={16} /> Reject
                        </button>
                      </div>
                    )}
                    {isPending && profile?.role === 'vendor' && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                        Waiting for customer to respond...
                      </p>
                    )}
                    {isAccepted && <p style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: 8 }}>✅ Accepted — Escrow created</p>}
                    {isRejected && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 8 }}>❌ Rejected by customer</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="messages-panel" data-mobile-tab="messages" data-active={mobileTab === 'messages'}>
          <div className="messages-list" ref={messagesListRef}>
            {messages.length === 0 ? (
              <div className="no-messages">
                <MessageCircle size={48} />
                <p>No messages yet</p>
                <p>Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user.id;
                const statusClass = msg.status ? ` message-${msg.status}` : '';
                return (
                  <div
                    key={msg.id}
                    className={`message-bubble ${isOwn ? 'own' : 'other'}${statusClass}`}
                  >
                    <div className="message-avatar">
                      {msg.sender?.avatar_url ? (
                        <img src={msg.sender.avatar_url} alt={msg.sender.full_name} />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className="message-content">
                      {msg.content && <p>{msg.content}</p>}
                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                        <div className="message-attachments">
                          {msg.attachments.map((a) => (
                            <a
                              key={a.file_id}
                              href={`/api/files/${a.file_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="message-attachment-link"
                            >
                              📎 {a.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.status === 'sending' && (
                        <span className="message-status" aria-live="polite">Sending...</span>
                      )}
                      {msg.status === 'failed' && (
                        <span className="message-status message-status-failed" role="alert">Failed — click to retry</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="message-input-form" onSubmit={handleSendMessage}>
            {attachment && (
              <div className="attachment-preview">
                <Paperclip size={14} />
                <span className="attachment-name">{attachment.name}</span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => setAttachment(null)}
                  aria-label="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="composer-row">
              <AttachmentUpload onUploaded={setAttachment} />
              <input
                type="text"
                className="composer-input"
                placeholder="Type a message…"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
              />
              <button type="submit" className="send-btn" disabled={sending || (!messageText.trim() && !attachment)} aria-label="Send message">
                {sending ? (
                  <div className="sending-spinner"></div>
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {pendingAcceptQuote && (() => {
        const q = pendingAcceptQuote;
        const hasMilestones = q?.milestones && q.milestones.length > 0;
        const milestoneList = hasMilestones
          ? `\n\nMilestones:\n${q.milestones.map((m, i) => `${i + 1}. ${m.description}: ₦${Number(m.amount).toLocaleString()}`).join('\n')}`
          : '';
        return (
          <ConfirmModal
            isOpen={!!pendingAcceptQuote}
            title="Accept this quote?"
            message={hasMilestones
              ? `Accept this quote with milestones?\n\nTotal: ₦${Number(q.amount).toLocaleString()}${milestoneList}\n\nFirst milestone will be paid upfront to vendor.`
              : 'Accept this quote? This will create an escrow transaction and deduct from your wallet.'}
            confirmText="Accept & Pay"
            variant="default"
            onCancel={() => setPendingAcceptQuote(null)}
            onConfirm={() => handleAcceptQuote(q.id)}
          />
        );
      })()}
      {pendingRejectQuote && (
        <ConfirmModal
          isOpen={!!pendingRejectQuote}
          title="Reject this quote?"
          message="Are you sure you want to reject this quote? You can always ask for a revised quote afterwards."
          confirmText="Reject"
          variant="danger"
          onCancel={() => setPendingRejectQuote(null)}
          onConfirm={() => handleRejectQuote(pendingRejectQuote.id)}
        />
      )}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button onClick={() => setShowProjectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                  placeholder="e.g., Kitchen Renovation"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe the work to be done..."
                  rows={4}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowProjectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuoteModal && (
        <div className="modal-overlay" onClick={() => setShowQuoteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Quote to Customer</h3>
              <button onClick={() => setShowQuoteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSendQuote}>
              {quoteError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 8 }}>{quoteError}</p>}
              <div className="form-group">
                <label>Service Title *</label>
                <input
                  type="text"
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                  required
                  placeholder="e.g., Kitchen Pipe Repair"
                />
              </div>
              <div className="form-group">
                <label>Scope of Work</label>
                <textarea
                  value={quoteDesc}
                  onChange={(e) => setQuoteDesc(e.target.value)}
                  placeholder="Describe exactly what the work entails..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Amount (₦) *</label>
                <input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  required
                  min="1"
                  step="0.01"
                  placeholder="10000"
                />
              </div>

              {/* Milestone Payment Splits */}
              <div className="form-group">
                <label>Payment Milestones (split into installments)</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
                  Define how payment is split. The first milestone is paid upfront to start work.
                </p>
                {quoteMilestones.map((ms, mi) => (
                  <div key={mi} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Description (e.g. Upfront deposit)"
                      value={ms.description}
                      onChange={(e) => {
                        const copy = [...quoteMilestones];
                        copy[mi].description = e.target.value;
                        setQuoteMilestones(copy);
                      }}
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={ms.amount}
                      onChange={(e) => {
                        const copy = [...quoteMilestones];
                        copy[mi].amount = e.target.value;
                        setQuoteMilestones(copy);
                      }}
                      min="0"
                      style={{ width: 120, padding: '6px 8px', fontSize: '0.82rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
                    />
                    {quoteMilestones.length > 1 && (
                      <button type="button" onClick={() => setQuoteMilestones(prev => prev.filter((_, i) => i !== mi))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setQuoteMilestones(prev => [...prev, { description: '', amount: '' }])} style={{ fontSize: '0.8rem', background: 'none', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', cursor: 'pointer', marginTop: 4 }}>
                  + Add Milestone
                </button>
                {quoteMilestones.filter(m => m.description.trim() && parseFloat(m.amount) > 0).length > 0 && (
                  <p style={{ fontSize: '0.8rem', marginTop: 6, color: 'var(--color-text-muted)' }}>
                    Total from milestones: ₦{quoteMilestones.filter(m => m.description.trim() && parseFloat(m.amount) > 0).reduce((s, m) => s + parseFloat(m.amount), 0).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Terms & Disclaimers</label>
                <textarea
                  value={quoteTerms}
                  onChange={(e) => setQuoteTerms(e.target.value)}
                  placeholder="Warranty period, what's covered, exclusions, etc."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowQuoteModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={quoteLoading}>
                  {quoteLoading ? 'Sending...' : 'Send Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageDetail;
