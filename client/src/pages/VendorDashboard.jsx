import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import FundWalletModal from '../components/payment/FundWalletModal';
import LocationPicker from '../components/LocationPicker';
import Alert from '../components/common/Alert';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  LayoutDashboard, Store, DollarSign, ShieldAlert, ShieldCheck, TrendingUp, Calendar,
  ArrowUpFromLine, Clock, CheckCircle, Plus, X, Upload, Image,
  FileText, ChevronRight, Menu, Wallet, Loader, Star, Crosshair,
  Tag,
} from 'lucide-react';

const statusColors = {
  escrow: '#3b82f6', completed: '#16a34a', released: '#059669',
  cancelled: '#6b7280', disputed: '#dc2626', pending: '#f59e0b',
};

const SIDEBAR_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'businesses', label: 'My Businesses', icon: Store },
  { key: 'transactions', label: 'Transactions', icon: DollarSign },
  { key: 'verification', label: 'Verification', icon: ShieldCheck },
  { key: 'subscription', label: 'Subscription', icon: ShieldAlert },
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

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)', fontSize: '0.85rem', background: 'var(--color-bg)',
  color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)',
  marginBottom: 6,
};

const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', padding: '20px 24px',
};

function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--radius-pill)',
      fontSize: '0.72rem', fontWeight: 600, background: `${color}15`, color,
      textTransform: 'capitalize',
    }}>
      {label}
    </span>
  );
}

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

function titleCase(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Group a vendor's listings into a portfolio: by category type, then by a
// sensible sub-group (property_type for properties/rentals, vehicle_type for
// vehicles, city for services).
function portfolioGroups(businesses) {
  const order = ['property', 'rental', 'vehicle', 'service'];
  const labelMap = { property: 'Properties', rental: 'Rentals', vehicle: 'Vehicles', service: 'Services' };
  const subKeyFor = (b) => {
    const t = b.category?.type;
    if (t === 'vehicle') return b.vehicle_type ? titleCase(b.vehicle_type) : 'Vehicles';
    if (t === 'service') return b.city ? titleCase(b.city) : 'Other Areas';
    return b.property_type ? titleCase(b.property_type) : 'Properties';
  };
  const groups = [];
  for (const t of order) {
    const items = (businesses || []).filter((b) => (b.category?.type || 'service') === t);
    if (items.length === 0) continue;
    const sub = {};
    for (const b of items) {
      const k = subKeyFor(b);
      (sub[k] = sub[k] || []).push(b);
    }
    const subgroups = Object.entries(sub)
      .map(([label, list]) => ({ label, list }))
      .sort((a, b) => b.list.length - a.list.length);
    groups.push({ type: t, label: labelMap[t] || titleCase(t), count: items.length, subgroups });
  }
  return groups;
}

function AvailabilityControls({ b, onUpdate, busy }) {
  const t = b.category?.type;
  if (t === 'service') return null;
  const status = b.availability_status || 'available';

  const btn = {
    padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontSize: '0.72rem',
    fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', border: 'none', opacity: busy ? 0.6 : 1,
  };

  if (status === 'available') {
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onUpdate(b, 'sold')} disabled={busy} title="This item has been sold" style={{ ...btn, background: '#dc2626', color: '#fff' }}>
          Mark Sold
        </button>
        <button onClick={() => onUpdate(b, 'rented')} disabled={busy} title="This item has been rented/leased" style={{ ...btn, background: '#d97706', color: '#fff' }}>
          Mark Rented
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge label={status} color={status === 'sold' ? '#dc2626' : '#d97706'} />
      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
        {b.sold_at ? new Date(b.sold_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
      </span>
      <button onClick={() => onUpdate(b, 'available')} disabled={busy} style={{ ...btn, background: '#059669', color: '#fff' }}>
        Re-list
      </button>
    </div>
  );
}

function PortfolioListingCard({ b, onEdit, onDelete, onAvailability, availabilityBusy, compact }) {
  return (
    <div style={cardStyle}>
      {(b.images || []).length > 0 && (
        <div style={{ position: 'relative', width: '100%', height: compact ? 140 : 150, borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 10, background: 'var(--color-bg)' }}>
          <img
            src={b.images[0]}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: (b.availability_status === 'sold' || b.availability_status === 'rented') ? 'grayscale(0.9) brightness(0.75)' : undefined,
            }}
          />
          {(b.availability_status === 'sold' || b.availability_status === 'rented') && (
            <span style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', letterSpacing: 1 }}>
              {b.availability_status === 'sold' ? 'SOLD' : 'RENTED'}
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: compact ? '0.95rem' : '1rem', fontWeight: 700 }}>{b.name}</h4>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '4px 0' }}>{b.address}{b.city ? `, ${b.city}` : ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {b.is_direct_from_owner && ['property', 'rental'].includes(b.category?.type) && (
            <Badge label="Direct from Owner" color="#059669" />
          )}
          <Badge
            label={b.verification_status || 'pending'}
            color={b.verification_status === 'verified' ? '#16a34a' : b.verification_status === 'rejected' ? '#dc2626' : '#f59e0b'}
          />
        </div>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        <Star size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2, color: '#f59e0b' }} />
        {b.rating_avg || 0} ({b.rating_count || 0} reviews)
      </p>
      <AvailabilityControls b={b} onUpdate={onAvailability} busy={availabilityBusy === b.id} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => onEdit(b)} style={btnOutline}>Edit</button>
        <button onClick={() => onDelete(b)} style={{ ...btnOutline, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Delete</button>
      </div>
    </div>
  );
}

function PortfolioView({ businesses, onEdit, onDelete, onAvailability, availabilityBusy, collapsed, onToggleGroup, compact }) {
  const groups = portfolioGroups(businesses);
  if (groups.length === 0) return null;

  return groups.map((group) => (
    <div key={group.type} style={{ marginBottom: 24 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}
        onClick={() => onToggleGroup(group.type)}
      >
        <ChevronRight size={16} style={{ color: 'var(--color-primary)', transform: collapsed[group.type] ? '' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
        <Tag size={16} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--color-secondary)' }}>{group.label}</h3>
        <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, borderRadius: '999px', padding: '2px 10px' }}>
          {group.count}
        </span>
      </div>
      {!collapsed[group.type] && group.subgroups.map((sub) => (
        <div key={sub.label} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {sub.label}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{sub.list.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {sub.list.map((b) => (
              <PortfolioListingCard key={b.id} b={b} onEdit={onEdit} onDelete={onDelete} onAvailability={onAvailability} availabilityBusy={availabilityBusy} compact={compact} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ));
}

function VendorDashboard() {
  const { user, profile, features } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [activeSection, isMobile]);

  const [myBusinesses, setMyBusinesses] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [availabilityBusy, setAvailabilityBusy] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', address: '', city: '', state: '', lga: '', phone: '', latitude: '', longitude: '', email: '', website: '', images: [], certifications: [], serviceTerms: '', categoryId: '', listingType: '', propertyType: '', bedrooms: '', isDirectFromOwner: true });
  const [formError, setFormError] = useState('');
  const [categories, setCategories] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAcctNo, setWithdrawAcctNo] = useState('');
  const [withdrawAcctName, setWithdrawAcctName] = useState('');
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [walletMsg, setWalletMsg] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editBiz, setEditBiz] = useState(null);
  const fileInputRef = useRef(null);
  const certInputRef = useRef(null);
  const [vMilestonesMap, setVMilestonesMap] = useState({});
  const [vExpandedTx, setVExpandedTx] = useState(null);
  const [confirmDeleteBiz, setConfirmDeleteBiz] = useState(null);
  const [confirmMilestone, setConfirmMilestone] = useState(null);
  const [subPackages, setSubPackages] = useState([]);
  const [mySub, setMySub] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('quarterly');
  const [subMsg, setSubMsg] = useState('');
  const [myVerification, setMyVerification] = useState(null);
  const [vForm, setVForm] = useState({ idType: '', idNumber: '', notes: '' });
  const [vDocs, setVDocs] = useState([]);
  const [vBusy, setVBusy] = useState(false);
  const [vMsg, setVMsg] = useState('');
  const [vErr, setVErr] = useState('');
  const vDocInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!user) return navigate('/login');
    fetchBusinesses();
    fetchWallet();
    fetchTransactions();
    fetchSubPackages();
    fetchMySub();
    fetchWithdrawRequests();
    fetchMyVerification();
    api.get('/categories').then((res) => {
      if (res.success) setCategories(res.data);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (activeSection === 'verification') fetchMyVerification();
  }, [activeSection]);

  async function fetchBusinesses() {
    try {
      const res = await api.get('/businesses');
      if (res.success) setMyBusinesses(res.data.filter((b) => b.owner_id === user.id));
    } catch (err) { console.error('fetch businesses error:', err); }
  }

  async function fetchMyVerification() {
    try {
      const res = await api.get('/verification/my');
      if (res.success && res.data) {
        setMyVerification(res.data);
        setVForm({
          idType: res.data.id_type || '',
          idNumber: res.data.id_number || '',
          notes: res.data.notes || '',
        });
        setVDocs(Array.isArray(res.data.documents) ? res.data.documents : []);
      } else {
        setMyVerification(null);
      }
    } catch (err) { console.error('fetch verification error:', err); }
  }

  async function handleKycUpload(files) {
    if (!files.length) return;
    setVBusy(true);
    setVErr('');
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const res = await api.post('/upload', fd);
      if (res.success) {
        const uploaded = Array.isArray(res.data) ? res.data : [res.data];
        const docs = uploaded.map((u) => ({
          type: 'supporting_document',
          url: u.url || u.file_id,
          name: u.name || u.original_name || 'Document',
        }));
        setVDocs((prev) => [...prev, ...docs]);
        toast?.success?.(`Uploaded ${docs.length} document${docs.length === 1 ? '' : 's'}.`);
      } else {
        setVErr(res.error?.message || 'Upload failed.');
      }
    } catch (err) {
      setVErr(err.response?.data?.error || 'Upload failed.');
    } finally {
      setVBusy(false);
    }
  }

  function removeVDoc(index) {
    setVDocs((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitVerification(e) {
    e.preventDefault();
    setVErr('');
    setVMsg('');
    if (!vForm.idType) { setVErr('Select your ID type.'); return; }
    if (vForm.idNumber.trim().length < 3) { setVErr('Enter a valid ID number.'); return; }
    if (vDocs.length === 0) { setVErr('Upload at least one document (e.g. your NIN slip).'); return; }

    setVBusy(true);
    try {
      const res = await api.post('/verification/submit', {
        business_name: myBusinesses[0]?.name,
        id_type: vForm.idType,
        id_number: vForm.idNumber.trim(),
        notes: vForm.notes || undefined,
        documents: vDocs,
      });
      if (res.success) {
        setMyVerification(res.data);
        setVMsg('Verification submitted! Our team reviews applications within 1–2 business days.');
        toast?.success?.('Verification submitted successfully.');
      } else {
        setVErr(res.error?.message || res.error || 'Could not submit verification.');
      }
    } catch (err) {
      setVErr(err.response?.data?.error || 'Could not submit verification.');
    } finally {
      setVBusy(false);
    }
  }

  function toggleGroup(type) {
    setCollapsedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  async function updateAvailability(b, status) {
    setAvailabilityBusy(b.id);
    try {
      const res = await api.put(`/businesses/${b.id}`, { availability_status: status });
      if (res.success) {
        toast?.success?.(status === 'available' ? `${b.name} re-listed as available.` : `${b.name} marked as ${status}.`);
        fetchBusinesses();
      } else {
        toast?.error?.(res.error?.message || res.error || 'Could not update availability');
      }
    } catch (err) {
      toast?.error?.(err.response?.data?.error || 'Could not update availability');
    } finally {
      setAvailabilityBusy(null);
    }
  }

  async function fetchWallet() {
    try {
      const res = await api.get('/payments/wallet');
      if (res.success) setWallet(res.data);
    } catch (err) { console.error('fetch wallet error:', err); }
  }

  async function fetchTransactions() {
    try {
      const res = await api.get('/transactions/my');
      if (res.success) setTransactions(res.data);
    } catch (err) { console.error('fetch transactions error:', err); }
  }

  async function fetchWithdrawRequests() {
    try {
      const res = await api.get('/payments/withdrawals/my');
      if (res.success) setWithdrawRequests(res.data);
    } catch {}
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    walletMsg && setWalletMsg('');
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return setWalletMsg('Enter a valid amount');
    if (!withdrawBank || !withdrawAcctNo || !withdrawAcctName) return setWalletMsg('Fill in all bank fields');
    try {
      const res = await api.post('/payments/withdraw-request', {
        amount: amt, bankName: withdrawBank, accountNumber: withdrawAcctNo, accountName: withdrawAcctName,
      });
      if (res.success) {
        fetchWallet();
        setWithdrawAmount('');
        setWithdrawBank('');
        setWithdrawAcctNo('');
        setWithdrawAcctName('');
        setWalletMsg(`Withdrawal request for ₦${amt.toLocaleString()} submitted for approval`);
        fetchWithdrawRequests();
      } else setWalletMsg(res.error?.message || 'Withdrawal failed');
    } catch { setWalletMsg('Withdrawal failed'); }
  }

  async function fetchSubPackages() { try { const res = await api.get('/subscriptions/packages'); if (res.success) setSubPackages(res.data.filter(p => p.active)); } catch {} }
  async function fetchMySub() {
    try {
      const res = await api.get('/subscriptions/my');
      if (res.success) {
        const prio = { active: 0, pending: 1, expired: 2, rejected: 3 };
        const sorted = (res.data || []).sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9));
        setMySub(sorted[0] || null);
      }
    } catch {}
  }
  async function handleSubscribe(e) {
    e.preventDefault(); setSubMsg('');
    if (!selectedPkg) { setSubMsg('Select a package'); return; }
    try {
      const res = await api.post('/subscriptions/initialize-payment', { packageId: selectedPkg, billingCycle: selectedCycle });
      if (res.success) {
        setSubMsg('Redirecting to payment...');
        window.location.href = res.data.authorization_url;
      } else setSubMsg(res.error?.message || 'Subscription failed');
    } catch (err) { setSubMsg(err.response?.data?.error || 'Subscription failed'); }
  }

  async function handleFileUpload(files, field) {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const res = await api.post('/upload', fd);
      if (res.success) {
        const uploaded = Array.isArray(res.data) ? res.data : [res.data];
        const urls = uploaded.map((u) => u.url || u.file_id);
        setForm((prev) => ({ ...prev, [field]: [...(prev[field] || []), ...urls] }));
      }
    } catch (err) { console.error('Upload failed:', err); }
    setUploading(false);
  }

  function removeFile(field, index) {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  }

  function resetForm() {
    setForm({ name: '', description: '', address: '', city: '', state: '', lga: '', phone: '', latitude: '', longitude: '', email: '', website: '', images: [], certifications: [], serviceTerms: '', categoryId: '', listingType: '', propertyType: '', bedrooms: '', isDirectFromOwner: true });
    setEditBiz(null);
    setFormError('');
  }

  function startEdit(biz) {
    setEditBiz(biz.id);
    setForm({
      name: biz.name, description: biz.description || '', address: biz.address || '',
      city: biz.city || '', state: biz.state || '', lga: '', phone: biz.phone || '',
      latitude: biz.latitude || '', longitude: biz.longitude || '',
      email: biz.email || '', website: biz.website || '',
      images: biz.images || [], certifications: biz.certifications || [],
      serviceTerms: biz.service_terms || biz.serviceTerms || '',
      categoryId: biz.category_id || '',
      listingType: biz.listing_type || '',
      propertyType: biz.property_type || '',
      bedrooms: biz.bedrooms ?? '',
      isDirectFromOwner: biz.is_direct_from_owner ?? true,
    });
    setShowForm(true);
  }

  async function createBusiness(e) {
    e.preventDefault();
    setFormError('');
    try {
      const { _lga, serviceTerms, categoryId, listingType, propertyType, bedrooms, isDirectFromOwner, ...restForm } = form;
      const payload = { ...restForm, category_id: categoryId };
      if (listingType) payload.listing_type = listingType;
      if (propertyType) payload.property_type = propertyType;
      if (bedrooms !== '') payload.bedrooms = parseInt(bedrooms, 10);
      if (isDirectFromOwner !== undefined) payload.is_direct_from_owner = isDirectFromOwner;
      if (payload.latitude) payload.latitude = parseFloat(payload.latitude);
      else delete payload.latitude;
      if (payload.longitude) payload.longitude = parseFloat(payload.longitude);
      else delete payload.longitude;
      if (serviceTerms) payload.serviceTerms = serviceTerms;
      // Strip empty strings for optional fields so Zod doesn't reject them
      for (const k of ['email', 'website', 'phone', 'description', 'address', 'city', 'state']) {
        if (payload[k] === '') delete payload[k];
      }
      if (editBiz) {
        const res = await api.put(`/businesses/${editBiz}`, payload);
        if (!res.success) { setFormError(res.error?.message || 'Update failed'); return; }
      } else {
        const res = await api.post('/businesses', payload);
        if (!res.success) { setFormError(res.error?.message || 'Creation failed'); return; }
      }
      setShowForm(false);
      resetForm();
      toast.success(editBiz ? 'Business updated.' : 'Business submitted for review.');
      fetchBusinesses();
    } catch (err) {
      const m = err.message || 'Failed to save business';
      setFormError(m);
      toast.error(m);
      if (err.details?.length > 0) {
        console.error('Validation errors:', err.details);
      }
    }
  }

  async function handleDeleteBusiness(id) {
    try {
      await api.delete(`/businesses/${id}`);
      toast.success('Business deleted.');
      fetchBusinesses();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete business');
    }
    setConfirmDeleteBiz(null);
  }

  async function handleMarkComplete(txId) {
    try {
      const res = await api.put(`/transactions/${txId}/complete`);
      if (res.success) fetchTransactions();
    } catch {}
  }

  const vendorTransactions = transactions.filter(tx => tx.vendor_id === user.id);

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
          {profile?.role === 'property_owner' ? 'Property Owner Menu' : 'Vendor Menu'}
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
        {features.includes('analytics') ? (
          <Link to="/analytics" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500, fontSize: '0.88rem' }}>
            <TrendingUp size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            Analytics
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            <TrendingUp size={18} style={{ flexShrink: 0 }} />
            Analytics
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#f59e0b' }}>🔒 Pro+</span>
          </div>
        )}
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
                {profile?.role === 'property_owner' ? 'Property Owner Dashboard' : 'Vendor Dashboard'}
              </h1>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Welcome back, {profile?.full_name || user?.email}
            </p>
          </div>

          {/* Overview */}
          {activeSection === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard icon={Wallet} label="Wallet Balance" value={`₦${Number(wallet?.balance || 0).toLocaleString()}`} color="#0b3d2e" />
                <StatCard icon={Store} label="My Listings" value={myBusinesses.length} color="#3b82f6" />
                <StatCard icon={DollarSign} label="Active Transactions" value={vendorTransactions.filter(tx => tx.status === 'escrow').length} color="#f59e0b" />
                <StatCard icon={Star} label="Wallet" value={`₦${Number(wallet?.balance || 0).toLocaleString()}`} color="#8b5cf6" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div style={cardStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={16} style={{ color: 'var(--color-primary)' }} /> Wallet
                  </h3>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 16 }}>
                    ₦{Number(wallet?.balance || 0).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }} onClick={() => setShowFundModal(true)}>
                      <Upload size={15} /> Fund Wallet
                    </button>
                  </div>
                  <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                      <input type="number" step="any" min="0" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Amount (₦)" style={inputStyle} />
                      <input value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)} placeholder="Bank name (e.g. GTBank)" style={inputStyle} />
                      <input value={withdrawAcctNo} onChange={(e) => setWithdrawAcctNo(e.target.value)} placeholder="Account number" style={inputStyle} />
                      <input value={withdrawAcctName} onChange={(e) => setWithdrawAcctName(e.target.value)} placeholder="Account name" style={inputStyle} />
                    </div>
                    <button type="submit" style={{ ...btnOutline, justifyContent: 'center' }}>
                      <ArrowUpFromLine size={14} /> Request Withdrawal
                    </button>
                  </form>
                  {walletMsg && (
                    <p style={{ fontSize: '0.8rem', marginTop: 8, color: walletMsg.includes('failed') ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {walletMsg}
                    </p>
                  )}
                  {withdrawRequests.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>Recent Withdrawal Requests</p>
                      <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: '0.8rem' }}>
                        {withdrawRequests.slice().reverse().slice(0, 5).map((r) => (
                          <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>₦{r.amount.toLocaleString()} → {r.bank_name}</span>
                            <Badge label={r.status} color={r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? '#dc2626' : '#f59e0b'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={cardStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Store size={16} style={{ color: 'var(--color-primary)' }} /> Quick Actions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); setActiveSection('businesses'); }} style={{ ...btnPrimary, justifyContent: 'center' }}>
                      <Plus size={15} /> {showForm ? 'Cancel' : 'Add New Business'}
                    </button>
                    {features.includes('analytics') ? (
                      <Link to="/analytics" style={{ ...btnOutline, justifyContent: 'center', textDecoration: 'none' }}>
                        <TrendingUp size={14} /> View Analytics
                      </Link>
                    ) : (
                      <button disabled style={{ ...btnOutline, justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
                        <TrendingUp size={14} /> Analytics (Upgrade Required)
                      </button>
                    )}
                    <Link to="/availability" style={{ ...btnOutline, justifyContent: 'center', textDecoration: 'none' }}>
                      <Calendar size={14} /> Manage Availability
                    </Link>
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>My Portfolio</h3>
              {myBusinesses.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  <Store size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No listings yet. Add your first property, rental, vehicle, or service.</p>
                </div>
              ) : (
                <PortfolioView
                  businesses={myBusinesses}
                  onEdit={startEdit}
                  onDelete={setConfirmDeleteBiz}
                  onAvailability={updateAvailability}
                  availabilityBusy={availabilityBusy}
                  collapsed={collapsedGroups}
                  onToggleGroup={toggleGroup}
                  compact
                />
              )}
            </>
          )}

          {/* My Businesses (full section) */}
          {activeSection === 'businesses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>My Businesses</h2>
                <button onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); }} style={btnPrimary}>
                  {showForm ? <X size={15} /> : <Plus size={15} />}
                  {showForm ? 'Cancel' : 'Add Business'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={createBusiness} style={{ ...cardStyle, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>
                    {editBiz ? 'Edit Business' : 'Register Your Business'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Business Name *</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} placeholder="e.g. Klinfix Laundry" />
                    </div>
                    <div>
                      <label style={labelStyle}>Category *</label>
                      <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required style={inputStyle}>
                        <option value="">Select category</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    {['property', 'rental'].includes(categories.find(c => c.id === form.categoryId)?.type) && (
                      <>
                        <div>
                          <label style={labelStyle}>Listing Type</label>
                          <select value={form.listingType} onChange={(e) => setForm({ ...form, listingType: e.target.value })} style={inputStyle}>
                            <option value="">Select listing type</option>
                            <option value="sale">For Sale</option>
                            <option value="rent">For Rent</option>
                            <option value="lease">For Lease</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Property Type</label>
                          <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} style={inputStyle}>
                            <option value="">Select property type</option>
                            {['apartment', 'duplex', 'bungalow', 'terraced', 'detached', 'penthouse', 'land', 'commercial'].map(p => (
                              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Bedrooms</label>
                          <select value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} style={inputStyle}>
                            <option value="">Any</option>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                              <option key={n} value={n}>{n === 0 ? 'Studio' : n}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={form.isDirectFromOwner}
                              onChange={(e) => setForm({ ...form, isDirectFromOwner: e.target.checked })}
                            />
                            I am the direct owner (no middlemen/agents)
                          </label>
                        </div>
                      </>
                    )}
                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                      <label style={labelStyle}>Description *</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe your services..." />
                    </div>
                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                      <label style={labelStyle}>Business Address *</label>
                      <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required style={inputStyle} placeholder="Street address" />
                    </div>
                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                      <label style={labelStyle}>Location *</label>
                      <LocationPicker state={form.state} lga={form.lga} city={form.city} onChange={({ state, lga, city }) => setForm({ ...form, state, lga, city })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone *</label>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required style={inputStyle} placeholder="+234 800 000 0000" />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="business@example.com" />
                    </div>
                    <div>
                      <label style={labelStyle}>Website</label>
                      <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} style={inputStyle} placeholder="https://example.com" />
                    </div>
                    <div>
                      <label style={labelStyle}>Coordinates</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Latitude" />
                        <button type="button" onClick={() => {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setForm({ ...form, latitude: String(pos.coords.latitude) }),
                            () => toast?.error?.('Could not get location')
                          );
                        }} style={{ ...btnOutline, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          <Crosshair size={14} /> Lat
                        </button>
                        <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Longitude" />
                        <button type="button" onClick={() => {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setForm({ ...form, longitude: String(pos.coords.longitude) }),
                            () => toast?.error?.('Could not get location')
                          );
                        }} style={{ ...btnOutline, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          <Crosshair size={14} /> Lng
                        </button>
                      </div>
                    </div>

                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                      <label style={labelStyle}>Gallery Images</label>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
                        Upload multiple images. The first image will be the cover photo on your business listing.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {(form.images || []).map((url, i) => (
                          <div key={i} style={{ position: 'relative', width: 120, height: 90, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: i === 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
                            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {i === 0 && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--color-primary)', color: '#fff', fontSize: '0.6rem', textAlign: 'center', padding: '2px 0', fontWeight: 600 }}>Cover</span>}
                            <button type="button" onClick={() => removeFile('images', i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}><X size={12} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: 120, height: 90, border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {uploading ? <Loader size={18} className="spin" /> : <><Image size={20} /><span>Add Image</span></>}
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { handleFileUpload(e.target.files, 'images'); e.target.value = ''; }} />
                    </div>

                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                      <label style={labelStyle}>Licenses & Certifications</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {(form.certifications || []).map((url, i) => (
                          <div key={i} style={{ position: 'relative', width: 100, height: 80, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                            {url.match(/\.(pdf)$/i) ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', fontSize: '0.7rem', textAlign: 'center', padding: 4 }}>{url.split('/').pop()}</div>
                            ) : (
                              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <button type="button" onClick={() => removeFile('certifications', i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}><X size={12} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => certInputRef.current?.click()} disabled={uploading} style={{ width: 100, height: 80, border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {uploading ? <Loader size={18} className="spin" /> : <><FileText size={20} /><span>Add License</span></>}
                        </button>
                      </div>
                      <input ref={certInputRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { handleFileUpload(e.target.files, 'certifications'); e.target.value = ''; }} />
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Upload business licenses, permits, or professional certifications (images or PDF)</p>
                    </div>

                    <div style={{ gridColumn: isMobile ? '1 / -1' : '1 / -1' }}>
                      <label style={labelStyle}>Service Terms & Disclaimers</label>
                      <textarea
                        value={form.serviceTerms}
                        onChange={(e) => setForm({ ...form, serviceTerms: e.target.value })}
                        placeholder="Set your service-specific terms: warranty period, what's covered, exclusions, cancellation policy, etc."
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                  {formError && <div style={{ marginTop: 12 }}><Alert type="error" dismissible onDismiss={() => setFormError('')}>{formError}</Alert></div>}
                  <button type="submit" style={{ ...btnPrimary, marginTop: 16 }} disabled={uploading}>
                    {uploading ? <Loader size={15} /> : <Plus size={15} />}
                    {editBiz ? 'Update Business' : 'Submit for Review'}
                  </button>
                </form>
              )}

              {myBusinesses.length === 0 && !showForm ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
                  <Store size={56} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <h3 style={{ color: 'var(--color-text)', marginBottom: 4 }}>No businesses yet</h3>
                  <p style={{ fontSize: '0.88rem' }}>Click "Add Business" above to create your first listing.</p>
                </div>
              ) : (
                <PortfolioView
                  businesses={myBusinesses}
                  onEdit={startEdit}
                  onDelete={setConfirmDeleteBiz}
                  onAvailability={updateAvailability}
                  availabilityBusy={availabilityBusy}
                  collapsed={collapsedGroups}
                  onToggleGroup={toggleGroup}
                />
              )}
            </div>
          )}

          {/* Transactions */}
          {activeSection === 'transactions' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px' }}>Incoming Transactions</h2>
              {vendorTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
                  <DollarSign size={56} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <h3 style={{ color: 'var(--color-text)', marginBottom: 4 }}>No transactions yet</h3>
                  <p style={{ fontSize: '0.88rem' }}>When customers hire you, they'll appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {vendorTransactions.map((tx) => {
                    const txMilestones = vMilestonesMap[tx.id];
                    const txExpanded = vExpandedTx === tx.id;
                    return (
                      <div key={tx.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>{tx.business?.name || 'Service'}</h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>From: {tx.customer?.full_name || 'Customer'}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>₦{Number(tx.amount).toLocaleString()}</div>
                            <Badge label={tx.status} color={statusColors[tx.status] || '#6b7280'} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, fontSize: '0.8rem', color: 'var(--color-text-muted)', alignItems: 'center' }}>
                          <Clock size={14} />
                          <span>{new Date(tx.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>

                        <button
                          onClick={async () => {
                            if (vExpandedTx === tx.id) { setVExpandedTx(null); return; }
                            setVExpandedTx(tx.id);
                            if (!vMilestonesMap[tx.id]) {
                              try { const res = await api.get(`/transactions/${tx.id}/milestones`); if (res.success) setVMilestonesMap(prev => ({ ...prev, [tx.id]: res.data })); } catch {}
                            }
                          }}
                          style={{ ...btnOutline, marginTop: 8 }}
                        >
                          <DollarSign size={13} /> {txExpanded ? 'Hide Milestones' : 'View Milestones'}
                        </button>

                        {txMilestones && txMilestones.some(m => m.status === 'completed') && (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: '#f59e0b20', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} /> Awaiting customer confirmation
                            </span>
                          </div>
                        )}

                        {txExpanded && txMilestones && (
                          <div style={{ marginTop: 10, padding: 12, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                            <strong style={{ fontSize: '0.8rem' }}>Payment Milestones</strong>
                            {txMilestones.length === 0 && <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No milestones (single payment)</p>}
                            {txMilestones.map((ms, mi) => (
                              <div key={ms.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: mi < txMilestones.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ms.status === 'released' ? '#16a34a' : ms.status === 'completed' ? '#f59e0b' : '#d1d5db', display: 'inline-block' }} />
                                  <span>{ms.description}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 600 }}>₦{Number(ms.amount).toLocaleString()}</span>
                                  <Badge
                                    label={ms.status === 'completed' ? 'Awaiting customer' : ms.status}
                                    color={ms.status === 'released' ? '#16a34a' : ms.status === 'completed' ? '#f59e0b' : '#6b7280'}
                                  />
                                </div>
                              </div>
                            ))}
                            {txMilestones.filter(m => m.status === 'pending').length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <p style={{ fontSize: '0.8rem', margin: '0 0 6px', fontWeight: 600 }}>Complete a milestone:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {txMilestones.filter(m => m.status === 'pending').map(ms => (
                                    <button
                                      key={ms.id}
                                      onClick={() => setConfirmMilestone({ txId: tx.id, ms })}
                                      style={{ ...btnPrimary, padding: '6px 14px', fontSize: '0.8rem' }}
                                    >
                                      <CheckCircle size={13} /> Complete: {ms.description}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          {tx.status === 'escrow' && (!txMilestones || txMilestones.length === 0) && (
                            <button onClick={() => handleMarkComplete(tx.id)} style={btnPrimary}>
                              <CheckCircle size={15} /> Mark Complete
                            </button>
                          )}
                          {tx.status === 'completed' && <span style={{ fontSize: '0.85rem', color: '#16a34a', fontStyle: 'italic' }}>Awaiting admin release</span>}
                          {tx.status === 'released' && <span style={{ fontSize: '0.85rem', color: '#059669', fontStyle: 'italic' }}>Funds released to your wallet</span>}
                          {tx.status === 'disputed' && <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontStyle: 'italic' }}>Dispute raised — awaiting admin review</span>}
                          {tx.status === 'cancelled' && <span style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>Transaction cancelled</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subscription */}
          {activeSection === 'subscription' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px' }}>Subscription</h2>

              {mySub ? (
                <div style={{ ...cardStyle, marginBottom: 20, borderColor: mySub.status === 'expired' ? '#dc2626' : mySub.status === 'active' ? '#16a34a' : 'var(--color-border)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px' }}>Your Subscription</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, fontSize: '0.88rem' }}>
                    <p><strong>Package:</strong> {mySub.package_name}</p>
                    <p><strong>Billing Cycle:</strong> {mySub.billing_cycle}</p>
                    <p><strong>Amount:</strong> ₦{(mySub.amount || 0).toLocaleString()}</p>
                    <p><strong>Status:</strong> <Badge label={mySub.status} color={mySub.status === 'active' ? '#16a34a' : mySub.status === 'expired' ? '#6b7280' : mySub.status === 'pending' ? '#f59e0b' : '#dc2626'} /></p>
                  </div>
                  {mySub.expires_at && (() => {
                    const daysLeft = Math.ceil((new Date(mySub.expires_at).getTime() - Date.now()) / 86400000);
                    return (
                      <>
                        <p style={{ fontSize: '0.85rem' }}><strong>Expires:</strong> {new Date(mySub.expires_at).toLocaleDateString()} {mySub.status === 'active' && daysLeft > 0 && daysLeft <= 30 && <span style={{ color: '#f59e0b' }}> ({daysLeft} day{daysLeft === 1 ? '' : 's'} left)</span>}</p>
                        {daysLeft <= 0 && <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>This subscription has expired. Your businesses are no longer visible to customers.</p>}
                        {daysLeft > 0 && daysLeft <= 7 && <p style={{ fontSize: '0.85rem', color: '#f59e0b' }}>⚠ Your subscription expires soon! Renew now to keep your businesses visible.</p>}
                      </>
                    );
                  })()}
                  {mySub.status === 'pending' && <p style={{ fontSize: '0.85rem', color: '#f59e0b' }}>Waiting for admin to verify payment.</p>}
                   {mySub.status === 'rejected' && <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>Your subscription payment was rejected. Contact support or subscribe again.</p>}
                   {mySub.status === 'active' && mySub.package_name && (
                     <div style={{ marginTop: 12, padding: 12, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                       <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: '0 0 8px' }}>Your Plan Features</p>
                       <ul style={{ fontSize: '0.8rem', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                         {(() => {
                           const pkg = subPackages.find(p => p.id === mySub.package_id);
                           return (pkg?.features || []).map((f, i) => (
                             <li key={i} style={{ color: '#16a34a' }}>✓ {f}</li>
                           ));
                         })()}
                       </ul>
                     </div>
                   )}
                 </div>
               ) : (
                 <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>You have no active subscription. Choose a package below.</p>
               )}

               <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Available Packages</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
                {subPackages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    style={{
                      cursor: 'pointer', padding: 20,
                      background: selectedPkg === pkg.id ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: selectedPkg === pkg.id ? '#fff' : 'inherit',
                      borderRadius: 'var(--radius-md)',
                      border: selectedPkg === pkg.id ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>{pkg.name}</h3>
                    {pkg.description && <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: '0 0 12px' }}>{pkg.description}</p>}
                    <ul style={{ fontSize: '0.82rem', paddingLeft: 16, margin: '0 0 12px', lineHeight: 1.8 }}>
                      {(pkg.features || []).map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    <div style={{ fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8 }}>
                      <p>Quarterly: <strong>₦{pkg.prices.quarterly.toLocaleString()}</strong></p>
                      <p>Biannually: <strong>₦{pkg.prices.biannually.toLocaleString()}</strong></p>
                      <p>Annually: <strong>₦{pkg.prices.annually.toLocaleString()}</strong></p>
                    </div>
                  </div>
                ))}
              </div>

              {mySub?.status === 'pending' && <p style={{ fontSize: '0.85rem', color: '#f59e0b', marginBottom: 16 }}>You already have a pending subscription request. Please wait for admin verification.</p>}
              {selectedPkg && mySub?.status !== 'active' && mySub?.status !== 'pending' && (
                <form onSubmit={handleSubscribe} style={cardStyle}>
                  <label style={{ ...labelStyle, marginBottom: 10 }}>Billing Cycle</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {['quarterly', 'biannually', 'annually'].map(cycle => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setSelectedCycle(cycle)}
                        style={{
                          padding: '8px 20px',
                          border: selectedCycle === cycle ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: selectedCycle === cycle ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: selectedCycle === cycle ? '#fff' : 'inherit',
                          borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600,
                          textTransform: 'capitalize', fontSize: '0.85rem',
                        }}
                      >
                        {cycle}
                      </button>
                    ))}
                  </div>
                  {subMsg && <p style={{ fontSize: '0.85rem', color: subMsg.includes('failed') ? 'var(--color-danger)' : '#16a34a', marginBottom: 8 }}>{subMsg}</p>}
                  <button type="submit" style={btnPrimary}>Subscribe</button>
                </form>
              )}
            </div>
          )}

          {activeSection === 'verification' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px' }}>Business Verification</h2>

              {myVerification && (
                <div style={{ ...cardStyle, marginBottom: 20, borderColor: myVerification.status === 'approved' ? '#16a34a' : myVerification.status === 'rejected' ? '#dc2626' : '#f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={18} color={myVerification.status === 'approved' ? '#16a34a' : myVerification.status === 'rejected' ? '#dc2626' : '#f59e0b'} />
                      Current Status
                    </h3>
                    <Badge label={myVerification.status} color={myVerification.status === 'approved' ? '#16a34a' : myVerification.status === 'rejected' ? '#dc2626' : '#f59e0b'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, fontSize: '0.88rem', marginTop: 12 }}>
                    <p><strong>ID Type:</strong> {myVerification.id_type ? titleCase(myVerification.id_type) : '—'}</p>
                    <p><strong>ID Number:</strong> {myVerification.id_number || '—'}</p>
                    <p><strong>Submitted:</strong> {myVerification.created_at ? new Date(myVerification.created_at).toLocaleDateString() : '—'}</p>
                    {myVerification.reviewed_at && <p><strong>Reviewed:</strong> {new Date(myVerification.reviewed_at).toLocaleDateString()}</p>}
                  </div>
                  {myVerification.status === 'pending' && (
                    <p style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: 8 }}>Your verification is being reviewed. Our team typically responds within 1–2 business days.</p>
                  )}
                  {myVerification.status === 'rejected' && myVerification.rejection_reason && (
                    <p style={{ fontSize: '0.85rem', color: '#dc2626', marginTop: 8 }}><strong>Reason:</strong> {myVerification.rejection_reason}</p>
                  )}
                  {myVerification.status === 'approved' && (
                    <p style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: 8 }}>Your business is verified. Your listings now carry the verified badge.</p>
                  )}
                </div>
              )}

              {myVerification?.status !== 'approved' && (
                <form onSubmit={submitVerification} style={cardStyle}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px' }}>{myVerification?.status === 'rejected' ? 'Resubmit your details' : 'Submit your business details for verification'}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
                    Upload a valid government ID (e.g. your NIN slip) and we will manually verify your business. This adds the verified badge to your listings.
                  </p>

                  {vErr && <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginBottom: 12 }}>{vErr}</p>}
                  {vMsg && <p style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: 12 }}>{vMsg}</p>}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle} htmlFor="vid-type">ID Type</label>
                      <select
                        id="vid-type"
                        style={inputStyle}
                        value={vForm.idType}
                        onChange={(e) => setVForm((prev) => ({ ...prev, idType: e.target.value }))}
                      >
                        <option value="">Select ID type...</option>
                        <option value="nin">NIN (National ID)</option>
                        <option value="driver_license">Driver's License</option>
                        <option value="international_passport">International Passport</option>
                        <option value="voter_card">Voter's Card</option>
                        <option value="cac_certificate">CAC Certificate</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="vid-number">ID Number</label>
                      <input
                        id="vid-number"
                        style={inputStyle}
                        placeholder="e.g. 12345678901"
                        value={vForm.idNumber}
                        onChange={(e) => setVForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Supporting Documents</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      {vDocs.map((d, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-pill)', fontSize: '0.78rem',
                        }}>
                          <FileText size={14} color="var(--color-primary)" />
                          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || 'Document'}</span>
                          <button type="button" onClick={() => removeVDoc(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', padding: 0 }}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                    <input ref={vDocInputRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { handleKycUpload(e.target.files); e.target.value = ''; }} />
                    <button type="button" onClick={() => vDocInputRef.current?.click()} disabled={vBusy} style={{ ...btnOutline, fontSize: '0.8rem' }}>
                      {vBusy ? <Loader size={15} className="spin" /> : <Upload size={15} />}
                      Upload NIN slip / documents
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Images or PDF, up to 10 files.</p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle} htmlFor="vid-notes">Notes (optional)</label>
                    <textarea
                      id="vid-notes"
                      style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                      placeholder="Anything the review team should know about your business..."
                      value={vForm.notes}
                      onChange={(e) => setVForm((prev) => ({ ...prev, notes: e.target.value }))}
                      maxLength={2000}
                    />
                  </div>

                  <button type="submit" style={btnPrimary} disabled={vBusy}>
                    {vBusy ? <Loader size={15} className="spin" /> : <ShieldCheck size={15} />}
                    {myVerification?.status === 'rejected' ? 'Resubmit for Review' : 'Submit for Verification'}
                  </button>
                </form>
              )}
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
      {confirmDeleteBiz && (
        <ConfirmModal
          isOpen={!!confirmDeleteBiz}
          title="Delete this business?"
          message={`Are you sure you want to delete "${confirmDeleteBiz.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onCancel={() => setConfirmDeleteBiz(null)}
          onConfirm={() => handleDeleteBusiness(confirmDeleteBiz.id)}
        />
      )}
      {confirmMilestone && (
        <ConfirmModal
          isOpen={!!confirmMilestone}
          title="Mark milestone as complete?"
          message={`Mark milestone "${confirmMilestone.ms.description}" as complete? This will notify the customer to release payment.`}
          confirmText="Mark Complete"
          variant="default"
          onCancel={() => setConfirmMilestone(null)}
            onConfirm={async () => {
            const { txId, ms } = confirmMilestone;
            try {
              const res = await api.put(`/transactions/${txId}/milestones/${ms.id}/complete`);
              if (res.success) {
                const res2 = await api.get(`/transactions/${txId}/milestones`);
                if (res2.success) setVMilestonesMap(prev => ({ ...prev, [txId]: res2.data }));
                toast.success('Milestone marked complete.');
              } else {
                toast.error(res.error?.message || 'Failed to update milestone');
              }
            } catch (err) {
              toast.error(err.response?.data?.error || 'Failed to update milestone');
            }
            setConfirmMilestone(null);
          }}
        />
      )}
    </div>
  );
}

export default VendorDashboard;
