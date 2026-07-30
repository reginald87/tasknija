import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Type, List } from 'lucide-react';
import api from '../services/api';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)', fontSize: '0.85rem', background: 'var(--color-bg)',
  color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle, cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='gray' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  paddingRight: 32,
};

function LocationField({ label, value, options, onChange, disabled, placeholder, allowCustom }) {
  const [mode, setMode] = useState(options.length > 0 ? 'select' : 'input');
  const effectiveOptions = options || [];

  useEffect(() => {
    if (mode === 'select' && effectiveOptions.length === 0) setMode('input');
  }, [effectiveOptions.length, mode]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{label}</label>
        {allowCustom && effectiveOptions.length > 0 && (
          <button
            type="button"
            onClick={() => setMode(mode === 'select' ? 'input' : 'select')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 3, padding: 0,
            }}
          >
            {mode === 'select' ? <Type size={11} /> : <List size={11} />}
            {mode === 'select' ? 'Type manually' : 'Pick from list'}
          </button>
        )}
      </div>
      {mode === 'select' && effectiveOptions.length > 0 ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle} disabled={disabled}>
          <option value="">Select {label}</option>
          {effectiveOptions.map((o) => (
            <option key={o.id || o.name} value={o.name}>{o.name}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          style={inputStyle}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function LocationPicker({ state: propState, lga: propLga, city: propCity, onChange }) {
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedStateName, setSelectedStateName] = useState(propState || '');
  const [selectedLga, setSelectedLga] = useState(propLga || '');
  const [selectedCity, setSelectedCity] = useState(propCity || '');
  const initialRef = useRef(true);

  useEffect(() => {
    api.get('/locations/states').then((res) => {
      if (res.success) {
        setStates(res.data);
        if (propState) {
          const match = res.data.find((s) => s.name === propState || s.slug === propState);
          if (match) {
            setSelectedStateId(match.id);
            setSelectedStateName(match.name);
          }
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      api.get(`/locations/states/${selectedStateId}/lgas`).then((res) => {
        if (res.success) {
          setLgas(res.data);
          if (propLga && initialRef.current) {
            setSelectedLga(propLga);
          }
        }
      }).catch(() => {});
      api.get(`/locations/cities?stateId=${selectedStateId}`).then((res) => {
        if (res.success) {
          setCities(res.data);
        }
      }).catch(() => {});
    } else {
      setLgas([]);
      setCities([]);
    }
  }, [selectedStateId]);

  useEffect(() => {
    if (initialRef.current) initialRef.current = false;
  }, []);

  function handleStateChange(e) {
    const id = e.target.value;
    setSelectedStateId(id);
    setSelectedLga('');
    setSelectedCity('');
    setLgas([]);
    setCities([]);
    if (id) {
      const st = states.find((s) => s.id === id);
      const name = st ? st.name : '';
      setSelectedStateName(name);
      onChange({ state: name, lga: '', city: '' });
    } else {
      setSelectedStateName('');
      onChange({ state: '', lga: '', city: '' });
    }
  }

  function handleLgaChange(val) {
    setSelectedLga(val);
    onChange({ state: selectedStateName, lga: val, city: selectedCity });
  }

  function handleCityChange(val) {
    setSelectedCity(val);
    onChange({ state: selectedStateName, lga: selectedLga, city: val });
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.82rem', fontWeight: 600 }}>State</label>
        <select value={selectedStateId} onChange={handleStateChange} style={selectStyle}>
          <option value="">Select State</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <LocationField
        label="LGA"
        value={selectedLga}
        options={lgas}
        onChange={handleLgaChange}
        disabled={!selectedStateId}
        placeholder="Enter LGA"
        allowCustom
      />
      <LocationField
        label="City / Town"
        value={selectedCity}
        options={cities.filter((c) => {
          if (!selectedLga) return true;
          const lgaObj = lgas.find((l) => l.name === selectedLga);
          return lgaObj ? c.lga_id === lgaObj.id : true;
        })}
        onChange={handleCityChange}
        disabled={!selectedStateId}
        placeholder="Enter city or town"
        allowCustom
      />
    </div>
  );
}

export default LocationPicker;
