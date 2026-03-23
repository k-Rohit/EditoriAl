import { useState, useEffect } from 'react';

interface LocationData {
  city: string;
  state: string;
  granted: boolean;
}

interface UseGeolocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<LocationData | null>(() => {
    const cached = localStorage.getItem('et_user_location');
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number): Promise<{ city: string; state: string }> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || '';
      return { city, state };
    } catch {
      return { city: '', state: '' };
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { city, state } = await reverseGeocode(latitude, longitude);

        if (city) {
          const loc = { city, state, granted: true };
          setLocation(loc);
          localStorage.setItem('et_user_location', JSON.stringify(loc));
        } else {
          setError('Could not determine your city');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied' : 'Could not get location');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // Auto-request if previously granted
  useEffect(() => {
    if (location?.granted) return;
    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        requestLocation();
      }
    }).catch(() => {});
  }, []);

  return { location, loading, error, requestLocation };
}
