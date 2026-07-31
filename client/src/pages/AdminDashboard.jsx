import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  LayoutDashboard, FolderTree, Globe, Users, Store,
  TrendingUp, Star, ChevronRight, Wallet, Scale, FileText,
  CheckCircle, XCircle, AlertTriangle, X, CreditCard, Settings, ArrowUpFromLine, ShieldCheck,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'businesses', label: 'Businesses', icon: Store },
  { key: 'categories', label: 'Categories', icon: FolderTree },
  { key: 'countries', label: 'Countries', icon: Globe },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'verifications', label: 'Verifications', icon: ShieldCheck },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'wallets', label: 'Wallets', icon: Wallet },
  { key: 'transactions', label: 'Transactions', icon: FileText },
  { key: 'disputes', label: 'Disputes', icon: Scale },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'locations', label: 'Locations', icon: Globe },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)', padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius)',
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{label}</div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 'var(--radius)',
  border: '1px solid var(--color-border)', fontSize: '0.85rem',
  background: 'var(--color-bg)', color: 'var(--color-text)', width: '100%',
};

const tableHeadStyle = { background: 'var(--color-bg)', textAlign: 'left', fontSize: '0.82rem' };
const thStyle = { padding: '10px 16px', borderBottom: '1px solid var(--color-border)' };
const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' };

function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--radius-pill)',
      fontSize: '0.75rem', fontWeight: 600, background: `${color}15`, color,
      textTransform: 'capitalize',
    }}>
      {label}
    </span>
  );
}

function FormTable({ children, head, tableClassName = '' }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'auto' }}>
      <table className={`responsive-table ${tableClassName}`} style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        {head && (
          <thead>
            <tr style={tableHeadStyle}>{head.map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', background: color || 'var(--color-primary)', color: '#fff',
      border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
      cursor: 'pointer', marginRight: 4,
    }}>{label}</button>
  );
}

const CHART_COLORS = ['#0b3d2e', '#2563eb', '#16a34a', '#f59e0b', '#6366f1', '#0ea5e9', '#dc2626', '#db2777'];
const chartTooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.8rem',
  color: 'var(--color-text)',
};

function AdminRevenueChart({ series }) {
  if (!series || series.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No revenue recorded in this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(d) => d.slice(5)} stroke="var(--color-border)" />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} stroke="var(--color-border)" width={48} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(v) => [`₦${Number(v).toLocaleString()}`, 'Net revenue']}
          labelFormatter={(l) => `Date: ${l}`}
        />
        <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [activeSection, isMobile]);

  /* Categories */
  const [categories, setCategories] = useState([]);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState('');
  const [editingCat, setEditingCat] = useState(null);

  /* Countries */
  const [countries, setCountries] = useState([]);
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryError, setCountryError] = useState('');
  const [editingCountry, setEditingCountry] = useState(null);

  /* Users */
  const [users, setUsers] = useState([]);

  /* Businesses */
  const [businesses, setBusinesses] = useState([]);
  const [bizFilter, setBizFilter] = useState('');

  /* Reviews */
  const [reviews, setReviews] = useState([]);

  /* Vendor verifications */
  const [verifications, setVerifications] = useState([]);
  const [verifFilter, setVerifFilter] = useState('pending');
  const [verifReason, setVerifReason] = useState({});
  const [verifBusy, setVerifBusy] = useState(null);

  /* Wallets */
  const [wallets, setWallets] = useState([]);
  const [walletTx, setWalletTx] = useState([]);

  /* Transactions */
  const [transactions, setTransactions] = useState([]);
  const [txFilter, setTxFilter] = useState('');

  /* Disputes */
  const [disputes, setDisputes] = useState([]);
  const [disputeFilter, setDisputeFilter] = useState('');

  /* Subscriptions */
  const [subPackages, setSubPackages] = useState([]);
  const [vendorSubs, setVendorSubs] = useState([]);
  const [subPkgName, setSubPkgName] = useState('');
  const [subPkgDesc, setSubPkgDesc] = useState('');
  const [subPkgFeatures, setSubPkgFeatures] = useState('');
  const [subPkgQuarterly, setSubPkgQuarterly] = useState('');
  const [subPkgBiannually, setSubPkgBiannually] = useState('');
  const [subPkgAnnually, setSubPkgAnnually] = useState('');
  const [subPkgRecommended, setSubPkgRecommended] = useState(false);
  const [subPkgError, setSubPkgError] = useState('');
  const [editingSubPkg, setEditingSubPkg] = useState(null);

  /* Settings */
  const [platformFee, setPlatformFee] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsError, setSettingsError] = useState('');

  /* Withdrawals */
  const [withdrawReqs, setWithdrawReqs] = useState([]);
  const [wrFilter, setWrFilter] = useState('');
  const [wrNote, setWrNote] = useState({});

  /* Analytics */
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* Locations */
  const [locStates, setLocStates] = useState([]);
  const [locLgas, setLocLgas] = useState([]);
  const [locCities, setLocCities] = useState([]);
  const [locTab, setLocTab] = useState('states');
  const [locName, setLocName] = useState('');
  const [locStateId, setLocStateId] = useState('');
  const [locLgaId, setLocLgaId] = useState('');
  const [locCountryId, setLocCountryId] = useState('');
  const [locError, setLocError] = useState('');
  const [editingLoc, setEditingLoc] = useState(null);

  /* Confirm modal state */
  const [confirmAction, setConfirmAction] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate('/login');
    if (profile && profile.role !== 'admin') return navigate('/');
    if (!profile) return;
    fetchStats();
    fetchCategories();
    fetchCountries();
    fetchUsers();
  }, [user, profile, loading]);

  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'businesses') fetchBusinesses(); }, [activeSection, bizFilter]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'reviews') fetchReviews(); }, [activeSection]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'verifications') fetchVerifications(); }, [activeSection, verifFilter]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'wallets') { fetchWallets(); fetchWalletTx(); } }, [activeSection]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'transactions') fetchTransactions(); }, [activeSection, txFilter]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'disputes') fetchDisputes(); }, [activeSection, disputeFilter]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'subscriptions') { fetchSubPackages(); fetchVendorSubs(); } }, [activeSection]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'settings') fetchPlatformConfig(); }, [activeSection]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'withdrawals') fetchWithdrawals(); }, [activeSection, wrFilter]);
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'analytics') fetchAnalytics(); }, [activeSection, analyticsPeriod]);

  async function fetchAnalytics() {
    try {
      setAnalyticsLoading(true);
      const data = await api.get(`/admin/analytics?period=${analyticsPeriod}`);
      if (data.success) setAnalytics(data.data);
    } catch {}
    finally { setAnalyticsLoading(false); }
  }
  useEffect(() => { if (profile?.role === 'admin' && activeSection === 'locations') fetchLocations(); }, [activeSection, locTab]);

  async function fetchStats() { try { const data = await api.get('/admin/stats'); if (data.success) setStats(data.data); } catch {} }
  async function fetchPlatformConfig() {
    try {
      const data = await api.get('/admin/platform-config');
      if (data.success) { setPlatformFee(String(data.data.platformFeePercent)); }
    } catch {}
  }
  async function fetchCategories() { try { const data = await api.get('/categories'); if (data.success) setCategories(data.data); } catch {} }
  async function fetchCountries() { try { const data = await api.get('/countries'); if (data.success) setCountries(data.data); } catch {} }
  async function fetchUsers() { try { const data = await api.get('/admin/users'); if (data.success) setUsers(data.data); } catch {} }
  async function fetchBusinesses() { try { const data = await api.get(`/admin/businesses${bizFilter ? `?status=${bizFilter}` : ''}`); if (data.success) setBusinesses(data.data); } catch {} }
  async function fetchReviews() { try { const data = await api.get('/admin/reviews'); if (data.success) setReviews(data.data); } catch {} }
  async function fetchVerifications() { try { const data = await api.get(`/admin/vendor-verifications?status=${verifFilter}`); if (data.success) setVerifications(data.data || []); } catch {} }
  async function handleVerifApprove(id) {
    setVerifBusy(id);
    try {
      const res = await api.patch(`/admin/vendor-verifications/${id}/approve`);
      if (res.success) { toast.success('Verification approved. Businesses marked verified.'); fetchVerifications(); }
      else toast.error(res.error?.message || 'Could not approve verification');
    } catch (err) { toast.error(err.response?.data?.error || 'Could not approve verification'); }
    finally { setVerifBusy(null); }
  }
  async function handleVerifReject(id) {
    const reason = (verifReason[id] || '').trim();
    if (!reason) { toast.error('Enter a rejection reason first.'); return; }
    setVerifBusy(id);
    try {
      const res = await api.patch(`/admin/vendor-verifications/${id}/reject`, { reason });
      if (res.success) { toast.success('Verification rejected.'); fetchVerifications(); }
      else toast.error(res.error?.message || 'Could not reject verification');
    } catch (err) { toast.error(err.response?.data?.error || 'Could not reject verification'); }
    finally { setVerifBusy(null); }
  }
  async function fetchWallets() { try { const data = await api.get('/admin/wallets'); if (data.success) setWallets(data.data); } catch {} }
  async function fetchWalletTx() { try { const data = await api.get('/admin/wallet-transactions'); if (data.success) setWalletTx(data.data); } catch {} }
  async function fetchTransactions() { try { const data = await api.get(`/admin/transactions${txFilter ? `?status=${txFilter}` : ''}`); if (data.success) setTransactions(data.data); } catch {} }
  async function fetchDisputes() { try { const data = await api.get(`/admin/disputes${disputeFilter ? `?status=${disputeFilter}` : ''}`); if (data.success) setDisputes(data.data); } catch {} }
  async function fetchWithdrawals() { try { const data = await api.get(`/admin/withdraw-requests${wrFilter ? `?status=${wrFilter}` : ''}`); if (data.success) setWithdrawReqs(data.data); } catch {} }

  /* Location CRUD */
  async function fetchLocations() {
    try {
      if (locTab === 'states') { const data = await api.get('/admin/locations/states'); if (data.success) setLocStates(data.data); }
      if (locTab === 'lgas') { const data = await api.get('/admin/locations/lgas'); if (data.success) setLocLgas(data.data); }
      if (locTab === 'cities') { const data = await api.get('/admin/locations/cities'); if (data.success) setLocCities(data.data); }
    } catch {}
  }
  async function handleLocSave() {
    try {
      setLocError('');
      const payload = { name: locName };
      if (locTab === 'states') payload.countryId = locCountryId;
      if (locTab === 'lgas') payload.stateId = locStateId;
      if (locTab === 'cities') { payload.stateId = locStateId; payload.lgaId = locLgaId || null; }
      const endpoint = `/admin/locations/${locTab}`;
      if (editingLoc) {
        await api.put(`${endpoint}/${editingLoc}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setLocName(''); setLocStateId(''); setLocLgaId(''); setLocCountryId(''); setEditingLoc(null);
      fetchLocations();
    } catch (err) { setLocError(err.response?.data?.error || 'Save failed'); }
  }
  async function handleLocEdit(item) {
    setLocName(item.name);
    setLocStateId(item.state_id || '');
    setLocLgaId(item.lga_id || '');
    setLocCountryId(item.country_id || '');
    setEditingLoc(item.id);
  }
  async function handleLocDelete(id) {
    try {
      await api.delete(`/admin/locations/${locTab}/${id}`);
      toast.success('Location deleted.');
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
    setConfirmAction(null);
  }
  function resetLocForm() { setLocName(''); setLocStateId(''); setLocLgaId(''); setLocCountryId(''); setEditingLoc(null); setLocError(''); }

  async function fetchSubPackages() { try { const data = await api.get('/subscriptions/packages'); if (data.success) setSubPackages(data.data); } catch {} }
  async function fetchVendorSubs() { try { const data = await api.get('/subscriptions/admin/all'); if (data.success) setVendorSubs(data.data); } catch {} }
  async function handleSubPkgSubmit(e) {
    e.preventDefault(); setSubPkgError('');
    try {
      const features = subPkgFeatures.split('\n').map(f => f.trim()).filter(Boolean);
      if (editingSubPkg) {
        await api.put(`/subscriptions/packages/${editingSubPkg.id}`, { name: subPkgName, description: subPkgDesc, features, prices: { quarterly: subPkgQuarterly, biannually: subPkgBiannually, annually: subPkgAnnually }, recommended: subPkgRecommended });
      } else {
        await api.post('/subscriptions/packages', { name: subPkgName, description: subPkgDesc, features, prices: { quarterly: subPkgQuarterly, biannually: subPkgBiannually, annually: subPkgAnnually }, recommended: subPkgRecommended });
      }
      resetSubPkgForm();
      fetchSubPackages();
    } catch (err) { setSubPkgError(err.response?.data?.error || 'Failed to save package'); }
  }
  async function handleSubPkgDelete(id) {
    try {
      await api.delete(`/subscriptions/packages/${id}`);
      toast.success('Package deleted.');
      fetchSubPackages();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete package');
    }
    setConfirmAction(null);
  }
  function resetSubPkgForm() {
    setSubPkgName(''); setSubPkgDesc(''); setSubPkgFeatures(''); setSubPkgQuarterly('');
    setSubPkgBiannually(''); setSubPkgAnnually(''); setSubPkgRecommended(false); setSubPkgError(''); setEditingSubPkg(null);
  }
  function editSubPkg(pkg) {
    setEditingSubPkg(pkg); setSubPkgName(pkg.name); setSubPkgDesc(pkg.description);
    setSubPkgFeatures((pkg.features || []).join('\n')); setSubPkgQuarterly(String(pkg.prices.quarterly));
    setSubPkgBiannually(String(pkg.prices.biannually)); setSubPkgAnnually(String(pkg.prices.annually));
    setSubPkgRecommended(pkg.recommended);
  }
  async function handleVerifySub(id) { try { await api.put(`/subscriptions/admin/${id}/verify`); fetchVendorSubs(); } catch {} }
  async function handleRejectSub(id) { try { await api.put(`/subscriptions/admin/${id}/reject`); fetchVendorSubs(); } catch {} }

  /* Category handlers */
  async function handleCatSubmit(e) {
    try {
      e.preventDefault(); setCatError('');
      if (editingCat) {
        const data = await api.put(`/categories/${editingCat}`, { name: catName, description: catDesc });
        if (data.success) { setEditingCat(null); setCatName(''); setCatDesc(''); fetchCategories(); } else setCatError(data.error);
      } else {
        const data = await api.post('/categories', { name: catName, description: catDesc });
        if (data.success) { setCatName(''); setCatDesc(''); fetchCategories(); } else setCatError(data.error);
      }
    } catch (err) { setCatError(err.response?.data?.error || err.message); }
  }
  async function handleCatDelete(id) {
    try {
      const data = await api.delete(`/categories/${id}`);
      if (data.success) { toast.success('Category deleted.'); fetchCategories(); }
      else toast.error(data.error);
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }

  /* Country handlers */
  async function handleCountrySubmit(e) {
    try {
      e.preventDefault(); setCountryError('');
      if (editingCountry) {
        const data = await api.put(`/countries/${editingCountry}`, { name: countryName, code: countryCode });
        if (data.success) { setEditingCountry(null); setCountryName(''); setCountryCode(''); fetchCountries(); } else setCountryError(data.error);
      } else {
        const data = await api.post('/countries', { name: countryName, code: countryCode });
        if (data.success) { setCountryName(''); setCountryCode(''); fetchCountries(); } else setCountryError(data.error);
      }
    } catch (err) { setCountryError(err.response?.data?.error || err.message); }
  }
  async function handleCountryDelete(id) {
    try {
      const data = await api.delete(`/countries/${id}`);
      if (data.success) { toast.success('Country deleted.'); fetchCountries(); }
      else toast.error(data.error);
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }

  /* User handlers */
  async function handleRoleChange(userId, role) {
    const data = await api.put(`/admin/users/${userId}/role`, { role });
    if (data.success) { toast.success('User role updated.'); fetchUsers(); }
    else toast.error(data.error || 'Failed to update role');
  }
  async function handleUserDelete(id) {
    try {
      const data = await api.delete(`/admin/users/${id}`);
      if (data.success) { toast.success('User deleted.'); fetchUsers(); }
      else toast.error(data.error);
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }

  /* Business detail review */
  const [reviewBiz, setReviewBiz] = useState(null);

  /* Business handlers */
  async function handleVerify(id, status) {
    const data = await api.put(`/admin/businesses/${id}/verify`, { status });
    if (data.success) { toast.success(`Business ${status}.`); setReviewBiz(null); fetchBusinesses(); }
    else toast.error(data.error || 'Failed to update business');
  }
  async function handleBizDelete(id) {
    try {
      const data = await api.delete(`/admin/businesses/${id}`);
      if (data.success) { toast.success('Business deleted.'); setReviewBiz(null); fetchBusinesses(); }
      else toast.error(data.error);
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }

  /* Review handlers */
  async function handleReviewDelete(id) {
    try {
      const data = await api.delete(`/admin/reviews/${id}`);
      if (data.success) { toast.success('Review deleted.'); fetchReviews(); }
      else toast.error(data.error);
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }

  /* Transaction handlers */
  async function handleRelease(id) {
    try {
      const data = await api.post(`/admin/transactions/${id}/release`);
      if (data.success) { toast.success('Escrow released.'); fetchTransactions(); }
      else toast.error(data.error || 'Failed to release escrow');
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }
  async function handleCancelTx(id) {
    try {
      const data = await api.post(`/admin/transactions/${id}/cancel`);
      if (data.success) { toast.success('Transaction cancelled & refunded.'); fetchTransactions(); }
      else toast.error(data.error || 'Failed to cancel transaction');
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
    setConfirmAction(null);
  }

  /* Dispute handlers */
  async function handleResolve(id, status) {
    const resolution = prompt('Resolution notes (optional):');
    const data = await api.put(`/admin/disputes/${id}/resolve`, { status, resolution: resolution || '' });
    if (data.success) { toast.success('Dispute resolved.'); fetchDisputes(); }
    else toast.error(data.error || 'Failed to resolve dispute');
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height, 64px))', background: 'var(--color-bg)', position: 'relative' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} />
      )}
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)', padding: '16px 8px',
        overflowY: 'auto',
        ...(isMobile ? {
          position: 'fixed', top: 'var(--header-height, 64px)', left: 0, bottom: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
        } : {}),
      }}>
        <div style={{ padding: '8px 12px 16px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
          Admin Panel
        </div>
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                fontWeight: activeSection === item.key ? 600 : 400,
                background: activeSection === item.key ? 'var(--color-primary-light)' : 'transparent',
                color: activeSection === item.key ? 'var(--color-primary)' : 'var(--color-text)',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {activeSection === item.key && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: isMobile ? 12 : 24, overflow: 'auto', minWidth: 0 }}>
        {/* Mobile header bar */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>Admin Panel</span>
          </div>
        )}
        {/* ===== OVERVIEW ===== */}
        {activeSection === 'overview' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 24 }}>Dashboard Overview</h2>
            {stats && (
              <>
                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
                  <StatCard icon={Store} label="Businesses" value={stats.totalBusinesses} color="#0b3d2e" />
                  <StatCard icon={Users} label="Users" value={stats.totalUsers} color="#2563eb" />
                  <StatCard icon={Star} label="Reviews" value={stats.totalReviews} color="#dc2626" />
                  <StatCard icon={FolderTree} label="Categories" value={stats.totalCategories} color="#f59e0b" />
                  <StatCard icon={Wallet} label="Total Inflow" value={`₦${(stats.totalInflow || 0).toLocaleString()}`} color="#16a34a" />
                  <StatCard icon={AlertTriangle} label="Pending KYC" value={stats.pendingVerifications} color="#f59e0b" />
                  <StatCard icon={FileText} label="Transactions" value={stats.totalTransactions} color="#6366f1" />
                  <StatCard icon={Scale} label="Disputes" value={stats.totalDisputes} color="#dc2626" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                  <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} /> Recent Businesses</h3>
                    {stats.recentBusinesses.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No businesses yet</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {stats.recentBusinesses.map((b) => (
                          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ fontWeight: 500 }}>{b.name}</span>
                            <Badge label={b.verification_status || 'pending'} color={b.verification_status === 'verified' ? '#16a34a' : '#f59e0b'} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> Recent Users</h3>
                    {stats.recentUsers.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No users yet</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {stats.recentUsers.map((u) => (
                          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ fontWeight: 500 }}>{u.full_name || u.email}</span>
                            <Badge label={u.role} color={u.role === 'admin' ? '#dc2626' : u.role === 'vendor' ? '#2563eb' : '#6b7280'} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FolderTree size={16} /> User Composition</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Vendors', value: stats.totalVendors || 0 },
                            { name: 'Customers', value: Math.max(0, (stats.totalUsers || 0) - (stats.totalVendors || 0)) },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          <Cell fill="#2563eb" />
                          <Cell fill="#cbd5e1" />
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v, n) => [`${v}`, n]} />
                        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ===== BUSINESSES ===== */}
        {activeSection === 'businesses' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Manage Businesses</h2>
              <select value={bizFilter} onChange={(e) => setBizFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="">All Statuses</option>
                <option value="pending">Pending KYC</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <FormTable head={['Name', 'Owner', 'Category', 'Location', 'KYC', 'Availability', 'Actions']}>
              {businesses.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No businesses</td></tr>
              ) : businesses.map((b) => (
                <tr key={b.id}>
                  <td style={tdStyle} data-label="Name"><strong>{b.name}</strong></td>
                  <td style={tdStyle} data-label="Owner">{b.owner?.full_name || b.owner?.email || '—'}</td>
                  <td style={tdStyle} data-label="Category">{b.category?.name || '—'}</td>
                  <td style={tdStyle} data-label="Location">{[b.city, b.state].filter(Boolean).join(', ') || '—'}</td>
                  <td style={tdStyle} data-label="KYC"><Badge label={b.verification_status || 'pending'} color={b.verification_status === 'verified' ? '#16a34a' : b.verification_status === 'rejected' ? '#dc2626' : '#f59e0b'} /></td>
                  <td style={tdStyle} data-label="Availability">
                    <Badge
                      label={b.availability_status === 'sold' ? 'Sold' : b.availability_status === 'rented' ? 'Rented' : 'Available'}
                      color={b.availability_status === 'sold' ? '#dc2626' : b.availability_status === 'rented' ? '#d97706' : '#16a34a'}
                    />
                    {b.sold_at && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {new Date(b.sold_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle} data-label="Actions">
                    <ActionBtn label="Review" onClick={() => setReviewBiz(b)} />
                    {(b.verification_status === 'verified' || b.verification_status === 'rejected') && <ActionBtn label="Delete" color="#dc2626" onClick={() => handleBizDelete(b.id)} />}
                  </td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== CATEGORIES ===== */}
        {activeSection === 'categories' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Manage Categories</h2>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20, marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>{editingCat ? 'Edit' : 'Add'} Category</h3>
              {catError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 8 }}>{catError}</p>}
              <form onSubmit={handleCatSubmit} style={{ display: 'flex', gap: 8 }}>
                <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Name" required style={inputStyle} />
                <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Description" style={inputStyle} />
                <button type="submit" style={{ padding: '8px 20px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{editingCat ? 'Update' : 'Add'}</button>
                {editingCat && <button type="button" onClick={() => { setEditingCat(null); setCatName(''); setCatDesc(''); }} style={{ padding: '8px 16px', background: 'transparent', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>Cancel</button>}
              </form>
            </div>
            <FormTable head={['Name', 'Slug', 'Businesses', 'Actions']}>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td style={tdStyle}><strong>{cat.name}</strong></td>
                  <td style={tdStyle}>{cat.slug}</td>
                  <td style={tdStyle}>{cat.businesses?.count ?? 0}</td>
                  <td style={tdStyle}>
                    <ActionBtn label="Edit" onClick={() => { setEditingCat(cat.id); setCatName(cat.name); setCatDesc(cat.description || ''); }} />
                    <ActionBtn label="Delete" color="#dc2626" onClick={() => handleCatDelete(cat.id)} />
                  </td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== COUNTRIES ===== */}
        {activeSection === 'countries' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Manage Countries</h2>
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20, marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>{editingCountry ? 'Edit' : 'Add'} Country</h3>
              {countryError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 8 }}>{countryError}</p>}
              <form onSubmit={handleCountrySubmit} style={{ display: 'flex', gap: 8 }}>
                <input value={countryName} onChange={(e) => setCountryName(e.target.value)} placeholder="Name" required style={inputStyle} />
                <input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="Code" required style={{ ...inputStyle, maxWidth: 100 }} />
                <button type="submit" style={{ padding: '8px 20px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{editingCountry ? 'Update' : 'Add'}</button>
                {editingCountry && <button type="button" onClick={() => { setEditingCountry(null); setCountryName(''); setCountryCode(''); }} style={{ padding: '8px 16px', background: 'transparent', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>Cancel</button>}
              </form>
            </div>
            <FormTable head={['Name', 'Code', 'Actions']}>
              {countries.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}><strong>{c.name}</strong></td>
                  <td style={tdStyle}>{c.code}</td>
                  <td style={tdStyle}>
                    <ActionBtn label="Edit" onClick={() => { setEditingCountry(c.id); setCountryName(c.name); setCountryCode(c.code); }} />
                    <ActionBtn label="Delete" color="#dc2626" onClick={() => handleCountryDelete(c.id)} />
                  </td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== USERS ===== */}
        {activeSection === 'users' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Manage Users</h2>
            <FormTable head={['Name', 'Email', 'Role', 'Actions']}>
              {users.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No users</td></tr> : users.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle} data-label="Name"><strong>{u.full_name || '—'}</strong></td>
                  <td style={tdStyle} data-label="Email">{u.email || '—'}</td>
                  <td style={tdStyle} data-label="Role">
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.82rem', background: 'var(--color-bg)', cursor: 'pointer' }}>
                      <option value="user">user</option>
                      <option value="vendor">vendor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={tdStyle} data-label="Actions"><ActionBtn label="Delete" color="#dc2626" onClick={() => handleUserDelete(u.id)} /></td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== VERIFICATIONS ===== */}
        {activeSection === 'verifications' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Vendor Verifications</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {['pending', 'approved', 'rejected', 'all'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setVerifFilter(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                      border: verifFilter === s ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: verifFilter === s ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: verifFilter === s ? '#fff' : 'inherit',
                      fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {verifications.length === 0 ? (
              <EmptyState icon={<ShieldCheck size={32} />} title="No verifications" message={`No ${verifFilter === 'all' ? '' : verifFilter + ' '}verification applications found.`} />
            ) : (
              verifications.map((v) => (
                <div key={v.id} style={{
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', padding: '18px 20px', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{v.user?.full_name || 'Unknown vendor'}</strong>
                        <Badge label={v.status} color={v.status === 'approved' ? '#16a34a' : v.status === 'rejected' ? '#dc2626' : '#f59e0b'} />
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        {v.user?.email || '—'} · Submitted {v.created_at ? new Date(v.created_at).toLocaleString() : '—'}
                      </p>
                    </div>
                    {v.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleVerifApprove(v.id)}
                          disabled={verifBusy === v.id}
                          style={{
                            padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          }}
                        >
                          {verifBusy === v.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleVerifReject(v.id)}
                          disabled={verifBusy === v.id}
                          style={{
                            padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12, fontSize: '0.85rem' }}>
                    <p style={{ margin: 0 }}><strong>Business:</strong> {v.business_name || '—'}</p>
                    <p style={{ margin: 0 }}><strong>ID Type:</strong> {v.id_type ? v.id_type.replace(/_/g, ' ') : '—'}</p>
                    <p style={{ margin: 0 }}><strong>ID Number:</strong> {v.id_number || '—'}</p>
                  </div>

                  {(v.documents || []).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <strong style={{ fontSize: '0.82rem' }}>Documents ({v.documents.length})</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {v.documents.map((d, i) => (
                          <a
                            key={i}
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', color: 'var(--color-primary)',
                              textDecoration: 'none',
                            }}
                          >
                            <FileText size={13} />
                            {d.name || d.type || 'View document'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {v.notes && <p style={{ fontSize: '0.82rem', margin: '12px 0 0', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>"{v.notes}"</p>}

                  {v.status === 'rejected' && v.rejection_reason && (
                    <p style={{ fontSize: '0.82rem', color: '#dc2626', margin: '12px 0 0' }}><strong>Rejection reason:</strong> {v.rejection_reason}</p>
                  )}

                  {v.status === 'pending' && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        placeholder="Rejection reason (required to reject)"
                        value={verifReason[v.id] || ''}
                        onChange={(e) => setVerifReason((prev) => ({ ...prev, [v.id]: e.target.value }))}
                        style={{
                          flex: 1, maxWidth: 380, padding: '8px 12px', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', background: 'var(--color-bg)',
                          color: 'var(--color-text)', outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ===== REVIEWS ===== */}
        {activeSection === 'reviews' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Manage Reviews</h2>
            <FormTable head={['User', 'Business', 'Rating', 'Comment', 'Actions']}>
              {reviews.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No reviews</td></tr> : reviews.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.user?.full_name || '—'}</td>
                  <td style={tdStyle}>{r.business?.name || '—'}</td>
                  <td style={tdStyle}>{'⭐'.repeat(r.rating)}</td>
                  <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comment || '—'}</td>
                  <td style={tdStyle}><ActionBtn label="Delete" color="#dc2626" onClick={() => handleReviewDelete(r.id)} /></td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== WALLETS ===== */}
        {activeSection === 'wallets' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Wallet Balances</h2>
            <FormTable head={['User', 'Role', 'Balance']}>
              {(wallets || []).length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No wallets</td></tr> : wallets.map((w) => (
                <tr key={w.id}>
                  <td style={tdStyle}><strong>{w.profile?.full_name || w.profile?.email || '—'}</strong></td>
                  <td style={tdStyle}><Badge label={w.profile?.role || 'user'} color={w.profile?.role === 'vendor' ? '#2563eb' : '#6b7280'} /></td>
                  <td style={tdStyle}><strong>₦{parseFloat(w.balance || 0).toLocaleString()}</strong></td>
                </tr>
              ))}
            </FormTable>

            <h3 style={{ fontSize: '1.1rem', margin: '32px 0 16px' }}>Transaction History (Inflow/Outflow)</h3>
            <FormTable head={['User', 'Type', 'Amount', 'Balance After', 'Description', 'Date']}>
              {(walletTx || []).length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No transactions</td></tr> : walletTx.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>{t.profile?.full_name || t.profile?.email || '—'}</td>
                  <td style={tdStyle}><Badge label={t.type} color={['deposit', 'payment', 'escrow_release'].includes(t.type) ? '#16a34a' : '#dc2626'} /></td>
                  <td style={tdStyle}>₦{parseFloat(t.amount).toLocaleString()}</td>
                  <td style={tdStyle}>₦{parseFloat(t.balance_after || 0).toLocaleString()}</td>
                  <td style={tdStyle}>{t.description || '—'}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== TRANSACTIONS ===== */}
        {activeSection === 'transactions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Escrow Transactions</h2>
              <select value={txFilter} onChange={(e) => setTxFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="escrow">In Escrow</option>
                <option value="completed">Completed</option>
                <option value="released">Released</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <FormTable head={['Customer', 'Vendor', 'Business', 'Amount', 'Fee', 'Status', 'Actions']}>
              {(transactions || []).length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No transactions</td></tr> : transactions.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle} data-label="Customer">{t.customer?.full_name || '—'}</td>
                  <td style={tdStyle} data-label="Vendor">{t.vendor?.full_name || '—'}</td>
                  <td style={tdStyle} data-label="Business">{t.business?.name || '—'}</td>
                  <td style={tdStyle} data-label="Amount"><strong>₦{parseFloat(t.amount).toLocaleString()}</strong></td>
                  <td style={tdStyle} data-label="Fee">₦{parseFloat(t.platform_fee || 0).toLocaleString()}</td>
                  <td style={tdStyle} data-label="Status">
                    <Badge label={t.status} color={t.status === 'released' ? '#16a34a' : t.status === 'escrow' ? '#2563eb' : t.status === 'disputed' ? '#dc2626' : t.status === 'cancelled' ? '#6b7280' : '#f59e0b'} />
                  </td>
                  <td style={tdStyle} data-label="Actions">
                    {(t.status === 'escrow' || t.status === 'completed') && <ActionBtn label="Release" onClick={() => handleRelease(t.id)} />}
                    {(t.status === 'pending' || t.status === 'escrow') && <ActionBtn label="Cancel" color="#dc2626" onClick={() => handleCancelTx(t.id)} />}
                  </td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== DISPUTES ===== */}
        {activeSection === 'disputes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Dispute Resolution</h2>
              <select value={disputeFilter} onChange={(e) => setDisputeFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="">All Disputes</option>
                <option value="open">Open</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <FormTable head={['Raised By', 'Business', 'Reason', 'Status', 'Actions']}>
              {(disputes || []).length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No disputes</td></tr> : disputes.map((d) => (
                <tr key={d.id}>
                  <td style={tdStyle} data-label="Raised By">{d.raised_by_profile?.full_name || d.raised_by_profile?.email || '—'}</td>
                  <td style={tdStyle} data-label="Business">{d.business?.name || '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-label="Reason">{d.reason}</td>
                  <td style={tdStyle} data-label="Status">
                    <Badge label={d.status} color={d.status === 'resolved' ? '#16a34a' : d.status === 'dismissed' ? '#6b7280' : d.status === 'reviewing' ? '#2563eb' : '#dc2626'} />
                  </td>
                  <td style={tdStyle} data-label="Actions">
                    {(d.status === 'open' || d.status === 'reviewing') && (
                      <>
                        <ActionBtn label="Resolve" color="#16a34a" onClick={() => handleResolve(d.id, 'resolved')} />
                        <ActionBtn label="Dismiss" color="#6b7280" onClick={() => handleResolve(d.id, 'dismissed')} />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </FormTable>
          </>
        )}

        {/* ===== SUBSCRIPTIONS ===== */}
        {activeSection === 'subscriptions' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Subscription Packages</h2>
            </div>

            <form onSubmit={handleSubPkgSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
              <input placeholder="Package name" value={subPkgName} onChange={e => setSubPkgName(e.target.value)} style={{ ...inputStyle, width: 180 }} required />
              <input placeholder="Description" value={subPkgDesc} onChange={e => setSubPkgDesc(e.target.value)} style={{ ...inputStyle, width: 220 }} />
              <input placeholder="Quarterly price" type="number" value={subPkgQuarterly} onChange={e => setSubPkgQuarterly(e.target.value)} style={{ ...inputStyle, width: 120 }} required />
              <input placeholder="Biannually price" type="number" value={subPkgBiannually} onChange={e => setSubPkgBiannually(e.target.value)} style={{ ...inputStyle, width: 120 }} required />
              <input placeholder="Annually price" type="number" value={subPkgAnnually} onChange={e => setSubPkgAnnually(e.target.value)} style={{ ...inputStyle, width: 120 }} required />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={subPkgRecommended} onChange={e => setSubPkgRecommended(e.target.checked)} />
                Recommended
              </label>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                {editingSubPkg ? 'Update' : 'Add'} Package
              </button>
              {editingSubPkg && <button type="button" onClick={resetSubPkgForm} style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>Cancel</button>}
            </form>
            <div style={{ marginBottom: 16 }}>
              <textarea placeholder="Features (one per line)" value={subPkgFeatures} onChange={e => setSubPkgFeatures(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
            </div>
            {subPkgError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 8 }}>{subPkgError}</p>}

            <FormTable head={['Name', 'Quarterly', 'Biannually', 'Annually', 'Rec.', 'Active', 'Actions']}>
              {(subPackages || []).length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No packages</td></tr> : subPackages.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>₦{p.prices.quarterly.toLocaleString()}</td>
                  <td style={tdStyle}>₦{p.prices.biannually.toLocaleString()}</td>
                  <td style={tdStyle}>₦{p.prices.annually.toLocaleString()}</td>
                  <td style={tdStyle}>{p.recommended ? '✓' : '—'}</td>
                  <td style={tdStyle}>{p.active ? '✓' : '✗'}</td>
                  <td style={tdStyle}>
                    <ActionBtn label="Edit" color="#2563eb" onClick={() => editSubPkg(p)} />
                    <ActionBtn label="Delete" color="#dc2626" onClick={() => handleSubPkgDelete(p.id)} />
                  </td>
                </tr>
              ))}
            </FormTable>

            <h3 style={{ fontSize: '1.1rem', marginTop: 32, marginBottom: 12 }}>Vendor Subscriptions</h3>
            <FormTable head={['Vendor', 'Package', 'Cycle', 'Amount', 'Status', 'Expires', 'Actions']}>
              {(vendorSubs || []).length === 0 ? <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No subscriptions</td></tr> : vendorSubs.map(s => {
                const expiryDate = s.expires_at ? new Date(s.expires_at) : null;
                const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000) : null;
                const isExpired = daysLeft !== null && daysLeft <= 0;
                const nearExpiry = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
                const statusColor = isExpired ? '#6b7280' : s.status === 'active' ? '#16a34a' : s.status === 'pending' ? '#f59e0b' : '#dc2626';
                return (
                <tr key={s.id} style={{ opacity: isExpired ? 0.5 : 1 }}>
                  <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                    <div>{s.vendor_name || s.vendor_id.slice(0, 8) + '…'}</div>
                    {s.vendor_email && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{s.vendor_email}</div>}
                  </td>
                  <td style={tdStyle}>{s.package_name}</td>
                  <td style={tdStyle}>{s.billing_cycle}</td>
                  <td style={tdStyle}>₦{(s.amount || 0).toLocaleString()}</td>
                  <td style={tdStyle}>
                    <Badge label={isExpired ? 'expired' : s.status} color={statusColor} />
                    {nearExpiry && s.status === 'active' && <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: 2 }}>{daysLeft}d left</div>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                    {expiryDate ? (
                      <span style={{ color: isExpired ? '#dc2626' : nearExpiry ? '#f59e0b' : 'inherit' }}>
                        {expiryDate.toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={tdStyle}>
                    {s.status === 'pending' && (
                      <>
                        <ActionBtn label="Verify" color="#16a34a" onClick={() => handleVerifySub(s.id)} />
                        <ActionBtn label="Reject" color="#dc2626" onClick={() => handleRejectSub(s.id)} />
                      </>
                    )}
                  </td>
                </tr>
              )})}
            </FormTable>
          </>
        )}

        {/* ===== WITHDRAWALS ===== */}
        {activeSection === 'withdrawals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Withdrawal Requests</h2>
              <select value={wrFilter} onChange={e => setWrFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '0.85rem' }}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {withdrawReqs.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No withdrawal requests found.</p>
            ) : (
              <FormTable head={['Vendor', 'Amount', 'Bank', 'Account', 'Status', 'Date', 'Note', 'Action']}>
                {withdrawReqs.map(r => (
                  <tr key={r.id}>
                    <td style={tdStyle} data-label="Vendor">{r.user_name || r.user_id}</td>
                    <td style={tdStyle} data-label="Amount"><strong>₦{r.amount.toLocaleString()}</strong></td>
                    <td style={tdStyle} data-label="Bank">{r.bank_name}</td>
                    <td style={tdStyle} data-label="Account">{r.account_number} ({r.account_name})</td>
                    <td style={tdStyle} data-label="Status"><Badge label={r.status} color={r.status === 'approved' || r.status === 'completed' ? '#16a34a' : r.status === 'rejected' ? '#dc2626' : '#f59e0b'} /></td>
                    <td style={tdStyle} data-label="Date">{new Date(r.created_at || r.date).toLocaleDateString()}</td>
                    <td style={tdStyle} data-label="Note">
                      <input
                        value={wrNote[r.id] || ''}
                        onChange={e => setWrNote(p => ({ ...p, [r.id]: e.target.value }))}
                        placeholder="Admin note"
                        style={{ ...inputStyle, fontSize: '0.78rem', padding: '4px 8px', width: 120 }}
                      />
                    </td>
                    <td style={tdStyle}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <ActionBtn label="Approve" color="#16a34a" onClick={async () => {
                            await api.put(`/admin/withdraw-requests/${r.id}/approve`, { note: wrNote[r.id] || '' });
                            fetchWithdrawals();
                          }} />
                          <ActionBtn label="Reject" color="#dc2626" onClick={async () => {
                            await api.put(`/admin/withdraw-requests/${r.id}/reject`, { note: wrNote[r.id] || '' });
                            fetchWithdrawals();
                          }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </FormTable>
            )}
          </>
        )}

        {/* ===== ANALYTICS ===== */}
        {activeSection === 'analytics' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Platform Analytics</h2>
              <select value={analyticsPeriod} onChange={(e) => setAnalyticsPeriod(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            {analyticsLoading ? (
              <Loading />
            ) : !analytics ? (
              <EmptyState message="No analytics data available." />
            ) : (
              <>
                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                  <StatCard icon={Store} label="Businesses" value={analytics.kpis.totalBusinesses} color="#0b3d2e" />
                  <StatCard icon={Users} label="Users" value={analytics.kpis.totalUsers} color="#2563eb" />
                  <StatCard icon={Wallet} label={`Gross Revenue (${analytics.period})`} value={`₦${(analytics.kpis.grossRevenue || 0).toLocaleString()}`} color="#16a34a" />
                  <StatCard icon={TrendingUp} label={`Platform Fees (${analytics.period})`} value={`₦${(analytics.kpis.platformFees || 0).toLocaleString()}`} color="#f59e0b" />
                  <StatCard icon={FileText} label="Transactions" value={analytics.kpis.totalTransactions} color="#6366f1" />
                  <StatCard icon={CreditCard} label="Active Subs" value={`${analytics.kpis.activeSubs}/${analytics.kpis.totalSubs}`} color="#0ea5e9" />
                  <StatCard icon={Scale} label="Disputes" value={analytics.kpis.totalDisputes} color="#dc2626" />
                  <StatCard icon={Star} label="Reviews" value={analytics.kpis.totalReviews} color="#db2777" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
                  {/* Revenue chart */}
                  <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Revenue (net of fees)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      {analytics.period === '1y' ? 'Last 365 days' : `Last ${analytics.period}`} · ₦{(analytics.kpis.grossRevenue || 0).toLocaleString()} gross
                    </p>
                    {analytics.revenueSeries.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No revenue recorded in this period.</p>
                    ) : (
                      <AdminRevenueChart series={analytics.revenueSeries} />
                    )}
                  </div>

                  {/* Top categories + subscription mix */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20 }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Top Categories</h3>
                      {(analytics.topCategories || []).length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No categories yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={Math.max(160, analytics.topCategories.length * 36)}>
                          <BarChart data={analytics.topCategories} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} stroke="var(--color-border)" />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--color-text)' }} stroke="var(--color-border)" />
                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [`${v} businesses`, 'Count']} />
                            <Bar dataKey="businesses" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: 20 }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Subscription Mix</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active', value: analytics.kpis.activeSubs },
                              { name: 'Inactive', value: Math.max(0, analytics.kpis.totalSubs - analytics.kpis.activeSubs) },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            <Cell fill="#16a34a" />
                            <Cell fill="#cbd5e1" />
                          </Pie>
                          <Tooltip contentStyle={chartTooltipStyle} formatter={(v, n) => [`${v}`, n]} />
                          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>New users (period)</span><strong>{analytics.growth?.newUsers ?? 0}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>New businesses (period)</span><strong>{analytics.growth?.newBusinesses ?? 0}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ===== SETTINGS ===== */}
        {activeSection === 'settings' && (
          <>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Platform Settings</h2>
            <div style={{ padding: 20, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', maxWidth: 480 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>Platform Fee (%)</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
                  This fee is deducted from each payment released to vendors. Set to 0 to make the platform free.
                </p>
                <input
                  type="number"
                  value={platformFee}
                  onChange={e => setPlatformFee(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                  style={{ ...inputStyle, width: 120 }}
                />
              </div>
              {settingsError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 8 }}>{settingsError}</p>}
              {settingsMsg && <p style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: 8 }}>{settingsMsg}</p>}
              <button
                onClick={async () => {
                  setSettingsError(''); setSettingsMsg('');
                  const val = parseFloat(platformFee);
                  if (isNaN(val) || val < 0 || val > 100) { setSettingsError('Enter a valid percentage (0-100)'); return; }
                  try {
                    const data = await api.put('/admin/platform-config', { platformFeePercent: val });
                    if (data.success) setSettingsMsg(`Platform fee updated to ${val}%`);
                    else setSettingsError(data.error);
                  } catch (err) { setSettingsError(err.response?.data?.error || 'Failed to update'); }
                }}
                style={{ padding: '8px 20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}
              >
                Save
              </button>
            </div>
          </>
        )}

        {activeSection === 'locations' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--color-border)', paddingBottom: 8 }}>
              {['states', 'lgas', 'cities'].map(t => (
                <button key={t} onClick={() => { setLocTab(t); resetLocForm(); }} style={{ padding: '8px 16px', border: 'none', background: locTab === t ? 'var(--color-primary)' : 'transparent', color: locTab === t ? '#fff' : 'var(--color-text)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{t}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input value={locName} onChange={e => setLocName(e.target.value)} placeholder="Name" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
              {locTab !== 'states' && (
                <select value={locStateId} onChange={e => setLocStateId(e.target.value)} style={inputStyle}>
                  <option value="">Select State</option>
                  {locStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {locTab === 'states' && (
                <select value={locCountryId} onChange={e => setLocCountryId(e.target.value)} style={inputStyle}>
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {locTab === 'cities' && (
                <select value={locLgaId} onChange={e => setLocLgaId(e.target.value)} style={inputStyle}>
                  <option value="">Select LGA</option>
                  {locLgas.filter(l => !locStateId || l.state_id === locStateId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              <button onClick={handleLocSave} className="btn-primary" style={{ padding: '8px 20px' }}>{editingLoc ? 'Update' : 'Add'}</button>
              {editingLoc && <button onClick={resetLocForm} style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'none', cursor: 'pointer' }}>Cancel</button>}
            </div>
            {locError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 12 }}>{locError}</p>}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Slug</th>
                    {locTab === 'states' && <th style={thStyle}>Country</th>}
                    {locTab === 'lgas' && <th style={thStyle}>State</th>}
                    {locTab === 'cities' && <><th style={thStyle}>State</th><th style={thStyle}>LGA</th></>}
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(locTab === 'states' ? locStates : locTab === 'lgas' ? locLgas : locCities).length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No {locTab} found</td></tr>
                  ) : (locTab === 'states' ? locStates : locTab === 'lgas' ? locLgas : locCities).map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={tdStyle}>{item.name}</td>
                      <td style={tdStyle}>{item.slug}</td>
                      {locTab === 'states' && <td style={tdStyle}>{item.country?.name || '-'}</td>}
                      {locTab === 'lgas' && <td style={tdStyle}>{item.state?.name || '-'}</td>}
                      {locTab === 'cities' && <><td style={tdStyle}>{item.state?.name || '-'}</td><td style={tdStyle}>{item.lga?.name || '-'}</td></>}
                      <td style={tdStyle}>
                        <button onClick={() => handleLocEdit(item)} style={{ marginRight: 8, padding: '4px 10px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'none', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleLocDelete(item.id)} style={{ padding: '4px 10px', fontSize: '0.8rem', border: 'none', borderRadius: 'var(--radius)', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ===== BUSINESS REVIEW MODAL ===== */}
        {reviewBiz && (
          <div className="admin-modal-overlay" onClick={() => setReviewBiz(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', maxWidth: 680, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Review Business: {reviewBiz.name}</h2>
                <button onClick={() => setReviewBiz(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}><X size={20} /></button>
              </div>

              <div style={{ padding: 20 }}>
                {/* Business Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <div><strong>Name:</strong><br /><span>{reviewBiz.name}</span></div>
                  <div><strong>Category:</strong><br /><span>{reviewBiz.category?.name || '—'}</span></div>
                  <div><strong>Owner:</strong><br /><span>{reviewBiz.owner?.full_name || reviewBiz.owner?.email || '—'}</span></div>
                  <div><strong>Owner Email:</strong><br /><span>{reviewBiz.owner?.email || '—'}</span></div>
                  <div><strong>Owner Phone:</strong><br /><span>{reviewBiz.owner?.phone || '—'}</span></div>
                  <div><strong>Business Phone:</strong><br /><span>{reviewBiz.phone || '—'}</span></div>
                  <div><strong>Email:</strong><br /><span>{reviewBiz.email || '—'}</span></div>
                  <div><strong>Website:</strong><br /><span>{reviewBiz.website ? <a href={reviewBiz.website} target="_blank" rel="noreferrer">{reviewBiz.website}</a> : '—'}</span></div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong><br /><span>{[reviewBiz.address, reviewBiz.city, reviewBiz.state].filter(Boolean).join(', ') || '—'}</span></div>
                  {(reviewBiz.latitude && reviewBiz.longitude) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong>Coordinates:</strong><br />
                      <span>{reviewBiz.latitude}, {reviewBiz.longitude}</span>
                      <div style={{ marginTop: 6, height: 150, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <iframe
                          title="Map"
                          width="100%" height="100%" frameBorder="0"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${reviewBiz.longitude - 0.01},${reviewBiz.latitude - 0.01},${reviewBiz.longitude + 0.01},${reviewBiz.latitude + 0.01}&layer=mapnik&marker=${reviewBiz.latitude},${reviewBiz.longitude}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: 20 }}>
                  <strong>Description:</strong>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{reviewBiz.description || 'No description'}</p>
                </div>

                {/* Status */}
                <div style={{ marginBottom: 20 }}>
                  <strong>KYC Status:</strong>{' '}
                  <Badge label={reviewBiz.verification_status || 'pending'} color={reviewBiz.verification_status === 'verified' ? '#16a34a' : reviewBiz.verification_status === 'rejected' ? '#dc2626' : '#f59e0b'} />
                  {reviewBiz.verified_at && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>on {new Date(reviewBiz.verified_at).toLocaleDateString()}</span>}
                </div>

                {/* Business Images */}
                {(reviewBiz.images || []).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <strong>Business Location Photos ({reviewBiz.images.length})</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {reviewBiz.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ width: 140, height: 110, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)', display: 'block' }}>
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications / Licenses */}
                {(reviewBiz.certifications || []).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <strong>Licenses & Certifications ({reviewBiz.certifications.length})</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {reviewBiz.certifications.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{
                          width: 140, height: 110, borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                          border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--color-bg)', textDecoration: 'none', color: 'var(--color-text)',
                        }}>
                          {url.match(/\.(pdf)$/i) ? (
                            <div style={{ textAlign: 'center', padding: 8 }}>
                              <FileText size={24} style={{ marginBottom: 4, opacity: 0.5 }} />
                              <span style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{url.split('/').pop()}</span>
                            </div>
                          ) : (
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured / Recommended Toggles */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" checked={reviewBiz.is_featured || false} onChange={async (e) => { await api.put(`/businesses/${reviewBiz.id}`, { is_featured: e.target.checked }); setReviewBiz({ ...reviewBiz, is_featured: e.target.checked }); }} />
                    <span style={{ fontSize: '0.9rem' }}>⭐ Featured</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={reviewBiz.is_recommended || false} onChange={async (e) => { await api.put(`/businesses/${reviewBiz.id}`, { is_recommended: e.target.checked }); setReviewBiz({ ...reviewBiz, is_recommended: e.target.checked }); }} />
                    <span style={{ fontSize: '0.9rem' }}>✓ Recommended</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                  {reviewBiz.verification_status !== 'verified' && (
                    <button onClick={() => handleVerify(reviewBiz.id, 'verified')} style={{ flex: 1, padding: '10px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <CheckCircle size={16} /> Approve & Verify
                    </button>
                  )}
                  {reviewBiz.verification_status !== 'rejected' && (
                    <button onClick={() => { if (confirm('Reject this business application?')) handleVerify(reviewBiz.id, 'rejected'); }} style={{ flex: 1, padding: '10px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <XCircle size={16} /> Reject
                    </button>
                  )}
                  <button onClick={() => { if (confirm('Delete this business permanently?')) handleBizDelete(reviewBiz.id); }} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
