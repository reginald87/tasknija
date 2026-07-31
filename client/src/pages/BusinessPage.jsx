import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BusinessCard from '../components/business/BusinessCard';
import Loading from '../components/common/Loading';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import {
  MapPin, Phone, Mail, Globe, Star, ShieldCheck, Award,
  ChevronLeft, ChevronRight, X, MessageCircle, Clock, User, ChevronDown,
  DollarSign, Wallet, Loader
} from 'lucide-react';

function StarRow({ rating, size = 16 }) {
  return (
    <div className="bp-star-row" style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? 'bp-star filled' : 'bp-star'}
        />
      ))}
    </div>
  );
}

function ProductGallery({ images, onImageClick }) {
  const [mainImageIndex, setMainImageIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bp-product-gallery">
        <div className="bp-gallery-main">
          <img
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop"
            alt="Business placeholder"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bp-product-gallery">
      <div className="bp-gallery-main">
        <img
          src={images[mainImageIndex]}
          alt={`Business image ${mainImageIndex + 1}`}
          onClick={() => onImageClick(mainImageIndex)}
          className="bp-main-image-clickable"
        />
        {images.length > 1 && (
          <div className="bp-image-counter">{mainImageIndex + 1} / {images.length}</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="bp-gallery-thumbnails">
          {images.map((img, i) => (
            <button
              key={i}
              className={`bp-gallery-thumb ${i === mainImageIndex ? 'active' : ''}`}
              onClick={() => setMainImageIndex(i)}
            >
              <img src={img} alt={`Thumbnail ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  function prev(e) { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }
  function next(e) { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % images.length);
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [images.length, onClose]);

  return (
    <div className="bp-lightbox-overlay" onClick={onClose}>
      <button className="bp-lightbox-close" onClick={onClose}><X size={24} /></button>
      <button className="bp-lightbox-nav bp-lightbox-prev" onClick={prev}><ChevronLeft size={30} /></button>
      <img
        src={images[idx]}
        alt={`Gallery image ${idx + 1}`}
        className="bp-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
      <button className="bp-lightbox-nav bp-lightbox-next" onClick={next}><ChevronRight size={30} /></button>
      <div className="bp-lightbox-counter">{idx + 1} / {images.length}</div>
    </div>
  );
}

function BusinessPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState(null);
  const [relatedBusinesses, setRelatedBusinesses] = useState([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireAgreed, setHireAgreed] = useState(false);
  const [hireLoading, setHireLoading] = useState(false);
  const [hireError, setHireError] = useState('');
  const [msgError, setMsgError] = useState('');

  async function startConversation(message) {
    try {
      setMsgError('');
      const res = await api.post('/conversations', { vendorId: business.owner_id, businessId: business.id, message });
      if (res.success) { toast.success('Conversation started.'); navigate(`/messages/${res.data.id}`); }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to start conversation';
      setMsgError(msg);
      toast.error(msg);
    }
  }

  async function requestQuote() {
    const prefill = `Hi ${business.name}, I'd like to request a quote for your services. Please share your pricing, scope, and availability. Thanks!`;
    await startConversation(prefill);
  }

  useEffect(() => { if (user) { api.get('/payments/wallet').then(r => { if (r.success) setWallet(r.data); }).catch(() => {}); } }, [user]);

  useEffect(() => {
    setBusinessLoading(true);
    setBusinessError(null);
    api.get(`/businesses/${id}`).then((res) => {
      if (res.success) {
        setBusiness(res.data);
        api.get(`/businesses/${id}/related`).then((relatedRes) => {
          if (relatedRes.success) {
            setRelatedBusinesses(relatedRes.data.filter(b => b.id !== id).slice(0, 6));
          }
        }).catch(() => {});
      } else {
        setBusinessError(new Error(res.error || 'Failed to load business'));
      }
    }).catch((err) => {
      setBusinessError(err);
    }).finally(() => setBusinessLoading(false));
  }, [id]);

  async function handleHire(e) {
    e.preventDefault();
    if (!hireAgreed) { const m = 'Please agree to the terms and conditions'; setHireError(m); toast.error(m); return; }
    setHireError('');
    setHireLoading(true);
    try {
      await startConversation();
    } catch (err) {
      const m = err.response?.data?.error || err.message || 'Failed to proceed';
      setHireError(m);
      toast.error(m);
    } finally {
      setHireLoading(false);
    }
  }

  async function handleReview(e) {
    e.preventDefault();
    setReviewError('');
    setReviewLoading(true);
    try {
      const res = await api.post('/reviews', { businessId: id, rating, comment });
      if (res.success) {
        setComment('');
        setRating(5);
        toast.success('Review submitted.');
        const updated = await api.get(`/businesses/${id}`);
        if (updated.success) setBusiness(updated.data);
      }
    } catch (err) {
      const m = err.response?.data?.error || 'Failed to submit review.';
      setReviewError(m);
      toast.error(m);
    }
    setReviewLoading(false);
  }

  if (businessLoading) {
    return <Loading variant="skeleton-card" count={3} />;
  }

  if (businessError || !business) {
    return (
      <ErrorState
        message={businessError?.message || 'Business not found'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const images = business.images || [];
  const reviews = business.reviews || [];
  const certifications = business.certifications || [];

  const isUnavailable = business.availability_status === 'sold' || business.availability_status === 'rented';
  const unavailableLabel = business.availability_status === 'sold' ? 'sold' : 'rented';

  const relatedTitle = (() => {
    switch (business.category?.type) {
      case 'property': return 'Related Properties';
      case 'rental': return 'Related Rentals';
      case 'vehicle': return 'Related Vehicles';
      case 'service': return 'Related Services';
      default: return `More ${business.category?.name || 'Listings'}`;
    }
  })();

  return (
    <div className="bp-wrapper">
      {/* No longer available banner */}
      {isUnavailable && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, padding: '14px 18px',
          borderRadius: 'var(--radius-md)', border: '1.5px solid #fecaca', background: '#fef2f2',
        }}>
          <ShieldCheck size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ color: '#991b1b', fontSize: '0.95rem', display: 'block' }}>
              This property is no longer available — it has been {unavailableLabel}.
            </strong>
            <span style={{ color: '#b91c1c', fontSize: '0.82rem' }}>
              {business.sold_at ? `Marked ${unavailableLabel} on ${new Date(business.sold_at).toLocaleString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'No longer accepting enquiries'}
              {business.created_at ? ` · Listed on ${new Date(business.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="bp-banner">
        <div className="bp-banner-content">
          <div className="bp-banner-icon">
            <Award size={40} />
          </div>
          <div className="bp-banner-text">
            <h1>{business.name}</h1>
            <p>{business.category?.name || 'Professional Service Provider'}</p>
            <div className="bp-banner-meta">
              <div className="bp-banner-rating">
                <Star size={20} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                <strong>{Number(business.rating_avg || 0).toFixed(1)}</strong>
                <span>({business.rating_count || 0} reviews)</span>
              </div>
              <div className="bp-banner-location">
                <MapPin size={18} />
                {business.city}{business.state ? `, ${business.state}` : ''}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: business.verification_status === 'verified' ? '#16a34a20' : '#f59e0b20',
                color: business.verification_status === 'verified' ? '#16a34a' : '#92400e',
                textTransform: 'capitalize',
              }}>
                <ShieldCheck size={14} />
                {business.verification_status === 'verified' ? 'Verified' : business.verification_status || 'Pending KYC'}
              </span>
              {business.is_direct_from_owner && business.category?.type !== 'service' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  background: '#f0fdf4', color: '#166534',
                }}>
                  <ShieldCheck size={14} />
                  Direct from Owner
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bp-container">
        {/* Left: Main Content */}
        <div className="bp-main-col">
          <ProductGallery images={images} onImageClick={setLightboxIdx} />

          <div className="bp-content-section">
            <h2 className="bp-section-heading">About This Business</h2>
            <p className="bp-description">{business.description || 'No description provided.'}</p>
          </div>

          {/* Property/Listing details */}
          {(business.listing_type || business.price != null || business.property_type || business.bedrooms != null ||
            business.vehicle_type || business.fuel_type) && (
            <div className="bp-content-section">
              <h2 className="bp-section-heading">Listing Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {business.listing_type && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Listing Type</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{business.listing_type}</span>
                  </div>
                )}
                {business.created_at && business.category?.type !== 'service' && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Listed On</span>
                    <span style={{ fontWeight: 600 }}>{new Date(business.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {business.price != null && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Price</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                      ₦{Number(business.price).toLocaleString()}
                      {business.listing_type === 'rent' && <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> /year</span>}
                      {business.price_type === 'negotiable' && <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> (Negotiable)</span>}
                    </span>
                  </div>
                )}
                {business.condition && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Condition</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{business.condition}</span>
                  </div>
                )}
                {business.property_type && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Property Type</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{business.property_type}</span>
                  </div>
                )}
                {business.bedrooms != null && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Bedrooms</span>
                    <span style={{ fontWeight: 600 }}>{business.bedrooms}</span>
                  </div>
                )}
                {business.bathrooms != null && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Bathrooms</span>
                    <span style={{ fontWeight: 600 }}>{business.bathrooms}</span>
                  </div>
                )}
                {business.area_sqm != null && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Area</span>
                    <span style={{ fontWeight: 600 }}>{business.area_sqm} sqm</span>
                  </div>
                )}
                {business.year_built && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Year Built</span>
                    <span style={{ fontWeight: 600 }}>{business.year_built}</span>
                  </div>
                )}
                {business.furnished != null && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Furnished</span>
                    <span style={{ fontWeight: 600 }}>{business.furnished ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {business.vehicle_type && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Vehicle Type</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{business.vehicle_type}</span>
                  </div>
                )}
                {business.fuel_type && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Fuel Type</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{business.fuel_type}</span>
                  </div>
                )}
                {business.transmission && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Transmission</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{business.transmission}</span>
                  </div>
                )}
                {business.mileage != null && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Mileage</span>
                    <span style={{ fontWeight: 600 }}>{business.mileage.toLocaleString()} km</span>
                  </div>
                )}
                {business.year_of_manufacture && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block' }}>Year</span>
                    <span style={{ fontWeight: 600 }}>{business.year_of_manufacture}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bp-content-section">
            <div className="bp-section-header bp-collapsible-header" onClick={() => setReviewsExpanded(!reviewsExpanded)} style={{ cursor: 'pointer' }}>
              <h2 className="bp-section-heading">
                <MessageCircle size={18} className="bp-section-icon" />
                Customer Reviews
              </h2>
              <div className="bp-rating-summary">
                <span className="bp-rating-score">{Number(business.rating_avg || 0).toFixed(1)}</span>
                <StarRow rating={business.rating_avg || 0} size={16} />
                <span className="bp-rating-count">{business.rating_count || 0} reviews</span>
              </div>
              <ChevronDown size={20} className={`bp-collapse-icon ${reviewsExpanded ? 'expanded' : ''}`} />
            </div>

            {reviewsExpanded && (
              <>
                {reviews.length === 0 ? (
                  <EmptyState icon="\uD83D\uDCAC" title="No reviews yet" message="Be the first to review this business!" />
                ) : (
                  <div className="bp-reviews-list">
                    {reviews.map((r) => (
                      <div key={r.id} className="bp-review-item">
                        <div className="bp-review-header">
                          <div className="bp-reviewer-avatar">
                            <User size={20} />
                          </div>
                          <div className="bp-reviewer-info">
                            <strong>{r.user?.full_name || 'Anonymous'}</strong>
                            <StarRow rating={r.rating} size={12} />
                          </div>
                          <div className="bp-review-date">
                            <Clock size={12} />
                            {new Date(r.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        {r.comment && <p className="bp-review-text">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {user ? (
                  <div className="bp-write-review">
                    <h3 className="bp-review-form-title">Write a Review</h3>
                    {reviewError && <div className="bp-review-error"><span>⚠️</span><span>{reviewError}</span></div>}
                    <form className="bp-review-form" onSubmit={handleReview}>
                      <label className="bp-review-label">Your Rating</label>
                      <div className="bp-star-picker">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={24}
                            className={n <= (hoverRating || rating) ? 'bp-pick-star filled' : 'bp-pick-star'}
                            onClick={() => setRating(n)}
                            onMouseEnter={() => setHoverRating(n)}
                            onMouseLeave={() => setHoverRating(0)}
                            role="button"
                            tabIndex={0}
                          />
                        ))}
                        <span className="bp-star-label">
                          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || rating]}
                        </span>
                      </div>
                      <label className="bp-review-label">Your Review</label>
                      <textarea
                        className="bp-review-textarea"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Describe your experience with this business..."
                        rows={4}
                        required
                      />
                      <button type="submit" className="bp-review-submit-btn" disabled={reviewLoading}>
                        {reviewLoading ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bp-login-prompt">
                    <MessageCircle size={24} className="bp-login-prompt-icon" />
                    <p>Sign in to leave a review for this business.</p>
                    <a href="/login" className="bp-login-prompt-btn">Sign In to Review</a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="bp-sidebar-col">
          {/* Business Header */}
          <div className="bp-sidebar-header">
            <div className="bp-badges">
              {business.is_featured && <span className="bp-badge bp-badge-featured">⭐ Featured</span>}
              {business.is_recommended && <span className="bp-badge bp-badge-recommended">✓ Recommended</span>}
            </div>
            <h1 className="bp-title">{business.name}</h1>
            <div className="bp-meta">
              {business.category && (
                <span className="bp-category-tag">{business.category.name}</span>
              )}
              <div className="bp-rating">
                <Star size={16} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                <strong>{Number(business.rating_avg || 0).toFixed(1)}</strong>
                <span>({business.rating_count || 0} reviews)</span>
              </div>
              {business.city && (
                <span className="bp-location">
                  <MapPin size={14} />
                  {business.city}{business.state ? `, ${business.state}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Wallet & Hire */}
          {user && user.id !== business.owner_id && (
            <div className="bp-sidebar-actions">
              {wallet && (
                <div className="bp-wallet-info" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', fontSize: '0.85rem', marginBottom: 8 }}>
                  <Wallet size={16} />
                  <span>Balance: <strong>₦{Number(wallet.balance).toLocaleString()}</strong></span>
                </div>
              )}
              {isUnavailable ? (
                <button
                  className="bp-action-btn"
                  disabled
                  style={{ background: '#dc2626', color: '#fff', opacity: 0.85, cursor: 'not-allowed' }}
                >
                  <DollarSign size={18} />
                  No Longer Available
                </button>
              ) : (
                <>
                  <button
                    className="bp-action-btn bp-action-hire"
                    onClick={() => setShowHireModal(true)}
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <DollarSign size={18} />
                    Hire Now
                  </button>
                  <button
                    className="bp-action-btn bp-action-quote"
                    onClick={() => requestQuote()}
                    style={{ background: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)' }}
                  >
                    <MessageCircle size={18} />
                    Request a quote
                  </button>
                </>
              )}
            </div>
          )}

          {/* Contact Actions */}
          <div className="bp-sidebar-actions">
            {isUnavailable ? (
              <button
                className="bp-action-btn"
                disabled
                style={{ background: 'transparent', color: '#991b1b', border: '1.5px solid #fecaca', cursor: 'not-allowed', opacity: 0.85 }}
              >
                <ShieldCheck size={18} />
                {unavailableLabel === 'sold' ? 'Sold' : 'Rented'} — enquiries closed
              </button>
            ) : user ? (
              <>
                {msgError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: 8 }}>{msgError}</p>}
                <button
                  className="bp-action-btn bp-action-message"
                  onClick={() => startConversation()}
                >
                  <MessageCircle size={18} />
                  Message Vendor
                </button>
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="bp-action-btn bp-action-call">
                    <Phone size={18} />
                    Call Now
                  </a>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`} className="bp-action-btn bp-action-email">
                    <Mail size={18} />
                    Send Email
                  </a>
                )}
              </>
            ) : (
              <a href="/login" className="bp-action-btn bp-action-login">
                <ShieldCheck size={18} />
                Sign In to Contact
              </a>
            )}
          </div>

          {certifications.length > 0 && (
            <div className="bp-sidebar-section">
              <h3 className="bp-sidebar-heading">
                <Award size={18} className="bp-sidebar-icon" />
                Certifications
              </h3>
              <div className="bp-cert-list">
                {certifications.map((c, i) => (
                  <div key={i} className="bp-cert-item">
                    <ShieldCheck size={16} className="bp-cert-icon" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bp-sidebar-section">
            <h3 className="bp-sidebar-heading">
              <MapPin size={18} className="bp-sidebar-icon" />
              Contact Info
            </h3>

            {!user && (
              <div className="bp-login-notice">
                <ShieldCheck size={20} className="bp-notice-icon" />
                <div>
                  <strong>Sign in to view contact details</strong>
                  <p>Create a free account to see phone numbers and email addresses.</p>
                  <a href="/login" className="bp-notice-btn">Sign In</a>
                </div>
              </div>
            )}

            <div className="bp-contact-list">
              {business.address && (
                <div className="bp-contact-item">
                  <div className="bp-contact-icon-wrap"><MapPin size={18} /></div>
                  <div>
                    <span className="bp-contact-label">Address</span>
                    <span className="bp-contact-value">{business.address}{business.city ? `, ${business.city}` : ''}{business.state ? `, ${business.state}` : ''}</span>
                  </div>
                </div>
              )}
              {business.phone && (
                <div className="bp-contact-item">
                  <div className="bp-contact-icon-wrap"><Phone size={18} /></div>
                  <div>
                    <span className="bp-contact-label">Phone</span>
                    {user ? (
                      <a href={`tel:${business.phone}`} className="bp-contact-value bp-contact-link">{business.phone}</a>
                    ) : (
                      <span className="bp-contact-value bp-contact-hidden">Sign in to view</span>
                    )}
                  </div>
                </div>
              )}
              {business.email && (
                <div className="bp-contact-item">
                  <div className="bp-contact-icon-wrap"><Mail size={18} /></div>
                  <div>
                    <span className="bp-contact-label">Email</span>
                    {user ? (
                      <a href={`mailto:${business.email}`} className="bp-contact-value bp-contact-link">{business.email}</a>
                    ) : (
                      <span className="bp-contact-value bp-contact-hidden">Sign in to view</span>
                    )}
                  </div>
                </div>
              )}
              {business.website && (
                <div className="bp-contact-item">
                  <div className="bp-contact-icon-wrap"><Globe size={18} /></div>
                  <div>
                    <span className="bp-contact-label">Website</span>
                    <a href={business.website} target="_blank" rel="noreferrer" className="bp-contact-value bp-contact-link">{business.website}</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {business.latitude && business.longitude && (
            <div className="bp-sidebar-section">
              <h3 className="bp-sidebar-heading">
                <MapPin size={18} className="bp-sidebar-icon" />
                Location
              </h3>
              <div className="bp-map-container">
                <iframe
                  title="Business location map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${business.longitude - 0.01},${business.latitude - 0.01},${business.longitude + 0.01},${business.latitude + 0.01}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {relatedBusinesses.length > 0 && (
        <div className="bp-related-section">
          <div className="bp-related-header">
            <h2 className="bp-related-title">
              <Award size={20} className="bp-related-icon" />
              {relatedTitle}
            </h2>
            <Link to={`/categories/${business.category?.slug || ''}`} className="bp-related-link">
              View All &gt;
            </Link>
          </div>
          <div className="bp-related-grid">
            {relatedBusinesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </div>
      )}

      {lightboxIdx !== null && images.length > 0 && (
        <Lightbox
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {showHireModal && (
        <div className="bp-hire-overlay" onClick={() => { if (!hireLoading) setShowHireModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="bp-hire-modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius)', padding: 24, maxWidth: 520, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Hire {business.name}</h2>
              <button onClick={() => setShowHireModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}><X size={20} /></button>
            </div>

            <form onSubmit={handleHire}>
              <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>Platform Terms & Conditions</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  By hiring a service provider on TaskNija, you agree to the following:
                </p>
                <ul style={{ paddingLeft: 20, margin: '0 0 8px', color: 'var(--color-text-muted)' }}>
                  <li>Payment is held in escrow until you confirm the service is completed.</li>
                  <li>You can raise a dispute if the service is not delivered as agreed.</li>
                  <li>A 2% platform fee is applied to each transaction (deducted from vendor payout).</li>
                  <li>Discuss the scope, timeline, and price with the vendor before accepting a quote.</li>
                  <li>TaskNija acts as an intermediary and is not liable for service quality disputes.</li>
                </ul>
              </div>

              {business.service_terms && (
                <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>Vendor's Service Terms</h3>
                  <p style={{ color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>{business.service_terms}</p>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                  After agreeing, you'll be redirected to a conversation with the vendor to discuss pricing and scope. The vendor will send you a formal quote which you can accept or reject.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hireAgreed}
                    onChange={e => setHireAgreed(e.target.checked)}
                  />
                  I have read and agree to the terms and conditions above
                </label>
              </div>

              {hireError && <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginBottom: 12 }}>{hireError}</p>}

              <button
                type="submit"
                disabled={hireLoading || !hireAgreed}
                style={{ width: '100%', padding: 12, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!hireAgreed || hireLoading) ? 0.6 : 1 }}
              >
                {hireLoading ? <><Loader size={18} className="spin" /> Redirecting...</> : 'Agree & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessPage;
