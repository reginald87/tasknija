import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import FundWalletModal from '../components/payment/FundWalletModal';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  LayoutDashboard, MessageCircle, DollarSign, Briefcase, Clock, CheckCircle,
  AlertCircle, Plus, Search, ChevronRight, User, ShieldAlert, X, Loader,
  Heart, Menu, Wallet, Star,
} from 'lucide-react';

const statusColors = {
  escrow: '#3b82f6', completed: '#16a34a', released: '#059669',
  cancelled: '#6b7280', disputed: '#dc2626', pending: '#f59e0b',
};

const SIDEBAR_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'transactions', label: 'Transactions', icon: DollarSign },
  { key: 'projects', label: 'Projects', icon: Briefcase },
];

const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', padding: '20px 24px',
};

const btnPrimary = {
  padding: '10px 20px', background: 'var(--color-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600,
  fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: 8,
  transition: 'all 0.2s',
};

const btnOutline = {
  padding: '8px 16px', background: 'transparent', color: 'var(--color-text)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer',
  fontWeight: 500, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
  transition: 'all 0.2s',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius)',
          background: `${color}15`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text)' }}>{value}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function CustomerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [activeSection, isMobile]);

  const [conversations, setConversations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTx, setDisputeTx] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState('');
  const [cancelTx, setCancelTx] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [milestonesMap, setMilestonesMap] = useState({});
  const [expandedTx, setExpandedTx] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [confirmMilestone, setConfirmMilestone] = useState(null);

  async function fetchMilestones(txId) {
    try {
      const res = await api.get(`/transactions/${txId}/milestones`);
      if (res.success) setMilestonesMap(prev => ({ ...prev, [txId]: res.data }));
    } catch {}
  }

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchTransactions();
      fetchWallet();
    }
  }, [user]);

  async function fetchWallet() {
    try {
      const res = await api.get('/payments/wallet');
      if (res.success) setWallet(res.data);
    } catch {}
  }

  async function fetchConversations() {
    try {
      const res = await api.get('/conversations');
      if (res.success) setConversations(res.data);
    } catch (err) { console.error('Failed to fetch conversations:', err);
    } finally { setLoading(false); }
  }

  async function fetchTransactions() {
    try {
      const res = await api.get('/transactions/my');
      if (res.success) setTransactions(res.data);
    } catch (err) { console.error('Failed to fetch transactions:', err); }
  }

  async function handleRaiseDispute(e) {
    e.preventDefault();
    setDisputeError('');
    setDisputeLoading(true);
    try {
      const res = await api.post('/disputes', { transactionId: disputeTx.id, reason: disputeReason, description: disputeDesc });
      if (res.success) {
        setShowDisputeModal(false);
        setDisputeTx(null);
        setDisputeReason('');
        setDisputeDesc('');
        toast.success('Dispute submitted.');
        fetchTransactions();
      } else {
        const m = res.error || 'Failed to raise dispute';
        setDisputeError(m);
        toast.error(m);
      }
    } catch (err) {
      const m = err.response?.data?.error || 'Failed to raise dispute';
      setDisputeError(m);
      toast.error(m);
    }
    setDisputeLoading(false);
  }

  async function handleConfirmMilestone(ms) {
    if (!confirmMilestone) return;
    try {
      const res = await api.put(`/transactions/${confirmMilestone.txId}/milestones/${ms.id}/confirm`);
      if (res.success) {
        toast.success(`Milestone "${ms.description}" confirmed.`);
        fetchMilestones(confirmMilestone.txId);
        fetchTransactions();
      } else {
        toast.error(res.error?.message || 'Failed to confirm milestone');
      }
    } catch (err) {
      toast.error('Failed to confirm milestone');
    }
    setConfirmMilestone(null);
  }

  async function handleCancelTx() {
    if (!cancelTx) return;
    setCancelLoading(true);
    try {
      await api.post(`/transactions/${cancelTx.id}/cancel`);
      toast.success('Transaction cancelled.');
      setCancelTx(null);
      fetchTransactions();
      fetchWallet();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel transaction');
    } finally {
      setCancelLoading(false);
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const businessName = conv.business?.name?.toLowerCase() || '';
    const vendorName = conv.vendor?.full_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return businessName.includes(query) || vendorName.includes(query);
  });

  const activeTransactions = transactions.filter(tx => tx.status !== 'cancelled' && tx.status !== 'released');
  const myTransactions = transactions.filter(tx => tx.customer_id === user.id);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loading />
      </div>
    );
  }

  const sidebar = (
    <aside style={{
      width: isMobile ? 260 : 240, flexShrink: 0,
      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)', padding: '16px 0',
      display: 'flex', flexDirection: 'column', alignSelf: 'flex-start',
      position: isMobile ? 'fixed' : 'static',
      top: isMobile ? 0 : 'auto', left: isMobile ? 0 : 'auto',
      bottom: isMobile ? 0 : 'auto', zIndex: isMobile ? 1000 : 'auto',
      transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      boxShadow: isMobile && sidebarOpen ? '0 20px 60px rgba(0,0,0,0.15)' : 'none',
      overflowY: 'auto',
    }}>
      <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-muted)' }}>
          Customer Menu
        </div>
      </div>
      {SIDEBAR_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = activeSection === item.key;
        return (
          <button
            key={item.key}
            onClick={() => { setActiveSection(item.key); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: '11px 16px', border: 'none', background: isActive ? 'var(--color-primary-light)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: isActive ? 600 : 500, fontSize: '0.88rem', cursor: 'pointer',
              borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={18} style={{ flexShrink: 0, color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            {item.label}
          </button>
        );
      })}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 8, paddingTop: 8 }}>
        <button
          onClick={() => navigate('/favorites')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
            padding: '11px 16px', border: 'none', background: 'transparent',
            color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer',
            borderLeft: '3px solid transparent', transition: 'all 0.15s',
          }}
        >
          <Heart size={18} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
          Favorites
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '24px 16px' }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999,
        }} />
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {!isMobile && sidebar}
        {isMobile && (
          <button onClick={() => setSidebarOpen(true)} style={{
            ...btnOutline, padding: '8px 12px', marginBottom: 8, position: 'fixed',
            top: 76, left: 12, zIndex: 50, background: 'var(--color-surface)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <Menu size={18} />
          </button>
        )}
        {isMobile && sidebar}

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Welcome, {profile?.full_name || 'Customer'}!</h1>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Manage your conversations, transactions, and work progress
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '8px 16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>₦{Number(wallet?.balance || 0).toLocaleString()}</span>
                </div>
                <button style={btnPrimary} onClick={() => setShowFundModal(true)}>
                  <Plus size={16} /> Fund Wallet
                </button>
                <Link to="/search" style={{ ...btnOutline, textDecoration: 'none' }}>
                  <Search size={16} /> Find Services
                </Link>
              </div>
            </div>
          </div>

          {/* Overview */}
          {activeSection === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard icon={Wallet} label="Wallet Balance" value={`₦${Number(wallet?.balance || 0).toLocaleString()}`} color="#3b82f6" />
                <StatCard icon={MessageCircle} label="Conversations" value={conversations.length} color="#8b5cf6" />
                <StatCard icon={DollarSign} label="Transactions" value={myTransactions.length} color="#16a34a" />
                <StatCard icon={Briefcase} label="Active Projects" value={activeTransactions.length} color="#f59e0b" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Conversations</h3>
                    <button onClick={() => setActiveSection('messages')} style={{ ...btnOutline, padding: '4px 10px', fontSize: '0.78rem' }}>
                      View All
                    </button>
                  </div>
                  {conversations.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No conversations yet</p>
                  ) : (
                    <div>
                      {conversations.slice(0, 5).map(conv => (
                        <Link key={conv.id} to={`/messages/${conv.id}`} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: '1px solid var(--color-border)', textDecoration: 'none',
                          color: 'var(--color-text)', fontSize: '0.85rem',
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: 'var(--color-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {conv.vendor?.avatar_url ? (
                              <img src={conv.vendor.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : <User size={16} />}
                          </div>
                          <span style={{ flex: 1 }}>{conv.vendor?.full_name || 'Service Provider'}</span>
                          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Transactions</h3>
                    <button onClick={() => setActiveSection('transactions')} style={{ ...btnOutline, padding: '4px 10px', fontSize: '0.78rem' }}>
                      View All
                    </button>
                  </div>
                  {myTransactions.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No transactions yet</p>
                  ) : (
                    <div>
                      {myTransactions.slice(0, 5).map(tx => (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{tx.business?.name || 'Service'}</div>
                            <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: 8, background: statusColors[tx.status] + '20', color: statusColors[tx.status], fontWeight: 600 }}>
                              {tx.status}
                            </span>
                          </div>
                          <span style={{ fontWeight: 700 }}>₦{Number(tx.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {activeSection === 'messages' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Messages</h2>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="text" placeholder="Search conversations..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 12px 8px 32px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '0.85rem', width: 220, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }}
                  />
                </div>
              </div>
              {filteredConversations.length === 0 ? (
                <EmptyState icon={<MessageCircle size={48} />} title="No conversations yet" message="Start a conversation with a service provider to track your work" action={<Link to="/search" style={btnPrimary}><Search size={16} /> Find Service Providers</Link>} />
              ) : (
                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  {filteredConversations.map((conv) => (
                    <Link key={conv.id} to={`/messages/${conv.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      borderBottom: '1px solid var(--color-border)', textDecoration: 'none',
                      color: 'var(--color-text)', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: 'var(--color-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                      }}>
                        {conv.vendor?.avatar_url ? <img src={conv.vendor.avatar_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} /> : <User size={20} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{conv.vendor?.full_name || 'Service Provider'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(conv.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{conv.business?.name}</div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transactions */}
          {activeSection === 'transactions' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Transactions</h2>
              {myTransactions.length === 0 ? (
                <EmptyState icon={<DollarSign size={48} />} title="No transactions yet" message="When you hire a service provider, your transactions will appear here" action={<Link to="/search" style={btnPrimary}><Search size={16} /> Find Service Providers</Link>} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myTransactions.map((tx) => (
                    <div key={tx.id} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>{tx.business?.name || 'Service'}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            {tx.customer_id === user.id ? `To: ${tx.vendor?.full_name || 'Vendor'}` : `From: ${tx.customer?.full_name || 'Customer'}`}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>₦{Number(tx.amount).toLocaleString()}</span>
                          <br />
                          <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: statusColors[tx.status] + '20', color: statusColors[tx.status], fontWeight: 600 }}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <Clock size={14} />
                        <span>{new Date(tx.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>

                      {/* Pending confirmation badge */}
                      {milestonesMap[tx.id] && milestonesMap[tx.id].some(m => m.status === 'completed') && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: '#f59e0b20', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> Pending confirmation
                          </span>
                        </div>
                      )}

                      {/* Milestones toggle */}
                      <button
                        onClick={() => {
                          if (expandedTx === tx.id) { setExpandedTx(null); return; }
                          setExpandedTx(tx.id);
                          if (!milestonesMap[tx.id]) fetchMilestones(tx.id);
                        }}
                        style={{ marginTop: 8, ...btnOutline, padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        <DollarSign size={12} /> {expandedTx === tx.id ? 'Hide Milestones' : 'View Milestones'}
                      </button>
                      {expandedTx === tx.id && milestonesMap[tx.id] && (
                        <div style={{ marginTop: 8, padding: 10, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                          <strong style={{ fontSize: '0.8rem' }}>Payment Milestones</strong>
                          {milestonesMap[tx.id].length === 0 && <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No milestones (single payment)</p>}
                          {milestonesMap[tx.id].map((ms, mi) => (
                            <div key={ms.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: mi < milestonesMap[tx.id].length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ms.status === 'released' ? '#16a34a' : ms.status === 'completed' ? '#f59e0b' : '#d1d5db', display: 'inline-block' }} />
                                <span>{ms.description}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>₦{Number(ms.amount).toLocaleString()}</span>
                                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 8, background: ms.status === 'released' ? '#16a34a20' : ms.status === 'completed' ? '#f59e0b20' : '#d1d5db40', color: ms.status === 'released' ? '#16a34a' : ms.status === 'completed' ? '#f59e0b' : '#6b7280', fontWeight: 600, textTransform: 'capitalize' }}>
                                  {ms.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Confirm milestone button for customer */}
                      {expandedTx === tx.id && milestonesMap[tx.id] && milestonesMap[tx.id].some(m => m.status === 'completed') && (
                        <div style={{ marginTop: 8 }}>
                          {milestonesMap[tx.id].filter(m => m.status === 'completed').map(ms => (
                            <button
                              key={ms.id}
                              onClick={() => setConfirmMilestone({ txId: tx.id, ms })}
                              style={{ ...btnPrimary, padding: '6px 12px', fontSize: '0.8rem', marginRight: 8, marginTop: 4 }}
                            >
                              <CheckCircle size={14} /> Confirm: {ms.description}
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {(tx.status === 'escrow' || tx.status === 'completed') && tx.customer_id === user.id && (
                          <button
                            onClick={() => { setDisputeTx(tx); setShowDisputeModal(true); }}
                            style={{ ...btnOutline, padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                          >
                            <ShieldAlert size={14} /> Raise Dispute
                          </button>
                        )}
                        {tx.status === 'disputed' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontStyle: 'italic' }}>Dispute raised — awaiting admin review</span>
                        )}
                        <Link to={`/transactions/${tx.id}`} style={{ ...btnOutline, padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                          View Details
                        </Link>
                        {(tx.status === 'escrow' || tx.status === 'pending') && tx.customer_id === user.id && (
                          <button
                            onClick={() => setCancelTx(tx)}
                            style={{ ...btnOutline, padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                          >
                            <X size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Projects */}
          {activeSection === 'projects' && (
            <div>
              <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Projects</h2>
              {activeTransactions.length === 0 ? (
                <EmptyState icon={<Briefcase size={48} />} title="No active projects" message="Projects will appear here when you start work with service providers" action={<Link to="/search" style={btnPrimary}><Plus size={16} /> Find Service Providers</Link>} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {activeTransactions.map(tx => {
                    const ms = milestonesMap[tx.id] || [];
                    const released = ms.filter(m => m.status === 'released').length;
                    const total = ms.length;
                    const pct = total > 0 ? Math.round((released / total) * 100) : (tx.status === 'completed' || tx.status === 'released' ? 100 : tx.status === 'escrow' ? 0 : 0);
                    const needsConfirm = ms.some(m => m.status === 'completed');
                    return (
                      <div key={tx.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1rem' }}>{tx.business?.name || 'Service'}</h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                              Vendor: {tx.vendor?.full_name || '—'}
                            </p>
                          </div>
                          <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: statusColors[tx.status] + '20', color: statusColors[tx.status], fontWeight: 600, textTransform: 'capitalize' }}>
                            {tx.status}
                          </span>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                            <span>Progress</span>
                            <span style={{ fontWeight: 600 }}>{total > 0 ? `${released}/${total} milestones` : pct + '%'}</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct === 100 ? '#16a34a' : 'var(--color-primary)', borderRadius: 3, transition: 'width 0.3s' }} />
                          </div>
                        </div>

                        <div style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                          <strong>Total: ₦{Number(tx.amount).toLocaleString()}</strong>
                          {tx.platform_fee > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginLeft: 8 }}>(Fee: ₦{Number(tx.platform_fee).toLocaleString()})</span>}
                        </div>

                        {total > 0 && (
                          <div style={{ fontSize: '0.8rem', marginBottom: 12 }}>
                            {ms.map((m, mi) => (
                              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.status === 'released' ? '#16a34a' : m.status === 'completed' ? '#f59e0b' : '#d1d5db', flexShrink: 0 }} />
                                <span style={{ flex: 1, color: m.status === 'released' ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{m.description}</span>
                                <span style={{ fontWeight: 600, color: m.status === 'released' ? '#16a34a' : 'var(--color-text-muted)' }}>₦{Number(m.amount).toLocaleString()}</span>
                                {m.status === 'completed' && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Awaiting you</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          {needsConfirm && (
                            <button
                              onClick={() => {
                                setExpandedTx(tx.id);
                                setActiveSection('transactions');
                              }}
                              style={{ ...btnPrimary, padding: '6px 12px', fontSize: '0.8rem', background: '#f59e0b' }}
                            >
                              <CheckCircle size={14} /> Confirm Milestone
                            </button>
                          )}
                          <button
                            onClick={() => setActiveSection('transactions')}
                            style={{ ...btnOutline, padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            <DollarSign size={14} /> View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dispute Modal */}
          {showDisputeModal && (
            <div onClick={() => { if (!disputeLoading) setShowDisputeModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius)', padding: 24, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Raise a Dispute</h2>
                  <button onClick={() => setShowDisputeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                {disputeTx && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    Transaction: <strong>{disputeTx.business?.name}</strong> — ₦{Number(disputeTx.amount).toLocaleString()}
                  </p>
                )}
                <form onSubmit={handleRaiseDispute}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Reason *</label>
                    <select value={disputeReason} onChange={e => setDisputeReason(e.target.value)} required style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                      <option value="">Select a reason</option>
                      <option value="service_not_completed">Service not completed</option>
                      <option value="poor_quality">Poor quality work</option>
                      <option value="vendor_unresponsive">Vendor unresponsive</option>
                      <option value="incorrect_charges">Incorrect charges</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Description</label>
                    <textarea value={disputeDesc} onChange={e => setDisputeDesc(e.target.value)} rows={4} placeholder="Describe the issue in detail..." style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
                  </div>
                  {disputeError && <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginBottom: 12 }}>{disputeError}</p>}
                  <button type="submit" disabled={disputeLoading} style={{ width: '100%', padding: 12, background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {disputeLoading ? <><Loader size={18} className="spin" /> Submitting...</> : 'Submit Dispute'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {showFundModal && (
        <FundWalletModal
          onClose={() => setShowFundModal(false)}
          onSuccess={() => { setShowFundModal(false); fetchWallet(); }}
        />
      )}
      {confirmMilestone && (
        <ConfirmModal
          isOpen={!!confirmMilestone}
          title="Confirm milestone completion?"
          message={`Confirm completion of milestone: "${confirmMilestone.ms.description}"? This will release ₦${Number(confirmMilestone.ms.amount).toLocaleString()} to the vendor.`}
          confirmText="Confirm & Release"
          variant="default"
          onCancel={() => setConfirmMilestone(null)}
          onConfirm={() => handleConfirmMilestone(confirmMilestone.ms)}
        />
      )}
      {cancelTx && (
        <ConfirmModal
          isOpen={!!cancelTx}
          title="Cancel this transaction?"
          message={`Cancel "${cancelTx.business?.name || 'this service'}" for ₦${Number(cancelTx.amount).toLocaleString()}? Held milestone funds will be refunded to your wallet. This action cannot be undone.`}
          confirmText={cancelLoading ? 'Cancelling...' : 'Cancel transaction'}
          variant="danger"
          onCancel={() => { if (!cancelLoading) setCancelTx(null); }}
          onConfirm={handleCancelTx}
        />
      )}
    </div>
  );
}

export default CustomerDashboard;
