import { useId } from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 32, showText = true, variant = 'default', className = '', link = true }) {
  const uid = useId();
  const gradId = `lg-bg-${uid}`;
  const gradGlow = `lg-glow-${uid}`;
  const gradCheck = `lg-check-${uid}`;
  const gradAccent = `lg-accent-${uid}`;

  const isLight = variant === 'light';
  const isDark = variant === 'dark';
  const taskColor = isLight ? '#ffffff' : isDark ? '#0b3d2e' : '#0b3d2e';
  const nijaColor = isLight ? '#4ade80' : isDark ? '#1a6b4a' : '#1a6b4a';

  const logoContent = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="TaskNija logo"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b3d2e" />
            <stop offset="50%" stopColor="#0f4d3a" />
            <stop offset="100%" stopColor="#1a6b4a" />
          </linearGradient>
          <radialGradient id={gradGlow} cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id={gradCheck} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0b3d2e" />
            <stop offset="100%" stopColor="#1a6b4a" />
          </linearGradient>
          <linearGradient id={gradAccent} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${gradId})`} />
        <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${gradGlow})`} />

        <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />

        <path
          d="M 24 3
             Q 26 10 30 20
             Q 37 20 45 24
             Q 37 28 30 28
             Q 26 38 24 45
             Q 22 38 18 28
             Q 11 28 3 24
             Q 11 20 18 20
             Q 22 10 24 3 Z"
          fill="white"
          opacity="0.96"
        />

        <circle cx="24" cy="24" r="4" fill={`url(#${gradId})`} />
        <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.1)" />

        <path
          d="M 19.5 23.5 L 22.5 26.5 L 29 20"
          stroke={`url(#${gradCheck})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        <circle cx="24" cy="24" r="1.8" fill={`url(#${gradAccent})`} />
      </svg>

      {showText && (
        <span style={{ lineHeight: 1, userSelect: 'none' }}>
          <span
            style={{
              fontSize: Math.round(size * 0.625),
              fontWeight: 700,
              color: taskColor,
              letterSpacing: '-0.3px',
              fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
            }}
          >
            Task
          </span>
          <span
            style={{
              fontSize: Math.round(size * 0.625),
              fontWeight: 800,
              color: nijaColor,
              letterSpacing: '-0.5px',
              fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
            }}
          >
            Nija
          </span>
        </span>
      )}
    </span>
  );

  if (link) {
    return (
      <Link to="/" className={className} aria-label="TaskNija home" style={{ textDecoration: 'none', display: 'inline-flex' }}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
