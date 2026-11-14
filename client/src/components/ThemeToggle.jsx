import { Moon, Sun } from 'lucide-react';
import { usePreferences } from '../hooks/usePreferences';

export default function ThemeToggle() {
  const { preferences, setPreferences, error } = usePreferences();
  const dark = preferences.theme === 'dark';
  return <div className="theme-toggle-wrap">
    <button className="theme-toggle" aria-label={dark ? 'Switch to light theme' : 'Switch to midnight theme'}
      title={dark ? 'Switch to light theme' : 'Switch to midnight theme'} aria-pressed={dark}
      onClick={() => setPreferences((current) => ({ ...current, theme: dark ? 'light' : 'dark' }))}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
    {error && <span className="theme-toggle-error" role="alert">{error}</span>}
  </div>;
}
