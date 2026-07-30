import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ArrowUpFromLine, Store, TrendingUp, Calendar,
  LayoutDashboard, Menu, X, Wallet, CheckCircle, Clock, AlertCircle,
  Ban,
} from 'lucide-react';

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

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)', fontSize: '0.85rem', background: 'var(--color-bg)',
  color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)',
  marginBottom: 6,
};

const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', padding: '20px 24px',
};

const statusBadge = (status) => {
  const colors = {
    pending: { bg: '#f59e0b15', color: '#f59e0b' },
    approved: { bg: '#16a34a15', color: '#16a34a' },
    rejected: { bg: '#dc262615', color: '#dc2626' },
    cancelled: { bg: '#6b728015', color: '#6b7280' },
    completed: { bg: '#05966915', color: '#059669' },
  };
  const c = colors[status] || { bg: '#6b728015', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 'var(--radius-pill)',
      fontSize: '0.72rem', fontWeight: 600,
      background: c.bg, color: c.color, textTransform: 'capitalize',
    }}>
      {status === 'pending' && <Clock size={11} />}
      {status === 'approved' && <CheckCircle size={11} />}
      {status === 'completed' && <CheckCircle size={11} />}
      {status === 'rejected' && <Ban size={11} />}
      {status === 'cancelled' && <X size={11} />}
      {status}
    </span>
  );
};

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/wallet/withdrawals?page=${page}&limit=20`);
      const list = data?.data || [];
      setWithdrawals(list);
      setTotal(data?.total ?? list.length);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

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
          Withdrawals
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '11px 16px', color: 'var(--color-text)',
        fontWeight: 500, fontSize: '0.88rem',
        borderLeft: '3px solid var(--color-primary)',
        background: 'var(--color-primary-light)',
      }}>
        <ArrowUpFromLine size={18} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
        All Withdrawals
      </div>
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 8, paddingTop: 8 }}>
        <Link to="/vendor-dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <Store size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Dashboard
        </Link>
        <Link to="/analytics" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <TrendingUp size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Analytics
        </Link>
        <Link to="/availability" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <Calendar size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Availability
        </Link>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                {isMobile && <div style={{ width: 36 }} />}
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-secondary)', margin: 0 }}>
                  Withdrawals
                </h1>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                Manage your withdrawal requests
              </p>
            </div>
            <button onClick={() => setShowRequest(true)} style={btnPrimary}>
              <ArrowUpFromLine size={15} /> Request Withdrawal
            </button>
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error.message} onRetry={load} />
          ) : !withdrawals.length ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
              <ArrowUpFromLine size={56} style={{ opacity: 0.2, marginBottom: 12 }} />
              <h3 style={{ color: 'var(--color-text)', marginBottom: 4 }}>No withdrawals yet</h3>
              <p style={{ fontSize: '0.88rem', marginBottom: 16 }}>Request a withdrawal to see it here.</p>
              <button onClick={() => setShowRequest(true)} style={btnPrimary}>
                <ArrowUpFromLine size={15} /> Request Withdrawal
              </button>
            </div>
          ) : (
            <>
              <div style={cardStyle}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Amount</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Bank</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Account</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                            ₦{Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 16px' }}>{statusBadge(w.status)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{w.bank_name || w.bank_code || '—'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{w.bank_account || w.account_number || '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(w.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <Pagination
                  page={page}
                  totalPages={Math.max(1, Math.ceil(total / 20))}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {showRequest && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setShowRequest(false)}>
          <WithdrawalRequestModal
            onClose={() => setShowRequest(false)}
            onSuccess={() => {
              setShowRequest(false);
              load();
              toast.success('Withdrawal request submitted.');
            }}
          />
        </div>
      )}
    </div>
  );
}

function WithdrawalRequestModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/wallet/withdrawals', {
        amount: Number(amount),
        bankAccount,
        bankCode,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={e => e.stopPropagation()} style={{
      ...cardStyle, maxWidth: 440, width: '100%', padding: '28px 32px',
      maxHeight: '90vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpFromLine size={18} style={{ color: 'var(--color-primary)' }} /> Request Withdrawal
        </h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)', padding: 4, borderRadius: 'var(--radius-sm)',
        }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: '#dc262615', color: '#dc2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        <div>
          <label style={labelStyle}>Amount (₦)</label>
          <input
            type="number" min="1000" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} required
            style={inputStyle} placeholder="e.g. 50000"
          />
        </div>

        <div>
          <label style={labelStyle}>Bank Code</label>
          <input
            type="text" value={bankCode}
            onChange={e => setBankCode(e.target.value)} required
            style={inputStyle} placeholder="e.g. 044"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            GTBank=044, Access=044, FirstBank=011, UBA=033, Zenith=057
          </p>
        </div>

        <div>
          <label style={labelStyle}>Account Number</label>
          <input
            type="text" value={bankAccount}
            onChange={e => setBankAccount(e.target.value)} required
            style={inputStyle} placeholder="10 digits" maxLength={10}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ ...btnOutline, flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
