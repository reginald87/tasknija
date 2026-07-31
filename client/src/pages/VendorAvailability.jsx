import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ConfirmModal from '../components/common/ConfirmModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Calendar, Clock, Store, TrendingUp, ArrowUpFromLine,
  Menu, X, Check, Plus,
} from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
};

const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', padding: '20px 24px',
};

export default function VendorAvailability() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState(null);
  const [businessLookupError, setBusinessLookupError] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [confirmRemoveBlockId, setConfirmRemoveBlockId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const toast = useToast();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Find vendor's primary business
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    api.get('/businesses?owner=' + profile.id)
      .then(data => {
        if (cancelled) return;
        const list = data?.data || [];
        if (list.length) setBusinessId(list[0].id);
        else setBusinessLookupError('no-business');
      })
      .catch(() => {
        if (!cancelled) setBusinessLookupError('lookup-failed');
      });
    return () => { cancelled = true; };
  }, [profile]);

  const loadAvailability = async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/businesses/${businessId}/availability`);
      const payload = data?.data || {};
      setSchedule(payload.weekly || payload.schedule || []);
      setBlockedDates(payload.blocked || payload.blocked_dates || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAvailability();   }, [businessId]);

  const saveSchedule = async () => {
    if (!businessId) return;
    try {
      const newSchedule = DAYS.map((_, i) => {
        const existing = schedule.find(s => s.day_of_week === i);
        return {
          day_of_week: i,
          start_time: existing?.start_time || '09:00',
          end_time: existing?.end_time || '17:00',
          is_available: existing?.is_available !== false
        };
      });
      await api.put(`/businesses/${businessId}/availability`, { schedule: newSchedule });
      toast.success('Availability saved.');
      loadAvailability();
    } catch (err) {
      toast.error(err.message || 'Failed to save schedule');
    }
  };

  const addBlock = async () => {
    if (!businessId || !newBlockDate) return;
    try {
      await api.post(`/businesses/${businessId}/blocked-dates`, {
        blocked_date: newBlockDate,
        reason: newBlockReason
      });
      toast.success('Date blocked.');
      setNewBlockDate('');
      setNewBlockReason('');
      loadAvailability();
    } catch (err) {
      toast.error(err.message || 'Failed to block date');
    }
  };

  const removeBlock = async (dateId) => {
    if (!businessId || !dateId) return;
    try {
      await api.del(`/businesses/${businessId}/blocked-dates/${dateId}`);
      toast.success('Block removed.');
      loadAvailability();
    } catch (err) {
      toast.error(err.message || 'Failed to remove block');
    } finally {
      setConfirmRemoveBlockId(null);
    }
  };

  const updateDayField = (dayIndex, patch) => {
    setSchedule(prev => {
      const next = [...prev];
      const idx = next.findIndex(s => s.day_of_week === dayIndex);
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...patch };
      } else {
        next.push({
          day_of_week: dayIndex,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
          ...patch
        });
      }
      return next;
    });
  };

  if (businessLookupError === 'no-business') {
    return <EmptyState icon="🏪" title="Create a business first" message="You need to register a business before setting availability." />;
  }
  if (!businessId) return <Loading />;
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={loadAvailability} />;

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
          Availability
        </div>
      </div>
      {[
        { key: 'hours', label: 'Weekly Hours', icon: Clock },
        { key: 'blocked', label: 'Blocked Dates', icon: Calendar },
      ].map(item => {
        const Icon = item.icon;
        return (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '11px 16px', color: 'var(--color-text)',
            fontWeight: 500, fontSize: '0.88rem',
            borderLeft: '3px solid var(--color-primary)',
            background: 'var(--color-primary-light)',
          }}>
            <Icon size={18} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
            {item.label}
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 8, paddingTop: 8 }}>
        <Link to="/vendor-dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <Store size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Dashboard
        </Link>
        <Link to="/analytics" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <TrendingUp size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Analytics
        </Link>
        <Link to="/withdrawals" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <ArrowUpFromLine size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Withdrawals
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
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              {isMobile && <div style={{ width: 36 }} />}
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-secondary)', margin: 0 }}>
                Availability Schedule
              </h1>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Set your weekly working hours and block unavailable dates
            </p>
          </div>

          {/* Weekly Hours */}
          <div style={{ ...cardStyle, marginBottom: 24 }} id="weekly-hours">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} /> Weekly Hours
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DAYS.map((day, i) => {
                const existing = schedule.find(s => s.day_of_week === i);
                const available = existing?.is_available !== false;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: available ? 'var(--color-bg)' : 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    opacity: available ? 1 : 0.55,
                  }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.88rem', minWidth: 110,
                      color: 'var(--color-text)',
                    }}>
                      <input
                        type="checkbox"
                        checked={available}
                        onChange={e => updateDayField(i, { is_available: e.target.checked })}
                        style={{ accentColor: 'var(--color-primary)', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      {day}
                    </label>
                    {available && (
                      <>
                        <input
                          type="time"
                          value={existing?.start_time || '09:00'}
                          onChange={e => updateDayField(i, { start_time: e.target.value })}
                          style={{ ...inputStyle, width: 130 }}
                        />
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>to</span>
                        <input
                          type="time"
                          value={existing?.end_time || '17:00'}
                          onChange={e => updateDayField(i, { end_time: e.target.value })}
                          style={{ ...inputStyle, width: 130 }}
                        />
                        <span style={{
                          fontSize: '0.75rem', color: 'var(--color-text-muted)',
                          background: 'var(--color-surface)', padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                        }}>
                          {existing?.start_time || '09:00'} — {existing?.end_time || '17:00'}
                        </span>
                      </>
                    )}
                    {!available && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={saveSchedule} style={{ ...btnPrimary, marginTop: 16 }}>
              <Check size={15} /> Save Schedule
            </button>
          </div>

          {/* Blocked Dates */}
          <div style={{ ...cardStyle, marginBottom: 24 }} id="blocked-dates">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} /> Blocked Dates
            </h2>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <input
                type="date"
                value={newBlockDate}
                onChange={e => setNewBlockDate(e.target.value)}
                style={{ ...inputStyle, width: 180 }}
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={newBlockReason}
                onChange={e => setNewBlockReason(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              />
              <button onClick={addBlock} style={btnPrimary} disabled={!newBlockDate}>
                <Plus size={15} /> Block Date
              </button>
            </div>

            {blockedDates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                <Calendar size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                <p>No blocked dates. Add dates when you're unavailable.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blockedDates.map(d => (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Calendar size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.blocked_date}</span>
                      {d.reason && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          — {d.reason}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmRemoveBlockId(d.id)}
                      style={{ ...btnOutline, color: '#dc2626', borderColor: '#dc2626', padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      <X size={13} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ConfirmModal
            isOpen={!!confirmRemoveBlockId}
            onConfirm={() => removeBlock(confirmRemoveBlockId)}
            onCancel={() => setConfirmRemoveBlockId(null)}
            title="Remove blocked date?"
            message="Customers will be able to book this date again."
            confirmText="Remove"
            variant="danger"
          />
        </main>
      </div>
    </div>
  );
}
