import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const LocationContext = createContext(null);

const STORAGE_KEY = 'tasknija_location';

export function LocationProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState('All Nigeria');
  const [selectedState, setSelectedState] = useState('');
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedCity(parsed.city || 'All Nigeria');
        setSelectedState(parsed.state || '');
        setDetecting(false);
        return;
      } catch {
        /* corrupt data, fall through to geolocation */
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { data } = await api.get(
              `/locations/nearest-city?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
            );
            if (data.success && data.data) {
              setSelectedCity(data.data.city);
              setSelectedState(data.data.state || '');
            }
          } catch {
            /* silent fail */
          } finally {
            setDetecting(false);
          }
        },
        () => setDetecting(false),
        { timeout: 5000 }
      );
    } else {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ city: selectedCity, state: selectedState }));
  }, [selectedCity, selectedState]);

  function setCity(city, state) {
    setSelectedCity(city);
    setSelectedState(state || '');
  }

  function clearCity() {
    setSelectedCity('All Nigeria');
    setSelectedState('');
  }

  return (
    <LocationContext.Provider value={{ selectedCity, selectedState, detecting, setCity, clearCity }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationCtx() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocationCtx must be used within LocationProvider');
  return context;
}
