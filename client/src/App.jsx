import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { MessageSquare, Bell } from 'lucide-react';
import Layout from './components/layout/Layout';

const Home = lazy(() => import('./pages/Home'));
const BusinessPage = lazy(() => import('./pages/BusinessPage'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const WalletVerify = lazy(() => import('./pages/WalletVerify'));
const SubscriptionVerify = lazy(() => import('./pages/SubscriptionVerify'));
const MessageDetail = lazy(() => import('./pages/MessageDetail'));
const Favorites = lazy(() => import('./pages/Favorites.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Withdrawals = lazy(() => import('./pages/Withdrawals.jsx'));
const Disputes = lazy(() => import('./pages/Disputes.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const VendorAvailability = lazy(() => import('./pages/VendorAvailability.jsx'));
const VendorAnalytics = lazy(() => import('./pages/VendorAnalytics.jsx'));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail.jsx'));
const HelpFAQ = lazy(() => import('./pages/HelpFAQ.jsx'));

function RequireRole({ role, children }) {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role && profile.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function EmptyPage({ icon: Icon, title, message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-muted)',
    }}>
      <Icon size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
      <h2 style={{ marginBottom: 8, color: 'var(--color-text)' }}>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Layout>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <div className="spinner" />
            </div>
          }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/business/:id" element={<BusinessPage />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/category" element={<Navigate to="/" replace />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/messages" element={<EmptyPage icon={MessageSquare} title="No Messages" message="You have no conversations yet. When you contact a service provider, your messages will appear here." />} />
          <Route path="/messages/:id" element={<MessageDetail />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/vendor-dashboard" element={<VendorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/wallet/verify" element={<WalletVerify />} />
            <Route path="/subscription/verify" element={<SubscriptionVerify />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="/admin/reports" element={<RequireRole role="admin"><Reports /></RequireRole>} />
            <Route path="/admin/disputes" element={<RequireRole role="admin"><Disputes /></RequireRole>} />
            <Route path="/transactions/:id" element={<TransactionDetail />} />
            <Route path="/availability" element={<VendorAvailability />} />
            <Route path="/analytics" element={<VendorAnalytics />} />
            <Route path="/help" element={<HelpFAQ />} />
          </Routes>
          </Suspense>
        </Layout>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
