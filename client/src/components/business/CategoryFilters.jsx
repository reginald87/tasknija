import { X } from 'lucide-react';
import RangeSlider from '../common/RangeSlider';

function SelectFilter({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="filter-select"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}</option>
        ))}
      </select>
    </div>
  );
}

function RangeFilter({ label, minKey, maxKey, minValue, maxValue, onMinChange, onMaxChange }) {
  return (
    <RangeSlider
      label={label}
      min={0}
      max={100000000}
      minValue={minValue}
      maxValue={maxValue}
      onMinChange={onMinChange}
      onMaxChange={onMaxChange}
    />
  );
}

function BooleanFilter({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</label>
      <select
        value={value === undefined ? '' : value ? 'yes' : 'no'}
        onChange={(e) => {
          if (e.target.value === '') onChange(undefined);
          else onChange(e.target.value === 'yes');
        }}
        className="filter-select"
      >
        <option value="">All</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
}

export default function CategoryFilters({ filterConfig, filters, onFilterChange, onClear }) {
  if (!filterConfig?.filters?.length) return null;

  const renderFilter = (cfg) => {
    const value = filters[cfg.key];

    switch (cfg.type) {
      case 'select':
        return (
          <SelectFilter
            key={cfg.key}
            label={cfg.label}
            options={cfg.options}
            value={value}
            onChange={(v) => onFilterChange(cfg.key, v)}
          />
        );
      case 'range':
        return (
          <RangeFilter
            key={cfg.key}
            label={cfg.label}
            minKey={cfg.min_key}
            maxKey={cfg.max_key}
            minValue={filters[cfg.min_key]}
            maxValue={filters[cfg.max_key]}
            onMinChange={(v) => onFilterChange(cfg.min_key, v)}
            onMaxChange={(v) => onFilterChange(cfg.max_key, v)}
          />
        );
      case 'boolean':
        return (
          <BooleanFilter
            key={cfg.key}
            label={cfg.label}
            value={value}
            onChange={(v) => onFilterChange(cfg.key, v)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="filter-panel-row">
      {filterConfig.filters.map(renderFilter)}
      <div className="filter-panel-actions">
        <button onClick={onClear} className="filter-clear-btn">
          <X size={14} />
          Clear All
        </button>
      </div>
    </div>
  );
}
