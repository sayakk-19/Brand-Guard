import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BookOpenCheck, ChevronDown, FileCheck2, LayoutDashboard, LogOut, Plus, Search, Settings2, ShieldCheck, Sparkles, UserRound, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils';
import { useEffect, useState } from 'react';

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Content reviews', to: '/reviews', icon: FileCheck2 },
  { label: 'Brand Brain', to: '/brand', icon: BookOpenCheck },
  { label: 'Insights', to: '/insights', icon: Activity }
];

export default function AppLayout() {
  const { user, logout, sessionNotice, dismissSessionNotice } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [compactLists, setCompactLists] = useState(() => { try { return JSON.parse(localStorage.getItem('brandguard.appPreferences') || '{}').compactLists === true; } catch { return false; } });
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = location.pathname.startsWith('/reviews/new') ? 'New review'
    : location.pathname.startsWith('/reviews/') && location.pathname !== '/reviews' ? 'Review workspace'
    : location.pathname === '/profile' ? 'Profile'
    : location.pathname === '/settings' ? 'Settings'
    : navigation.find((item) => item.to === location.pathname)?.label || 'Workspace';
  useEffect(() => { const refresh = () => { try { const prefs = JSON.parse(localStorage.getItem('brandguard.appPreferences') || '{}'); setCompactLists(prefs.compactLists === true); document.documentElement.dataset.theme = prefs.theme === 'dark' ? 'dark' : 'light'; } catch { setCompactLists(false); document.documentElement.dataset.theme = 'light'; } }; refresh(); window.addEventListener('brandguard-preferences-changed', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('brandguard-preferences-changed', refresh); window.removeEventListener('storage', refresh); }; }, []);

  return (
    <div className={`app-shell ${compactLists ? 'compact-review-lists' : ''}`}>
      {sessionNotice && <div className="session-toast" role="status"><CheckCircle2 size={17} /><span>{sessionNotice}</span><button onClick={dismissSessionNotice} aria-label="Dismiss notification"><X size={15} /></button></div>}
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <button className="sidebar-brand-link" onClick={() => navigate('/')} aria-label="BrandGuard overview"><div className="brand-mark">B</div>
          <div><div className="brand-name">brandguard<span>®</span></div><div className="brand-subtitle">BRAND GOVERNANCE</div></div></button>
          <button className="icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">×</button>
        </div>
        <button className="workspace-switcher" onClick={() => { navigate('/'); setMobileNavOpen(false); }} aria-label={`${user?.workspaceName || 'Workspace'} overview`} title="Open workspace overview">
          <div className="workspace-avatar">{initials(user?.workspaceName)}</div>
          <div className="workspace-copy"><strong>{user?.workspaceName || 'Your workspace'}</strong><span>Shared workspace</span></div>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <Icon size={17} strokeWidth={1.9} /><span>{label}</span>
              {label === 'Content reviews' && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-card">
          <div className="sidebar-card-icon"><Sparkles size={15} /></div>
          <div><strong>Keep your brand sharp</strong><p>Review every draft against the latest approved guidance.</p></div>
          <button onClick={() => navigate('/brand')} className="text-button">Explore Brand Brain <span>↗</span></button>
        </div>
        <div className="sidebar-footer">
          <button className="nav-link footer-link" onClick={() => navigate('/settings')}><Settings2 size={17} /><span>App settings</span></button>
          <div className="profile-row">
            <div className="avatar avatar-small">{initials(user?.name)}</div>
            <div className="profile-copy"><strong>{user?.name}</strong><span>{user?.role}</span></div>
            <div className="profile-menu-wrap">
              <button className="icon-button" aria-label="Account menu" onClick={() => setMenuOpen((open) => !open)}><ChevronDown size={16} /></button>
              {menuOpen && <div className="profile-menu"><div className="profile-menu-email">{user?.email}</div><button onClick={() => { setMenuOpen(false); navigate('/profile'); }}><UserRound size={15} /> See your profile</button><button onClick={async () => { setMenuOpen(false); await logout(); }}><LogOut size={15} /> Sign out</button></div>}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">☰</button><button className="breadcrumb-muted breadcrumb-home" onClick={() => navigate('/')} aria-label="Go to workspace overview">Workspace</button><span className="breadcrumb-divider">/</span><span className="breadcrumb-current">{pageTitle}</span></div>
          <div className="topbar-right">
            {searchOpen ? <form className="search-shortcut search-shortcut-open" onSubmit={(event) => { event.preventDefault(); navigate(`/reviews${searchTerm.trim() ? `?q=${encodeURIComponent(searchTerm.trim())}` : ''}`); setSearchOpen(false); }}><Search size={15} /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setSearchOpen(false); setSearchTerm(''); } }} placeholder="Search reviews…" aria-label="Search reviews" /><button type="submit">Go</button></form> : <button className="search-shortcut" onClick={() => setSearchOpen(true)} title="Search content reviews"><Search size={15} /><span>Search reviews</span><kbd>↵</kbd></button>}
            <div className="topbar-divider" />
            <div className="topbar-workspace"><span className="status-pulse" /> All systems operational</div>
            <button className="avatar avatar-top avatar-top-button" onClick={() => navigate('/profile')} aria-label="See your profile">{initials(user?.name)}</button>
          </div>
        </header>
        <div className="page-container"><Outlet /></div>
      </main>
      <button className="floating-create" onClick={() => navigate('/reviews/new')} aria-label="Create a review"><Plus size={21} /></button>
    </div>
  );
}
