import { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocationCtx } from '../context/LocationContext';
import BusinessCard from '../components/business/BusinessCard';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { categoryIcons } from '../constants/categories.jsx';
import {
  Search, ShieldCheck, Zap, HeartHandshake,
  MapPin, Map, ChevronRight, TrendingUp, Sparkles,
  Building2, Key, Briefcase, Car
} from 'lucide-react';
import '../styles/redesign.css';

const ServiceMap = lazy(() => import('../components/map/ServiceMap'));

const TYPE_CONFIG = {
  service: { icon: <Briefcase size={18} />, className: 'service', label: 'Service' },
  property: { icon: <Building2 size={18} />, className: 'property', label: 'Property' },
  rental: { icon: <Key size={18} />, className: 'rental', label: 'Rental' },
  vehicle: { icon: <Car size={18} />, className: 'vehicle', label: 'Vehicle' },
};

function CategoryCard({ cat, index }) {
  const cfg = TYPE_CONFIG[cat.type] || TYPE_CONFIG.service;
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setVisible(true), index * 60);
        obs.unobserve(el);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  return (
    <Link
      ref={ref}
      to={`/category/${cat.slug}`}
      className="glass-category-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div className={`card-icon-wrap ${cfg.className}`}>
        {categoryIcons[cat.slug] || cfg.icon}
      </div>
      <div className="card-info">
        <span className="cat-name">{cat.name}</span>
        <div className="cat-meta">
          <span className="cat-count">{cat.businesses?.count ?? 0} listings</span>
          <span className="cat-type-tag" style={{
            background: cfg.className === 'property' ? '#eff6ff' : cfg.className === 'rental' ? '#fffbeb' : cfg.className === 'vehicle' ? '#f0fdfa' : 'var(--color-primary-light)',
            color: cfg.className === 'property' ? '#1d4ed8' : cfg.className === 'rental' ? '#b45309' : cfg.className === 'vehicle' ? '#0d9488' : 'var(--color-primary)',
          }}>
            {cfg.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Home() {
  const { selectedCity, setCity } = useLocationCtx();
  const [featured, setFeatured] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [subPackages, setSubPackages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setHomeLoading(true);
    const cityParam = selectedCity !== 'All Nigeria' ? `&city=${encodeURIComponent(selectedCity)}` : '';
    Promise.all([
      api.get(`/businesses?featured=true${cityParam}`).catch(() => null),
      api.get(`/businesses?recommended=true${cityParam}`).catch(() => null),
      api.get('/categories').catch(() => null),
      api.get('/subscriptions/packages').catch(() => null),
    ]).then(([featRes, recRes, catRes, subRes]) => {
      if (featRes?.success) setFeatured(featRes.data);
      if (recRes?.success) setRecommended(recRes.data);
      if (catRes?.success) setCategories(catRes.data);
      if (subRes?.success) setSubPackages(subRes.data.filter(p => p.active));
    }).finally(() => setHomeLoading(false));
  }, [selectedCity]);

  function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    let url = `/search?q=${encodeURIComponent(searchQuery)}`;
    if (selectedCity !== 'All Nigeria') {
      url += `&city=${encodeURIComponent(selectedCity)}`;
    }
    navigate(url);
  }

  const popularTags = ['Plumber', 'Electrician', 'AC Repair', 'Cleaning', 'Mechanic', 'House for Rent', 'Cars for Sale', 'Land'];

  const categoryQuickLinks = categories.filter(c => ['houses-for-sale', 'houses-for-rent', 'cars-vehicles', 'land-plots'].includes(c.slug));

  const propertyCategories = categories.filter((c) => c.type === 'property' || c.type === 'rental' || c.type === 'vehicle');
  const serviceCategories = categories.filter((c) => c.type === 'service');

  return (
    <div className="homepage-wrapper">

      {/* Redesigned Hero */}
      <section className="hero-section">
        <div className="hero-shapes">
          <div className="hero-shape" />
          <div className="hero-shape" />
          <div className="hero-shape" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>No Middlemen • Direct from Owners</span>
          </div>

          <h1>Find Services, Homes, Cars & More</h1>
          <p className="hero-subtitle">
            Connect directly with verified property owners and service professionals — no agents, no middlemen, no markups.
          </p>

          {/* Category quick links */}
          {categoryQuickLinks.length > 0 && (
            <div className="hero-quick-links">
              {categoryQuickLinks.map(cat => (
                <Link key={cat.id} to={`/category/${cat.slug}`} className="hero-quick-link">
                  {categoryIcons[cat.slug] || '📋'}
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          )}

          <form className="hero-search-box" onSubmit={handleSearch}>
            <div className="search-group search-keyword">
              <Search size={20} className="search-input-icon" />
              <input
                type="text"
                placeholder="Search services, properties, vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="search-group search-location">
              <MapPin size={20} className="search-input-icon text-primary" />
              <select
                value={selectedCity}
                onChange={(e) => setCity(e.target.value === 'All Nigeria' ? 'All Nigeria' : e.target.value)}
                className="search-location-select"
              >
                <option value="All Nigeria">All Nigeria</option>
                <option value="Lagos">Lagos</option>
                <option value="Abuja">Abuja</option>
                <option value="Port Harcourt">Port Harcourt</option>
                <option value="Ibadan">Ibadan</option>
                <option value="Enugu">Enugu</option>
              </select>
            </div>

            <button type="submit" className="hero-search-btn">
              Search
            </button>
          </form>

          <div className="hero-popular-tags">
            <span className="tags-label">Popular:</span>
            <div className="tags-list">
              {popularTags.map((tag) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="popular-tag-link"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/register" className="hero-list-btn">
              <Sparkles size={16} />
              List Your Property
            </Link>
            <Link to="/register" className="hero-list-btn-secondary">
              Post a Service
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Cards */}
      <section className="trust-grid">
        <div className="trust-card" style={{ borderTop: '3px solid var(--color-primary)' }}>
          <div className="trust-icon-box bg-green-light">
            <ShieldCheck size={24} className="text-primary" />
          </div>
          <div className="trust-text">
            <h4>Direct from Owners</h4>
            <p>Every property is listed by the real owner — no agents, no middlemen, no inflated fees.</p>
          </div>
        </div>

        <div className="trust-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="trust-icon-box bg-blue-light">
            <Zap size={24} className="text-blue" />
          </div>
          <div className="trust-text">
            <h4>Verified Listings</h4>
            <p>We verify identities so you know you're dealing with the genuine owner or provider.</p>
          </div>
        </div>

        <div className="trust-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="trust-icon-box bg-amber-light">
            <HeartHandshake size={24} className="text-accent" />
          </div>
          <div className="trust-text">
            <h4>Secure Transactions</h4>
            <p>Escrow-protected payments with milestone-based release for total peace of mind.</p>
          </div>
        </div>
      </section>

      {/* Property & Vehicle Categories */}
      {propertyCategories.length > 0 && (
        <section className="home-categories-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-accent" />
              <Sparkles size={20} className="text-primary" />
              <h2>Properties & Vehicles</h2>
            </div>
          </div>
          <div className="categories-card-grid">
            {propertyCategories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Listings */}
      <section className="home-listings-section">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-accent" />
            <TrendingUp size={20} className="text-primary" />
            <h2>Featured Listings</h2>
          </div>
          <Link to="/search?featured=true" className="view-all-link">
            <span>View all</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {homeLoading ? (
          <Loading variant="skeleton-card" count={3} />
        ) : featured.length === 0 ? null : (
          <div className="listings-grid">
            {featured.map((b, i) => (
              <div key={b.id} style={{
                animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
              }}>
                <BusinessCard business={b} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Service Categories */}
      <section className="home-categories-section">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-accent" />
            <Briefcase size={20} className="text-primary" />
            <h2>Service Categories</h2>
          </div>
        </div>
        <div className="categories-card-grid">
          {serviceCategories.map((cat, i) => (
            <CategoryCard key={cat.id} cat={cat} index={i} />
          ))}
        </div>
      </section>

       {/* Map Section */}
      <section className="home-map-section">
        <div className="map-card-wrapper">
          <div className="map-card-info">
            <div className="map-badge">
              <Map size={14} />
              <span>Location Aware</span>
            </div>
            <h3>Explore Providers & Listings Near You</h3>
            <p>
              Use our interactive map to discover service providers, properties, and vehicles available in your area.
            </p>
            <div className="map-stats">
              <div className="map-stat-item">
                <span className="stat-num">{categories.length}</span>
                <span className="stat-label">Categories</span>
              </div>
              <div className="map-stat-item">
                <span className="stat-num">100+</span>
                <span className="stat-label">Listings</span>
              </div>
              <div className="map-stat-item">
                <span className="stat-num">5</span>
                <span className="stat-label">Cities</span>
              </div>
            </div>
          </div>

          <div className="map-view-container">
            <Suspense fallback={<Loading />}>
              <ServiceMap />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Recommended */}
      <section className="home-listings-section recommended-section">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-accent" />
            <ShieldCheck size={20} className="text-primary" />
            <h2>Recommended for You</h2>
          </div>
        </div>

        {homeLoading ? (
          <Loading variant="skeleton-card" count={3} />
        ) : recommended.length === 0 ? (
          <EmptyState icon="👍" title="No recommendations yet" message="Browse listings and we'll suggest the best matches for you." />
        ) : (
          <div className="listings-grid">
            {recommended.map((b, i) => (
              <div key={b.id} style={{
                animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
              }}>
                <BusinessCard business={b} />
              </div>
            ))}
          </div>
        )}
      </section>

       {/* Pricing Section */}
       <section style={{
         padding: '60px 24px',
         maxWidth: 1200,
         margin: '0 auto',
         width: '100%',
       }}>
         <div style={{ textAlign: 'center', marginBottom: 48 }}>
           <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
             Choose Your Plan
           </h2>
           <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', maxWidth: 600, margin: '0 auto' }}>
             Pick a subscription that fits your business. Quarterly, biannual, and annual billing options available.
           </p>
         </div>

         {(() => {
           const order = { 'Basic': 0, 'Pro': 1, 'Enterprise': 2 };
           const sorted = [...subPackages].sort((a, b) => (order[a.name] ?? 99) - (order[b.name] ?? 99));
           return (
             <div style={{
               display: 'grid',
               gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
               gap: 24,
               alignItems: 'stretch',
             }}>
               {sorted.map((pkg) => (
                 <div
                   key={pkg.id}
                   style={{
                     background: pkg.recommended ? 'linear-gradient(135deg, var(--color-primary), #0a5c3e)' : 'var(--color-surface)',
                     borderRadius: 16,
                     padding: '32px 24px',
                     position: 'relative',
                     border: pkg.recommended
                       ? '2px solid var(--color-primary)'
                       : '1px solid var(--color-border)',
                     transform: pkg.recommended ? 'scale(1.05)' : 'none',
                     boxShadow: pkg.recommended
                       ? '0 8px 32px rgba(11, 61, 46, 0.25)'
                       : '0 2px 8px rgba(0,0,0,0.06)',
                     display: 'flex',
                     flexDirection: 'column',
                     color: pkg.recommended ? '#fff' : 'var(--color-text)',
                   }}
                 >
                   {pkg.recommended && (
                     <div style={{
                       position: 'absolute',
                       top: -12,
                       left: '50%',
                       transform: 'translateX(-50%)',
                       background: '#f59e0b',
                       color: '#000',
                       fontSize: '0.75rem',
                       fontWeight: 700,
                       padding: '4px 16px',
                       borderRadius: 20,
                       textTransform: 'uppercase',
                       letterSpacing: 1,
                     }}>
                       Most Popular
                     </div>
                   )}
                   <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>{pkg.name}</h3>
                   <p style={{
                     fontSize: '0.85rem',
                     color: pkg.recommended ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)',
                     marginBottom: 20,
                     minHeight: 40,
                   }}>{pkg.description}</p>

                   <div style={{ marginBottom: 24 }}>
                     <div style={{
                       textAlign: 'center',
                       padding: '12px 0',
                       borderBottom: pkg.recommended ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--color-border)',
                     }}>
                       <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Quarterly</span>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₦{pkg.prices.quarterly.toLocaleString()}</div>
                     </div>
                     <div style={{
                       textAlign: 'center',
                       padding: '12px 0',
                       borderBottom: pkg.recommended ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--color-border)',
                     }}>
                       <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Biannually</span>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₦{pkg.prices.biannually.toLocaleString()}</div>
                     </div>
                     <div style={{
                       textAlign: 'center',
                       padding: '12px 0',
                     }}>
                       <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Annually</span>
                       <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₦{pkg.prices.annually.toLocaleString()}</div>
                     </div>
                   </div>

                   <ul style={{
                     listStyle: 'none',
                     padding: 0,
                     margin: '0 0 24px',
                     flex: 1,
                     fontSize: '0.9rem',
                   }}>
                     {pkg.features.map((f, i) => (
                       <li key={i} style={{
                         padding: '6px 0',
                         display: 'flex',
                         alignItems: 'center',
                         gap: 8,
                       }}>
                         <span style={{ color: pkg.recommended ? '#34d399' : 'var(--color-primary)' }}>✓</span>
                         {f}
                       </li>
                     ))}
                   </ul>

                   <button
                     onClick={() => navigate('/register')}
                     style={{
                       width: '100%',
                       padding: '12px',
                       borderRadius: 8,
                       border: 'none',
                       fontWeight: 600,
                       fontSize: '0.95rem',
                       cursor: 'pointer',
                       background: pkg.recommended ? '#fff' : 'var(--color-primary)',
                       color: pkg.recommended ? 'var(--color-primary)' : '#fff',
                       transition: 'opacity 0.2s',
                     }}
                   >
                     Get Started
                   </button>
                 </div>
               ))}
             </div>
           );
          })()}
        </section>

        {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Own a Property? List It Yourself & Save</h2>
          <p>
            Skip the agent. List your house, apartment, land, or vehicle directly. Reach thousands of local buyers and tenants — no commission fees, no middlemen, full control.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="btn-join-primary">List Your Property Free</Link>
            <Link to="/login" className="btn-join-secondary">Sign In</Link>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;
