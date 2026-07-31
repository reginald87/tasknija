import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import {
  LayoutDashboard, TrendingUp, Users, DollarSign, ShoppingCart,
  Star, Calendar, ArrowUpFromLine, Store, Menu,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'revenue', label: 'Revenue', icon: TrendingUp },
  { key: 'customers', label: 'Customers', icon: Users },
];

const btnOutline = {
  padding: '8px 16px', background: 'transparent', color: 'var(--color-text)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer',
  fontWeight: 500, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
  transition: 'all 0.2s',
};

const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', padding: '20px 24px',
};

const selectStyle = {
  padding: '8px 32px 8px 12px', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)', fontSize: '0.85rem', background: 'var(--color-bg)',
  color: 'var(--color-text)', outline: 'none', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='gray' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
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

function BarChart({ series }) {
  if (!series || series.length === 0) return null;
  const maxVal = Math.max(...series.map(s => s.revenue), 1);
  const barWidth = Math.max(8, Math.min(36, 600 / series.length - 4));
  const chartHeight = 200;
  return (
    <div style={{ width: '100%', overflowX: 'auto', paddingTop: 8 }}>
      <svg width={Math.max(600, series.length * (barWidth + 8))} height={chartHeight + 40} style={{ display: 'block' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartHeight - frac * chartHeight;
          return (
            <g key={frac}>
              <line x1={0} y1={y} x2={Math.max(600, series.length * (barWidth + 8))} y2={y}
                stroke="var(--color-border)" strokeWidth={1} opacity={0.5} />
              <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--color-text-muted)">
                ₦{Math.round(maxVal * frac).toLocaleString()}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {series.map((s, i) => {
          const barH = (s.revenue / maxVal) * (chartHeight - 10);
          const x = i * (barWidth + 8) + 4;
          const y = chartHeight - barH;
          const label = s.date ? s.date.slice(5) : '';
          const isToday = label === new Date().toISOString().slice(5, 10);
          return (
            <g key={s.date || i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={3}
                fill={isToday ? 'var(--color-primary)' : '#3b82f6'}
                opacity={isToday ? 1 : 0.7}>
                <title>₦{s.revenue.toLocaleString()} — {s.date}</title>
              </rect>
              {i % Math.ceil(series.length / 8) === 0 && (
                <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle"
                  fontSize={9} fill="var(--color-text-muted)" transform={`rotate(-45,${x + barWidth / 2},${chartHeight + 16})`}>
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatCurrency(n) {
  return `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function VendorAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [period, setPeriod] = useState(searchParams.get('period') || '30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [activeSection, isMobile]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, rv, cu] = await Promise.all([
        api.get('/analytics/vendor/overview'),
        api.get(`/analytics/vendor/revenue?period=${period}`),
        api.get('/analytics/vendor/customers')
      ]);
      setOverview(ov?.data || null);
      setRevenue(rv?.data || null);
      setCustomers(cu?.data || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();   }, [period]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error.message} onRetry={load} />;

  const revenueSeries = Array.isArray(revenue?.series)
    ? revenue.series
    : (Array.isArray(revenue?.data) ? revenue.data : []);

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
          Analytics
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
        <Link to="/vendor-dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <Store size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Dashboard
        </Link>
        <Link to="/availability" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
          <Calendar size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          Availability
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
                Analytics
              </h1>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Track your business performance
            </p>
          </div>

          {/* Overview */}
          {activeSection === 'overview' && (
            <>
              {/* Summary cards */}
              {overview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(overview.totalRevenue)} color="#16a34a" />
                  <StatCard icon={ShoppingCart} label="Transactions" value={overview.transactionCount || 0} color="#3b82f6" />
                  <StatCard icon={Star} label="Avg Rating" value={overview.avgRating || 'N/A'} color="#f59e0b" />
                  <StatCard icon={TrendingUp} label="Conversion Rate" value={overview.conversionRate ? `${overview.conversionRate}%` : 'N/A'} color="#8b5cf6" />
                </div>
              )}

              {/* Revenue chart on overview */}
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Revenue Trend</h2>
                  <select
                    value={period}
                    onChange={(e) => { setPeriod(e.target.value); setSearchParams({ period: e.target.value }); }}
                    style={selectStyle}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </select>
                </div>
                {revenueSeries.length ? (
                  <BarChart series={revenueSeries} />
                ) : (
                  <EmptyState icon={<TrendingUp size={40} />} title="No revenue yet" message="Complete transactions to see revenue data." />
                )}
              </div>

              {/* Customer quick summary */}
              {customers && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <StatCard icon={Users} label="Total Customers" value={customers.totalCustomers || 0} color="#3b82f6" />
                  <StatCard icon={Users} label="Repeat Customers" value={customers.repeatCustomers || 0} color="#8b5cf6" />
                  <StatCard icon={TrendingUp} label="Repeat Rate" value={customers.repeatRate ? `${customers.repeatRate}%` : '0%'} color="#16a34a" />
                </div>
              )}
            </>
          )}

          {/* Revenue full section */}
          {activeSection === 'revenue' && (
            <div>
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Revenue</h2>
                  <select
                    value={period}
                    onChange={(e) => { setPeriod(e.target.value); setSearchParams({ period: e.target.value }); }}
                    style={selectStyle}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Period</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{period}</div>
                  </div>
                  <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Total Revenue</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                      {formatCurrency(revenueSeries.reduce((s, r) => s + r.revenue, 0))}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Data Points</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{revenueSeries.length}</div>
                  </div>
                </div>

                {revenueSeries.length ? (
                  <>
                    <BarChart series={revenueSeries} />
                    <div style={{ marginTop: 20 }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 10 }}>Revenue Breakdown</h3>
                      <div style={{ maxHeight: 300, overflowY: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                            <tr>
                              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>Date</th>
                              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>Revenue</th>
                              <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>vs Previous</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenueSeries.map((s, i) => {
                              const prev = i > 0 ? revenueSeries[i - 1].revenue : null;
                              const diff = prev !== null ? ((s.revenue - prev) / (prev || 1) * 100) : null;
                              const isUp = diff !== null && diff > 0;
                              return (
                                <tr key={s.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '8px 14px' }}>{s.date}</td>
                                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.revenue)}</td>
                                  <td style={{
                                    padding: '8px 14px', textAlign: 'right',
                                    color: diff === null ? 'var(--color-text-muted)' : isUp ? '#16a34a' : '#dc2626',
                                  }}>
                                    {diff !== null ? `${isUp ? '+' : ''}${diff.toFixed(1)}%` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState icon={<TrendingUp size={48} />} title="No revenue data" message="Revenue will appear here once you complete transactions." />
                )}
              </div>
            </div>
          )}

          {/* Customers full section */}
          {activeSection === 'customers' && (
            <div>
              {customers ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <StatCard icon={Users} label="Total Customers" value={customers.totalCustomers || 0} color="#3b82f6" />
                    <StatCard icon={Users} label="Repeat Customers" value={customers.repeatCustomers || 0} color="#8b5cf6" />
                    <StatCard icon={TrendingUp} label="Repeat Rate" value={`${customers.repeatRate || 0}%`} color="#16a34a" />
                  </div>

                  <div style={cardStyle}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' }}>Customer Insights</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      <div style={{ flex: '1 1 200px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{customers.totalCustomers || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Customers</div>
                      </div>
                      <div style={{ flex: '1 1 200px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{customers.repeatCustomers || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Repeat Customers</div>
                      </div>
                      <div style={{ flex: '1 1 200px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{customers.repeatRate || 0}%</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Repeat Rate</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 16, lineHeight: 1.6 }}>
                      {customers.repeatRate >= 40
                        ? 'Great retention! Over 40% of your customers come back for more services. Keep up the excellent service quality.'
                        : customers.repeatRate >= 20
                        ? 'Good retention rate. Consider loyalty programs or follow-up offers to turn more one-time customers into repeat clients.'
                        : 'Your repeat rate is relatively low. Focus on customer satisfaction and post-service follow-ups to build loyalty.'}
                    </p>
                  </div>
                </>
              ) : (
                <EmptyState icon={<Users size={48} />} title="No customer data" message="Customer data will appear once you complete transactions." />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
