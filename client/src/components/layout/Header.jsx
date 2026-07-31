import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocationCtx } from '../../context/LocationContext';
import api from '../../services/api';
import Logo from '../common/Logo';
import {
  Search, MapPin, User, LogOut, PlusCircle,
  Bell, MessageSquare, Briefcase, ChevronDown, ChevronRight, Menu,
  Sun, Moon, MessageCircle, FileText, Briefcase as WorkIcon,
} from 'lucide-react';

function Header({ onMenuToggle }) {
  const { user, profile, signOut } = useAuth();
  const { selectedCity, setCity, clearCity } = useLocationCtx();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [locationTree, setLocationTree] = useState([]);
  const [expandedStates, setExpandedStates] = useState({});
  const [expandedLgas, setExpandedLgas] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const userMenuRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    api.get('/locations/hierarchy').then((res) => {
      if (res.success && res.data.length > 0) {
        setLocationTree(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    api.get('/notifications?page=1&limit=1')
      .then((res) => {
        const d = res?.data?.data || res;
        const count = d?.total ?? d?.unread_count ?? 0;
        setUnreadCount(count);
      })
      .catch(() => {});
  }, [user]);

  function toggleState(id) {
    setExpandedStates((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleLga(id) {
    setExpandedLgas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  function handleSearch(e) {
    e.preventDefault();
    let url = `/search?q=${encodeURIComponent(searchQuery)}`;
    if (selectedCity !== 'All Nigeria') {
      url += `&city=${encodeURIComponent(selectedCity)}`;
    }
    navigate(url);
  }

  function selectCity(city, state) {
    if (city === 'All Nigeria') {
      clearCity();
    } else {
      setCity(city, state);
    }
    setShowCityDropdown(false);
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      if (city === 'All Nigeria') {
        params.delete('city');
      } else {
        params.set('city', city);
      }
      navigate(`/search?${params.toString()}`);
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="mobile-menu-toggle burger-menu"
          onClick={(e) => {
            window.dispatchEvent(new Event('toggle-sidebar'));
            if (typeof onMenuToggle === 'function') onMenuToggle(e);
          }}
          aria-label="Open categories"
        >
          <Menu size={24} />
        </button>

        <Logo size={32} />

        <div className="header-location-selector">
          <button
            className="location-btn"
            onClick={() => setShowCityDropdown(!showCityDropdown)}
          >
            <MapPin size={16} className="text-primary" />
            <span className="location-label">{selectedCity}</span>
            <ChevronDown size={14} />
          </button>

          {showCityDropdown && (
            <div className="location-dropdown location-tree-dropdown">
              <button
                className={`location-option ${selectedCity === 'All Nigeria' ? 'active' : ''}`}
                onClick={() => selectCity('All Nigeria')}
              >
                All Nigeria
              </button>
              {locationTree.length === 0 && (
                <div className="location-empty-msg">No cities with businesses yet</div>
              )}
              {locationTree.map((state) => (
                <div key={state.id} className="location-state-group">
                  <button
                    className="location-state-btn"
                    onClick={() => toggleState(state.id)}
                  >
                    {expandedStates[state.id]
                      ? <ChevronDown size={14} />
                      : <ChevronRight size={14} />}
                    <span>{state.name}</span>
                  </button>
                  {expandedStates[state.id] && (
                    (state.lgas && state.lgas.length > 0)
                      ? state.lgas.map((lga) => (
                          <div key={lga.id} className="location-lga-group">
                            <button
                              className="location-lga-btn"
                              onClick={() => toggleLga(lga.id)}
                            >
                              {expandedLgas[lga.id]
                                ? <ChevronDown size={12} />
                                : <ChevronRight size={12} />}
                              <span>{lga.name}</span>
                            </button>
                            {expandedLgas[lga.id] && lga.cities.map((city) => (
                              <button
                                key={city.id}
                                className={`location-city-option ${selectedCity === city.name ? 'active' : ''}`}
                                onClick={() => selectCity(city.name, state.name)}
                              >
                                {city.name}
                              </button>
                            ))}
                          </div>
                        ))
                      : (state.cities || []).map((city) => (
                          <button
                            key={city.id}
                            className={`location-city-option ${selectedCity === city.name ? 'active' : ''}`}
                            onClick={() => selectCity(city.name, state.name)}
                          >
                            {city.name}
                          </button>
                        ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {location.pathname !== '/' && (
          <form className="header-search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Find services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="search-submit-btn">Search</button>
          </form>
        )}

        <div className="header-actions">
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="header-theme-toggle"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6b7280" />}
          </button>
          {user ? (
            <div className="user-dropdown-container" ref={userMenuRef}>
              <button
                className="btn-dashboard-link"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <User size={16} />
                <span className="user-name-display">{profile?.full_name?.split(' ')[0] || 'My Account'}</span>
              </button>
              {userMenuOpen && (
                <div className="user-dropdown-menu">
                  <Link
                    to={profile?.role === 'admin' || profile?.role === 'super_admin' ? '/admin' : profile?.role === 'vendor' || profile?.role === 'property_owner' ? '/vendor-dashboard' : '/dashboard'}
                    className="user-dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Briefcase size={15} /> Dashboard
                  </Link>
                  <Link to="/messages" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <MessageSquare size={15} /> Messages
                    <span className="badge-dot"></span>
                  </Link>
                  <Link to="/favorites" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <span aria-hidden="true" style={{ fontSize: '0.95rem' }}>♥</span> Favorites
                  </Link>
                  <Link to="/notifications" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <Bell size={15} /> Notifications
                    {unreadCount > 0 ? (
                      <span className="badge-count">{unreadCount}</span>
                    ) : (
                      <span className="badge-dot"></span>
                    )}
                  </Link>
                  <Link to="/quotes" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <FileText size={15} /> Quotes
                  </Link>
                  <Link to="/work-projects" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <WorkIcon size={15} /> Work Projects
                  </Link>
                  {(profile?.role === 'vendor') && (
                    <Link to="/withdrawals" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <span aria-hidden="true" style={{ fontSize: '0.95rem' }}>?</span> Withdrawals
                    </Link>
                  )}
                  {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                    <>
                      <Link to="/admin/reports" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        <span aria-hidden="true" style={{ fontSize: '0.95rem' }}>📋</span> Reports
                      </Link>
                      <Link to="/admin/disputes" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        <span aria-hidden="true" style={{ fontSize: '0.95rem' }}>⚖</span> Disputes
                      </Link>
                    </>
                  )}
                  <hr className="user-dropdown-divider" />
                  <button className="user-dropdown-item" onClick={() => { handleSignOut(); setUserMenuOpen(false); }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links-group">
              <Link to="/login" className="btn-signin-link">Sign In</Link>
              <Link to="/register" className="btn-signup-link">Sign Up</Link>
            </div>
          )}

          <Link to={user ? '/vendor-dashboard' : '/register'} className="btn-header-cta">
            <PlusCircle size={16} />
            <span>Post a Business</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
