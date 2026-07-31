import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, Filter, X, Briefcase, Building2, Key, Car, Sparkles } from 'lucide-react';
import { useLocationCtx } from '../context/LocationContext';
import api from '../services/api';
import { categoryIcons } from '../constants/categories.jsx';
import BusinessCard from '../components/business/BusinessCard';
import CategoryFilters from '../components/business/CategoryFilters';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import '../styles/redesign.css';

const TYPE_CONFIG = {
  service: {
    icon: <Briefcase size={20} />,
    className: 'service',
    label: 'Service',
  },
  property: {
    icon: <Building2 size={20} />,
    className: 'property',
    label: 'Property',
  },
  rental: {
    icon: <Key size={20} />,
    className: 'rental',
    label: 'Rental',
  },
  vehicle: {
    icon: <Car size={20} />,
    className: 'vehicle',
    label: 'Vehicle',
  },
};

function CategoryPage() {
  const { slug } = useParams();
  const { selectedCity, setCity } = useLocationCtx();
  const [category, setCategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('recency');
  const [listedWithin, setListedWithin] = useState('');
  const [animateIn, setAnimateIn] = useState(false);

  const cities = useMemo(() => {
    const unique = new Set(businesses.map((b) => b.city).filter(Boolean));
    return [...unique].sort();
  }, [businesses]);

  const SORT_OPTIONS = [
    { value: 'recency', label: 'Most Recent' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price', label: 'Price (low to high)' },
    { value: 'price_desc', label: 'Price (high to low)' },
    { value: 'name', label: 'Name (A-Z)' },
  ];

  const RECENT_OPTIONS = [
    { value: '', label: 'Any time' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ];

  const applyFilters = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCity && selectedCity !== 'All Nigeria') params.set('city', selectedCity);
    if (slug) params.set('category', slug);
    if (sortBy && sortBy !== 'recency') params.set('sort', sortBy);
    if (listedWithin) params.set('listed_within', listedWithin);

    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });

    const qs = params.toString();
    try {
      const res = await api.get(`/businesses${qs ? `?${qs}` : ''}`);
      if (res?.success) setBusinesses(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [slug, selectedCity, filters, sortBy, listedWithin]);

  useEffect(() => {
    setLoading(true);
    setFilters({});
    setSortBy('recency');
    setListedWithin('');
    setAnimateIn(false);
    Promise.all([
      api.get(`/categories/${slug}`).catch(() => ({ data: { success: false } })),
      api.get('/categories').catch(() => ({ data: { success: false } })),
    ]).then(([catRes, allRes]) => {
      if (catRes.success) setCategory(catRes.data);
      if (allRes.success) setAllCategories(allRes.data);
    }).finally(() => {
      setLoading(false);
      setTimeout(() => setAnimateIn(true), 50);
    });
  }, [slug]);

  useEffect(() => {
    if (category) {
      applyFilters();
    }
  }, [category, applyFilters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    if (selectedCity && selectedCity !== 'All Nigeria') setCity('All Nigeria');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || (selectedCity && selectedCity !== 'All Nigeria');

  const typeConfig = TYPE_CONFIG[category?.type] || TYPE_CONFIG.service;
  const categoryIcon = categoryIcons[category?.slug] || TYPE_CONFIG[category?.type]?.icon || <Briefcase size={36} />;

  if (loading && !category) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Loading />
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Category not found
      </div>
    );
  }

  return (
    <div className="category-page-wrapper" style={{ opacity: animateIn ? 1 : 0 }}>
      {/* Interactive Category Banner */}
      <div className={`cat-banner ${typeConfig.className}`}>
        <div className="cat-banner-particles">
          <div className="cat-banner-particle" />
          <div className="cat-banner-particle" />
          <div className="cat-banner-particle" />
          <div className="cat-banner-particle" />
          <div className="cat-banner-particle" />
          <div className="cat-banner-particle" />
        </div>

        <div className="cat-banner-content">
          <div className="cat-banner-icon-ring">
            {categoryIcon}
          </div>
          <div className="cat-banner-text">
            <div className="cat-banner-type-badge" style={{
              background: category.type === 'property' ? 'rgba(59,130,246,0.2)' : category.type === 'rental' ? 'rgba(245,158,11,0.2)' : category.type === 'vehicle' ? 'rgba(13,148,136,0.2)' : 'rgba(74,222,128,0.2)',
              color: category.type === 'property' ? '#93c5fd' : category.type === 'rental' ? '#fde68a' : category.type === 'vehicle' ? '#5eead4' : '#4ade80',
            }}>
              {typeConfig.icon}
              {typeConfig.label}
            </div>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
            <div className="cat-banner-stats">
              <span className="cat-banner-stat">
                <strong>{businesses.length}</strong>
                <span>Listings</span>
              </span>
              <span className="cat-banner-stat">
                <strong>{cities.length}</strong>
                <span>{cities.length === 1 ? 'City' : 'Cities'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Section */}
      <div className="home-listings-section">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-accent" />
            <TrendingUp size={20} className="text-primary" />
            <h2>All {category.name}</h2>
          </div>
          <div className="section-header-actions">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              aria-label="Sort listings"
              style={{ width: 190 }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="btn-header-cta"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => setShowFilter(!showFilter)}
            >
              {showFilter ? <X size={14} /> : <Filter size={14} />}
              <span>{showFilter ? 'Close' : 'Filters'}</span>
              {hasActiveFilters && (
                <span style={{
                  marginLeft: 4, background: 'rgba(255,255,255,0.3)', borderRadius: '999px',
                  padding: '0 6px', fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {Object.keys(filters).length + (selectedCity && selectedCity !== 'All Nigeria' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Recently listed quick filter */}
        <div className="recent-listed-chips">
          <span className="recent-listed-label">Listed:</span>
          {RECENT_OPTIONS.map((opt) => (
            <button
              key={opt.value || 'any'}
              className={`recent-chip ${listedWithin === opt.value ? 'active' : ''}`}
              onClick={() => setListedWithin(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {showFilter && (
          <div className="filter-panel">
            {cities.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>City</label>
                <select
                  value={selectedCity === 'All Nigeria' ? '' : selectedCity}
                  onChange={(e) => setCity(e.target.value || 'All Nigeria')}
                  className="filter-select"
                  style={{ width: 200 }}
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}

            <CategoryFilters
              filterConfig={category.filter_config}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={clearFilters}
            />
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}><Loading /></div>
        ) : businesses.length === 0 ? (
          <EmptyState
            icon={categoryIcon}
            title={`No ${category.name} found`}
            message={selectedCity
              ? `No ${category.name} found in ${selectedCity}. Try different filters or city.`
              : 'No listings in this category yet.'}
          />
        ) : (
          <div className="listings-grid">
            {businesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        )}
      </div>

      {/* Browse Other Categories */}
      {allCategories.length > 0 && (
        <section className="home-categories-section" style={{ marginTop: 48 }}>
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-accent" />
              <Sparkles size={20} className="text-primary" />
              <h2>Browse Categories</h2>
            </div>
          </div>
          <div className="categories-card-grid">
            {allCategories.filter((c) => c.slug !== slug).map((cat) => {
              const ct = TYPE_CONFIG[cat.type] || TYPE_CONFIG.service;
              return (
                <Link key={cat.id} to={`/category/${cat.slug}`} className="glass-category-card">
                  <div className={`card-icon-wrap ${ct.className}`}>
                    {categoryIcons[cat.slug] || ct.icon}
                  </div>
                  <div className="card-info">
                    <span className="cat-name">{cat.name}</span>
                    <div className="cat-meta">
                      <span className="cat-type-tag" style={{
                        background: ct.className === 'property' ? '#eff6ff' : ct.className === 'rental' ? '#fffbeb' : ct.className === 'vehicle' ? '#f0fdfa' : 'var(--color-primary-light)',
                        color: ct.className === 'property' ? '#1d4ed8' : ct.className === 'rental' ? '#b45309' : ct.className === 'vehicle' ? '#0d9488' : 'var(--color-primary)',
                      }}>
                        {ct.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default CategoryPage;
