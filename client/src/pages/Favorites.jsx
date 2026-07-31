import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { useToast } from '../context/ToastContext.jsx';
import BusinessCard from '../components/business/BusinessCard.jsx';
import {
  LayoutDashboard, MessageCircle, DollarSign, Briefcase, Heart, Menu, Wallet,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'transactions', label: 'Transactions', icon: DollarSign },
  { key: 'projects', label: 'Projects', icon: Briefcase },
];

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

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [wallet, setWallet] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  useEffect(() => {
    load();
    api.get('/payments/wallet').then(r => { if (r.success) setWallet(r.data); }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/favorites');
      setFavorites(data?.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (businessId) => {
    try {
      await api.del(`/favorites/${businessId}`);
      setFavorites(prev => prev.filter(f => f.business_id !== businessId));
      toast.success('Removed from favorites.');
    } catch (err) {
      toast.error(err.message || 'Remove failed.');
    }
  };

  if (loading) return <Loading variant="skeleton-card" count={4} />;
  if (error) return <ErrorState message={error.message} onRetry={load} />;

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
        return (
          <button
            key={item.key}
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              padding: '11px 16px', border: 'none', background: 'transparent',
              color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer',
              borderLeft: '3px solid transparent', transition: 'all 0.15s',
            }}
          >
            <Icon size={18} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
            {item.label}
          </button>
        );
      })}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 8, paddingTop: 8 }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
            padding: '11px 16px', border: 'none', background: 'var(--color-primary-light)',
            color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
            borderLeft: '3px solid var(--color-primary)', transition: 'all 0.15s',
          }}
        >
          <Heart size={18} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
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
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Your Favorites</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                padding: '8px 16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>₦{Number(wallet?.balance || 0).toLocaleString()}</span>
              </div>
              <Link to="/dashboard" style={btnPrimary}>Back to Dashboard</Link>
            </div>
          </div>

          {!favorites.length ? (
            <EmptyState
              icon="❤️"
              title="No favorites yet"
              message="Save vendors you like to find them quickly later."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {favorites.map(f => (
                <div key={f.id} style={{ position: 'relative' }}>
                  <BusinessCard business={f.business} />
                  <button
                    onClick={() => remove(f.business_id)}
                    style={{ ...btnOutline, marginTop: 8, width: '100%', justifyContent: 'center' }}
                  >
                    ❤️ Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
