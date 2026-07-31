import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLocationCtx } from '../context/LocationContext';
import Loading from '../components/common/Loading.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import BusinessCard from '../components/business/BusinessCard.jsx';
import ServiceMap from '../components/map/ServiceMap.jsx';
import { useDebounce } from '../hooks/useDebounce.js';

const LIMIT = 20;

const SORT_OPTIONS = [
  { value: 'recency', label: 'Newest first' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price', label: 'Price (low to high)' },
];

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCity, setCity: setGlobalCity } = useLocationCtx();

  // Filters (initialized from URL so deep links work)
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);

  // Adopt the deep-link city into the shared location context so the navbar
  // selector and search results stay in sync.
  useEffect(() => {
    const urlCity = searchParams.get('city');
    if (urlCity && selectedCity === 'All Nigeria') setGlobalCity(urlCity);
     
  }, []);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recency');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [mapView, setMapView] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const debouncedQuery = useDebounce(query, 300);

  // Cities for location picker
  const [cities, setCities] = useState([]);
  useEffect(() => {
    let cancelled = false;
    api.get('/locations/cities')
      .then((d) => {
        if (cancelled) return;
        const list = d?.data || [];
        setCities(list);
      })
      .catch(() => { if (!cancelled) setCities([]); });
    return () => { cancelled = true; };
  }, []);

  // Categories (best-effort: silently swallow if endpoint missing)
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let cancelled = false;
    api.get('/categories')
      .then((d) => {
        if (cancelled) return;
        const list = d?.data || [];
        setCategories(list);
      })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  // Results
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search effect: sync URL, fetch results
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (category) params.set('category', category);
    if (selectedCity && selectedCity !== 'All Nigeria') params.set('city', selectedCity);
    if (sortBy) params.set('sort', sortBy);
    if (verifiedOnly) params.set('verified', 'true');
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    setSearchParams(params, { replace: true });

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get(`/businesses?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        const list = data?.data || [];
        const totalCount = data?.total ?? list.length;
        setResults(Array.isArray(list) ? list : []);
        setTotal(Number(totalCount) || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, category, selectedCity, sortBy, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / LIMIT)),
    [total]
  );

  const onQueryChange = (e) => { setQuery(e.target.value); setPage(1); };
  const onCategoryChange = (e) => { setCategory(e.target.value); setPage(1); };
  const onCityChange = (e) => { setGlobalCity(e.target.value || 'All Nigeria'); setPage(1); };
  const onSortChange = (e) => { setSortBy(e.target.value); setPage(1); };
  const onVerifiedChange = (e) => { setVerifiedOnly(e.target.checked); setPage(1); };

  return (
    <div className="search-results container" style={{ marginTop: 32 }}>
      <div className="search-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <input
          type="search"
          value={query}
          onChange={onQueryChange}
          placeholder="Search services..."
          aria-label="Search"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />

        <select value={category} onChange={onCategoryChange} aria-label="Category" style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id || c.slug || c.name} value={c.slug || c.id || c.name}>{c.name}</option>
          ))}
        </select>

        <select value={selectedCity === 'All Nigeria' ? '' : selectedCity} onChange={onCityChange} aria-label="City" style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select value={sortBy} onChange={onSortChange} aria-label="Sort" style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={verifiedOnly} onChange={onVerifiedChange} aria-label="Verified only" />
          Verified only
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={mapView} onChange={(e) => setMapView(e.target.checked)} aria-label="Show map" />
          Map view
        </label>
      </div>

      <div className="search-summary" style={{ marginBottom: 12, color: 'var(--color-text-muted)', fontSize: '0.85rem' }} aria-live="polite">
        {loading ? 'Searching...' : `${total} result${total === 1 ? '' : 's'}`}
      </div>

      {mapView && !loading && !error && results.length > 0 && results.some(b => b.latitude && b.longitude) && (
        <div style={{ marginBottom: 20 }}>
          <ServiceMap businesses={results} />
        </div>
      )}

      {loading ? (
        <Loading variant="skeleton-card" count={6} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => setPage((p) => p)} />
      ) : results.length === 0 ? (
        <EmptyState icon="\u{1F50D}" title="No results found" message="Try adjusting your filters or search terms." />
      ) : (
        <>
          <div className="business-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {results.map((b) => <BusinessCard key={b.id} business={b} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default SearchResults;
