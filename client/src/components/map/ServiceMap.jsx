import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useLocationCtx } from '../../context/LocationContext';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_ICONS = {
  plumbing: { color: '#0D9488', path: 'M12 2a3 3 0 0 0-3 3c0 1.2.7 2.2 1.7 2.7L10 11h4l-.7-3.3A3 3 0 0 0 15 5a3 3 0 0 0-3-3Zm-1 11h2l.5 2H13v4h-2v-4h-.5Z' },
  painting: { color: '#DB2777', path: 'M18 3a3 3 0 0 0-3 3v1h-2a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1h-2V6a1 1 0 0 1 2 0 1 1 0 0 0 2 0 3 3 0 0 0-3-3Zm-5 10.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4h-4v-1.5Z' },
  carpentry: { color: '#B45309', path: 'M13 2v4l-4 2v-4Zm-5 3.5L3 8v4l5-2.5Zm10 0L21 8v4l-5-2.5ZM12 9l4 2v4l-4 2-4-2v-4Zm0 8l4 2v3l-4-2-4 2v-3Z' },
  'electronics-repair': { color: '#2563EB', path: 'M7 2v20h10V2Zm2 2h6v2H9Zm0 4h6v2H9Zm0 4h6v2H9Zm0 4h6v2H9Z' },
  cleaning: { color: '#06B6D4', path: 'M14 2a1 1 0 0 0-1 1v3H9V3a1 1 0 0 0-2 0v4a2 2 0 0 0 2 2v10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9a2 2 0 0 0 2-2V3a1 1 0 0 0-1-1h-2Z' },
  mechanic: { color: '#DC2626', path: 'M19.5 12A7.5 7.5 0 0 1 12 19.5 7.5 7.5 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5a7.492 7.492 0 0 1 3 .622V8.5l3-3-3-3v2.08A9.5 9.5 0 0 0 12 2.5a9.5 9.5 0 1 0 7.5 14.5' },
  tutoring: { color: '#7C3AED', path: 'M4 4v16h16V4Zm3 3h10v2H7Zm0 4h7v2H7Zm0 4h10v2H7Z' },
  default: { color: '#0b3d2e', path: 'M12 7.5a3 3 0 100 6 3 3 0 000-6z' },
};

const userDotIcon = L.divIcon({
  className: 'user-location-dot',
  html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="#3b82f6" stroke="white" stroke-width="3" opacity="0.9"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function markerIcon(category) {
  const cat = CATEGORY_ICONS[category?.slug] || CATEGORY_ICONS.default || { color: '#0b3d2e', path: 'M12 7.5a3 3 0 100 6 3 3 0 000-6z' };
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="${cat.color}" stroke="white" stroke-width="2"/>
      <path d="${cat.path}" fill="white"/>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function MapBoundsUpdater({ businesses }) {
  const map = useMap();
  useEffect(() => {
    const valid = businesses.filter((b) => b.latitude && b.longitude);
    if (valid.length > 0) {
      const bounds = L.latLngBounds(
        valid.map((b) => [b.latitude, b.longitude])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [businesses, map]);
  return null;
}

function BusinessPopup({ b, distance }) {
  return (
    <div style={{ minWidth: 160 }}>
      <strong style={{ fontSize: '0.95rem' }}>{b.name}</strong>
      <br />
      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{b.city}{b.state ? `, ${b.state}` : ''}</span>
      {distance != null && (
        <>
          <br />
          <span style={{ fontSize: '0.75rem', color: '#0b3d2e', fontWeight: 600 }}>
            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} away
          </span>
        </>
      )}
      <br />
      <Link
        to={`/business/${b.id}`}
        style={{
          display: 'inline-block',
          marginTop: 8,
          padding: '4px 12px',
          background: '#0b3d2e',
          color: '#fff',
          borderRadius: 6,
          fontSize: '0.8rem',
          textDecoration: 'none',
        }}
      >
        View Profile
      </Link>
    </div>
  );
}

function ServiceMap({ businesses: propBusinesses }) {
  const { selectedCity } = useLocationCtx();
  const [businesses, setBusinesses] = useState(propBusinesses || []);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearMe, setNearMe] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        if (err.code === 1) setLocationError('Location permission denied');
        else if (err.code === 2) setLocationError('Location unavailable');
        else setLocationError('Could not get location');
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, []);

  useEffect(() => {
    if (!propBusinesses) {
      const cityParam = selectedCity && selectedCity !== 'All Nigeria' ? `?city=${encodeURIComponent(selectedCity)}` : '';
      api.get(`/businesses${cityParam}`).then((res) => {
        if (res.success) setBusinesses(res.data);
      });
    }
  }, [propBusinesses, selectedCity]);

  const validBusinesses = businesses.filter((b) => b.latitude && b.longitude);
  const withDistance = userLocation && nearMe
    ? validBusinesses
        .map((b) => ({ ...b, _distance: haversineKm(userLocation[0], userLocation[1], b.latitude, b.longitude) }))
        .filter((b) => b._distance <= 100)
        .sort((a, b) => a._distance - b._distance)
    : validBusinesses;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <button
          onClick={() => userLocation && setNearMe((v) => !v)}
          disabled={!userLocation}
          title={!userLocation ? (locationError || 'Allow location access in your browser to use this') : ''}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: nearMe ? '2px solid #0b3d2e' : '1px solid #d1d5db',
            background: nearMe ? '#0b3d2e' : '#fff',
            color: !userLocation ? '#9ca3af' : nearMe ? '#fff' : '#374151',
            cursor: userLocation ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: userLocation ? 1 : 0.6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {!userLocation ? 'Location unavailable' : nearMe ? 'Showing nearby' : 'Near me'}
        </button>
        {nearMe && withDistance.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#6b7280', alignSelf: 'center' }}>
            {withDistance.length} within 100 km
          </span>
        )}
      </div>
      <MapContainer
        center={userLocation || [9.082, 8.6753]}
        zoom={userLocation ? 12 : 6}
        style={{ height: 500, width: '100%', borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withDistance.length > 0 && (
          <MapBoundsUpdater
            businesses={
              nearMe && userLocation
                ? [{ latitude: userLocation[0], longitude: userLocation[1] }, ...withDistance]
                : withDistance
            }
          />
        )}
        {userLocation && (
          <Marker position={userLocation} icon={userDotIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {withDistance.map((b) => (
          <Marker key={b.id} position={[b.latitude, b.longitude]} icon={markerIcon(b.category)}>
            <Popup>
              <BusinessPopup b={b} distance={b._distance ?? null} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default ServiceMap;
