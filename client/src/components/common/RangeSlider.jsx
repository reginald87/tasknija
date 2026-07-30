import { useCallback, useEffect, useRef, useState } from 'react';

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '';
  return `₦${Number(value).toLocaleString()}`;
}

export default function RangeSlider({ min, max, minValue, maxValue, onMinChange, onMaxChange, label, formatFn }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const fmt = formatFn || formatCurrency;

  const getPercent = (val) => ((val - min) / (max - min)) * 100;

  const minPos = getPercent(minValue ?? min);
  const maxPos = getPercent(maxValue ?? max);

  const handleMouseDown = (thumb) => (e) => {
    e.preventDefault();
    setDragging(thumb);
  };

  const handleMove = useCallback((clientX) => {
    if (!trackRef.current || dragging === null) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const val = Math.round(min + pct * (max - min));
    const clamped = Math.min(max, Math.max(min, val));

    if (dragging === 'min') {
      const next = Math.min(clamped, maxValue ?? max);
      onMinChange(next);
    } else {
      const next = Math.max(clamped, minValue ?? min);
      onMaxChange(next);
    }
  }, [dragging, min, max, minValue, maxValue, onMinChange, onMaxChange]);

  useEffect(() => {
    if (dragging === null) return;
    const onMove = (e) => handleMove(e.clientX);
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      if (touch) handleMove(touch.clientX);
    }, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleMove]);

  const steps = 5;
  const stepValues = Array.from({ length: steps + 1 }, (_, i) => min + (i / steps) * (max - min));

  return (
    <div style={{ minWidth: 260 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {fmt(minValue ?? min)} — {fmt(maxValue ?? max)}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
        {/* Tick marks */}
        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {stepValues.map((v, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 1, height: 6, background: 'var(--color-border)' }} />
              <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{fmt(v)}</span>
            </div>
          ))}
        </div>

        {/* Track background */}
        <div
          ref={trackRef}
          style={{
            position: 'absolute',
            top: 6,
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 3,
            background: 'var(--color-border)',
          }}
        >
          {/* Active track */}
          <div
            style={{
              position: 'absolute',
              height: '100%',
              borderRadius: 3,
              left: `${minPos}%`,
              width: `${maxPos - minPos}%`,
              background: 'linear-gradient(90deg, var(--color-primary), #1a6b4a)',
              transition: dragging ? 'none' : 'left 0.15s ease, width 0.15s ease',
            }}
          />
        </div>

        {/* Min thumb */}
        <div
          onMouseDown={handleMouseDown('min')}
          onTouchStart={() => setDragging('min')}
          style={{
            position: 'absolute',
            left: `calc(${minPos}% - 10px)`,
            top: 6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            border: '3px solid #fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            cursor: 'grab',
            zIndex: 2,
            transition: dragging === 'min' ? 'none' : 'left 0.15s ease',
            transform: dragging === 'min' ? 'scale(1.2)' : 'scale(1)',
          }}
        />

        {/* Max thumb */}
        <div
          onMouseDown={handleMouseDown('max')}
          onTouchStart={() => setDragging('max')}
          style={{
            position: 'absolute',
            left: `calc(${maxPos}% - 10px)`,
            top: 6,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            border: '3px solid #fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            cursor: 'grab',
            zIndex: 3,
            transition: dragging === 'max' ? 'none' : 'left 0.15s ease',
            transform: dragging === 'max' ? 'scale(1.2)' : 'scale(1)',
          }}
        />
      </div>

      {/* Inputs for exact entry */}
      <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
        <input
          type="number"
          value={minValue ?? ''}
          onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={`Min (₦${min.toLocaleString()})`}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: '0.82rem', outline: 'none',
          }}
        />
        <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)' }}>—</span>
        <input
          type="number"
          value={maxValue ?? ''}
          onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={`Max (₦${max.toLocaleString()})`}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: '0.82rem', outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
