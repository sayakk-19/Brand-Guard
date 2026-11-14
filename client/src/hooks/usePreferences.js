import { useCallback, useEffect, useState } from 'react';
import { readPreferences, savePreferences } from '../preferences';

// The header and Settings share the same browser preferences, including across tabs.
export function usePreferences() {
  const [preferences, setState] = useState(readPreferences);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => setState(readPreferences());
    window.addEventListener('brandguard-preferences-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('brandguard-preferences-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const setPreferences = useCallback((update) => {
    const next = typeof update === 'function' ? update(readPreferences()) : update;
    try {
      savePreferences(next);
      setError('');
    } catch {
      setError('Your browser could not save these preferences. Allow site storage and try again.');
    }
  }, []);

  return { preferences, setPreferences, error };
}
