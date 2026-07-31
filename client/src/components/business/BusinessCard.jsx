import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, ShieldCheck, ShieldX, ArrowRight, Clock, Building, Car, CalendarDays } from 'lucide-react';
import { api } from '../../services/api.js';

function formatPrice(price, currency = 'NGN') {
  if (price == null) return null;
  return currency === 'NGN' ? `₦${Number(price).toLocaleString()}` : `${currency}${Number(price).toLocaleString()}`;
}

function BusinessCard({ business }) {
  const defaultImage = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop';
  const catType = business?.category?.type || 'service';

  // Calculate star ratings
  const rating = parseFloat(business.rating_avg || 0);
  const roundedRating = Math.round(rating);
  const reviewCount = business.rating_count || 0;

  // Vendor avg response time (public endpoint)
  const [responseMinutes, setResponseMinutes] = useState(null);
  useEffect(() => {
    if (!business?.id) return undefined;
    let cancelled = false;
    api.get(`/businesses/${business.id}/response-time`)
      .then((d) => {
        if (cancelled) return;
        const mins = d?.data?.avgResponseMinutes ?? null;
        setResponseMinutes(typeof mins === 'number' ? mins : null);
      })
      .catch(() => { if (!cancelled) setResponseMinutes(null); });
    return () => { cancelled = true; };
  }, [business?.id]);

  const responseLabel =
    responseMinutes === null
      ? null
      : responseMinutes < 60
        ? `${Math.round(responseMinutes)}m`
        : responseMinutes < 60 * 24
          ? `${Math.round(responseMinutes / 60)}h`
          : `${Math.round(responseMinutes / (60 * 24))}d`;

  const unavailable = business.availability_status === 'sold' || business.availability_status === 'rented';

  return (
    <div className={`business-card-container ${business.is_featured ? 'featured-border' : ''}`}>
      <Link to={`/business/${business.id}`} className="business-card-link-wrapper">
        
        {/* Card Header Image */}
        <div className="business-card-image">
          <img
            src={business.images?.[0] || defaultImage}
            alt={business.name}
            loading="lazy"
            style={unavailable ? { filter: 'grayscale(0.9) brightness(0.75)' } : undefined}
          />
          
          {/* Card Overlays */}
          <div className="card-overlays">
            {business.is_featured && (
              <span className="overlay-badge featured-overlay">Featured</span>
            )}
            {business.is_recommended && (
              <span className="overlay-badge recommended-overlay">Top Rated</span>
            )}
            {unavailable && (
              <span className="overlay-badge sold-overlay">
                {business.availability_status === 'sold' ? 'SOLD' : 'RENTED'}
              </span>
            )}
          </div>
          {unavailable && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end',
              background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent 60%)',
            }}>
              <div style={{
                width: '100%', padding: '8px 12px', color: '#fff', fontSize: '0.72rem', fontWeight: 600,
              }}>
                No longer available · {new Date(business.sold_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* Card Content Body */}
        <div className="business-card-body">
          {/* Category and Verification */}
          <div className="card-meta-row">
            {business.category && (
              <span className={`card-category-tag ${catType}`}>{business.category.name}</span>
            )}
            {business.is_direct_from_owner && catType !== 'service' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                borderRadius: '999px', background: '#f0fdf4', color: '#166534',
              }}>
                <ShieldCheck size={11} />
                Direct Owner
              </span>
            )}
            {business.verification_status === 'verified' ? (
              <span className="verified-status-tag">
                <ShieldCheck size={14} className="verified-shield-icon" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="unverified-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-pill)', background: '#fef3c7', color: '#92400e' }}>
                <ShieldX size={14} />
                <span>Unverified</span>
              </span>
            )}
          </div>

          {/* Business Title */}
          <h3 className="business-card-title">{business.name}</h3>

          {/* Ratings */}
          <div className="business-card-rating">
            <div className="star-rating-row">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={15}
                  className={i < roundedRating ? 'star-icon filled' : 'star-icon empty'}
                />
              ))}
            </div>
            <span className="rating-score-text">{rating > 0 ? rating.toFixed(1) : 'No rating'}</span>
            <span className="rating-count-text">({reviewCount} reviews)</span>
          </div>

          {/* Location details */}
          <div className="business-card-location">
            <MapPin size={14} className="location-pin-icon" />
            <span>{business.address ? `${business.address.substring(0, 30)}${business.address.length > 30 ? '...' : ''}` : `${business.city}, ${business.state}`}</span>
          </div>

          {/* Price & listing-specific info */}
          {business.price != null && (
            <div className="price-badge" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              {formatPrice(business.price, business.currency)}
              {business.listing_type === 'rent' && (
                <span style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.8, marginLeft: 2 }}>/yr</span>
              )}
              {business.price_type === 'negotiable' && (
                <span style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.8 }}>
                  (Neg.)
                </span>
              )}
              {business.price_type === 'call_for_price' && (
                <span style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.8 }}>
                  Call
                </span>
              )}
            </div>
          )}

          {/* Property-specific badges */}
          {(business.property_type || business.bedrooms || business.furnished !== null) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {business.property_type && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  fontSize: '0.7rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <Building size={11} />
                  {business.property_type.charAt(0).toUpperCase() + business.property_type.slice(1)}
                </span>
              )}
              {business.bedrooms != null && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.bedrooms} {business.bedrooms === 1 ? 'Bed' : 'Beds'}
                </span>
              )}
              {business.bathrooms != null && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.bathrooms} {business.bathrooms === 1 ? 'Bath' : 'Baths'}
                </span>
              )}
              {business.furnished === true && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: '#fffbeb', color: '#92400e',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  Furnished
                </span>
              )}
              {business.condition && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: '#f0fdf4', color: '#166534',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.condition.charAt(0).toUpperCase() + business.condition.slice(1)}
                </span>
              )}
            </div>
          )}

          {/* Vehicle-specific badges */}
          {(business.vehicle_type || business.fuel_type || business.transmission) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {business.vehicle_type && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  fontSize: '0.7rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <Car size={11} />
                  {business.vehicle_type.charAt(0).toUpperCase() + business.vehicle_type.slice(1)}
                </span>
              )}
              {business.fuel_type && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: '#eff6ff', color: '#1e40af',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.fuel_type.charAt(0).toUpperCase() + business.fuel_type.slice(1)}
                </span>
              )}
              {business.transmission && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: '#f5f3ff', color: '#5b21b6',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.transmission.charAt(0).toUpperCase() + business.transmission.slice(1)}
                </span>
              )}
              {business.mileage != null && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.mileage.toLocaleString()} km
                </span>
              )}
              {business.year_of_manufacture && (
                <span style={{
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'var(--color-bg)', color: 'var(--color-text-muted)',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  {business.year_of_manufacture}
                </span>
              )}
            </div>
          )}

          {/* Meta: listing date + response time */}
          {business.created_at && catType !== 'service' && (
            <div className="business-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
              <CalendarDays size={13} aria-hidden="true" />
              <span title="Listing date">
                Listed {new Date(business.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
          {responseLabel !== null && (
            <div className="business-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
              <Clock size={13} aria-hidden="true" />
              <span title="Average vendor response time">~{responseLabel} response</span>
            </div>
          )}
        </div>

        {/* Card Footer Link Trigger */}
        <div className="business-card-footer">
          <span className="contact-prompt-btn">View Profile</span>
          <ArrowRight size={14} className="footer-arrow-icon" />
        </div>

      </Link>
    </div>
  );
}

export default BusinessCard;
