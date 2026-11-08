import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
const displayRole = (role = '') => role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(({ data }) => { if (active) setUser(data.user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials);
      setUser(data.user);
      setSessionNotice(`You signed in as ${displayRole(data.user.role)}.`);
      return data.user;
    },
    async register(details) {
      const { data } = await api.post('/auth/register', details);
      setUser(data.user);
      setSessionNotice(data.joinedWorkspace ? `You joined as ${displayRole(data.user.role)}.` : `Your workspace is ready. You joined as ${displayRole(data.user.role)}.`);
      return data.user;
    },
    dismissSessionNotice() { setSessionNotice(''); },
    async logout() {
      try { await api.post('/auth/logout'); } finally { setUser(null); setSessionNotice(''); }
    }
  }), [user, loading, sessionNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
