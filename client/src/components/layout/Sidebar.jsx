import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../common/Logo';
import {
  Briefcase, ChevronRight, Menu, ChevronLeft, X,
  User, LogOut, MessageSquare, Bell, PlusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { categoryIcons } from '../../constants/categories.jsx';
import api from '../../services/api';

function Sidebar({ showDesktop = true, isMobileOpen, onMobileClose }) {
  const [categories, setCategories] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    api.get('/categories').then((res) => {
      if (res.success) setCategories(res.data);
    });
  }, []);

  /* Chunk 13: also respond to custom 'toggle-sidebar' event (for burger-menu buttons). */
  useEffect(() => {
    const handler = () => {
      if (typeof onMobileClose === 'function' && isMobileOpen) onMobileClose();
    };
    const closer = () => {
      if (typeof onMobileClose === 'function' && isMobileOpen) onMobileClose();
    };
    window.addEventListener('popstate', closer);
    window.addEventListener('toggle-sidebar-close', handler);
    return () => {
      window.removeEventListener('popstate', closer);
      window.removeEventListener('toggle-sidebar-close', handler);
    };
  }, [isMobileOpen, onMobileClose]);

  function handleCategoryClick() {
    if (onMobileClose) onMobileClose();
  }

  const sidebarContent = (
    <>
      <div className="sidebar-header">
        {!collapsed && <h3 className="sidebar-title">Categories</h3>}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {categories.map((cat) => {
          const isSelected = location.pathname === `/category/${cat.slug}`;
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`sidebar-link ${isSelected ? 'active' : ''}`}
              onClick={handleCategoryClick}
            >
              <span className="sidebar-icon">
                {categoryIcons[cat.slug] || <Briefcase size={18} />}
              </span>
              {!collapsed && (
                <>
                  <span className="sidebar-label">{cat.name}</span>
                  <span className="sidebar-count">{cat.businesses?.count ?? 0}</span>
                  <ChevronRight className="sidebar-chevron" size={14} />
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );

  const drawerLinks = user ? (
    <>
      <div className="sidebar-drawer-section-label">Account</div>
      <Link
        to={profile?.role === 'admin' || profile?.role === 'super_admin' ? '/admin' : profile?.role === 'vendor' ? '/vendor-dashboard' : '/dashboard'}
        className="sidebar-drawer-link"
        onClick={onMobileClose}
      >
        <User size={18} /> <span className="sidebar-drawer-label">Dashboard</span>
      </Link>
      <Link to="/messages" className="sidebar-drawer-link" onClick={onMobileClose}>
        <MessageSquare size={18} /> <span className="sidebar-drawer-label">Messages</span>
      </Link>
      <Link to="/favorites" className="sidebar-drawer-link" onClick={onMobileClose}>
        <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>♥</span> <span className="sidebar-drawer-label">Favorites</span>
      </Link>
      <Link to="/notifications" className="sidebar-drawer-link" onClick={onMobileClose}>
        <Bell size={18} /> <span className="sidebar-drawer-label">Notifications</span>
      </Link>
      {profile?.role === 'vendor' && (
        <Link to="/withdrawals" className="sidebar-drawer-link" onClick={onMobileClose}>
          <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>₦</span> <span className="sidebar-drawer-label">Withdrawals</span>
        </Link>
      )}
      {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
        <>
          <Link to="/admin/reports" className="sidebar-drawer-link" onClick={onMobileClose}>
            <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>📋</span> <span className="sidebar-drawer-label">Reports</span>
          </Link>
          <Link to="/admin/disputes" className="sidebar-drawer-link" onClick={onMobileClose}>
            <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>⚖</span> <span className="sidebar-drawer-label">Disputes</span>
          </Link>
        </>
      )}
      <Link to="/vendor-dashboard" className="sidebar-drawer-link" onClick={onMobileClose}>
        <PlusCircle size={18} /> <span className="sidebar-drawer-label">Post a Business</span>
      </Link>
      <hr className="sidebar-drawer-divider" />
      <button className="sidebar-drawer-link" onClick={() => { signOut(); if (onMobileClose) onMobileClose(); }}>
        <LogOut size={18} /> <span className="sidebar-drawer-label">Sign Out</span>
      </button>
    </>
  ) : (
    <>
      <div className="sidebar-drawer-section-label">Account</div>
      <Link to="/login" className="sidebar-drawer-link" onClick={onMobileClose}>
        <User size={18} /> <span className="sidebar-drawer-label">Sign In</span>
      </Link>
      <Link to="/register" className="sidebar-drawer-link" onClick={onMobileClose}>
        <PlusCircle size={18} /> <span className="sidebar-drawer-label">Sign Up</span>
      </Link>
    </>
  );

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${!showDesktop ? 'sidebar-hidden' : ''}`}>
        {sidebarContent}
      </aside>

      <div className={`sidebar-drawer-overlay ${isMobileOpen ? 'open' : ''}`} onClick={onMobileClose} />
      <aside className={`sidebar-drawer ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-drawer-header">
          <Logo size={30} />
          <button
            className="sidebar-drawer-close"
            onClick={onMobileClose}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="sidebar-drawer-user">
          {user && (
            <div className="sidebar-drawer-user-info">
              <div className="sidebar-drawer-avatar">
                {profile?.full_name?.charAt(0) || <User size={18} />}
              </div>
              <div className="sidebar-drawer-user-details">
                <span className="sidebar-drawer-user-name">{profile?.full_name || 'User'}</span>
                <span className="sidebar-drawer-user-email">{user.email}</span>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-drawer-section-label">Categories</div>
        <nav className="sidebar-drawer-nav">
          {categories.map((cat) => {
            const isSelected = location.pathname === `/category/${cat.slug}`;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`sidebar-drawer-link ${isSelected ? 'active' : ''}`}
                onClick={handleCategoryClick}
              >
                <span className="sidebar-drawer-icon">
                  {categoryIcons[cat.slug] || <Briefcase size={20} />}
                </span>
                <span className="sidebar-drawer-label">{cat.name}</span>
                <span className="sidebar-drawer-count">{cat.businesses?.count ?? 0}</span>
                <ChevronRight className="sidebar-drawer-chevron" size={16} />
              </Link>
            );
          })}
        </nav>

        <hr className="sidebar-drawer-divider" />
        {drawerLinks}
      </aside>
    </>
  );
}

export default Sidebar;
