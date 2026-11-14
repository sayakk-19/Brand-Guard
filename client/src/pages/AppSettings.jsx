import { useEffect, useState } from 'react';
import { Check, RotateCcw, SlidersHorizontal, Sun, Moon, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { preferenceDefaults as defaults } from '../preferences';
import { usePreferences } from '../hooks/usePreferences';


export default function AppSettings() {
  const { preferences, setPreferences, error: preferenceError } = usePreferences();
  const [saved, setSaved] = useState(false);
  const { user, logout } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { setSaved(true); const timer = setTimeout(() => setSaved(false), 1600); return () => clearTimeout(timer); }, [preferences]);
  const toggle = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  return <div className="page-stack">
    <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> PERSONAL PREFERENCES</div><h1>App settings</h1><p>Choose how BrandGuard works for you. These preferences stay in this browser.</p></div>{saved && <span className="preferences-saved"><Check size={14} /> Saved automatically</span>}</section>
    {preferenceError && <div className="inline-alert error-alert" role="alert">{preferenceError}</div>}
    <section className="panel preferences-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR REVIEW WORKFLOW</span><h2>Make the app fit your work</h2></div><SlidersHorizontal size={18} /></div>
      <label className="preference-row"><span><strong>Compact review lists</strong><small>Show more reviews in the queue at once.</small></span><input type="checkbox" checked={preferences.compactLists} onChange={() => toggle('compactLists')} /></label>
      <label className="preference-row preference-select"><span><strong>Preferred publishing channel</strong><small>Preselect this channel when you start a review.</small></span><select value={preferences.preferredChannel} onChange={(event) => setPreferences((current) => ({ ...current, preferredChannel: event.target.value }))}><option value="linkedin">LinkedIn</option><option value="website">Website</option><option value="email">Email</option><option value="print">Print / Brochure</option><option value="other">Other</option></select></label>
      <div className="theme-setting"><div><strong>Appearance</strong><small>Choose a comfortable theme for BrandGuard.</small></div><div className="theme-options" role="group" aria-label="Choose theme"><button className={preferences.theme === 'light' ? 'theme-option theme-option-selected' : 'theme-option'} onClick={() => setPreferences((current) => ({ ...current, theme: 'light' }))}><Sun size={15} /> Light</button><button className={preferences.theme === 'dark' ? 'theme-option theme-option-selected' : 'theme-option'} onClick={() => setPreferences((current) => ({ ...current, theme: 'dark' }))}><Moon size={15} /> Dark</button></div></div>
      <button className="button button-ghost preferences-reset" onClick={() => setPreferences(defaults)}><RotateCcw size={14} /> Restore defaults</button>
    </section>
    <div className="preferences-note">These are personal app preferences. Brand rules, member access and external AI approval remain controlled by workspace administrators.</div>
    {user?.role !== 'admin' && !['creator', 'manager', 'reviewer'].some((role) => user?.email === `${role}@brandguard.demo`) && <section className="panel danger-zone"><div className="danger-zone-icon"><AlertTriangle size={17} /></div><div className="danger-zone-copy"><span className="panel-kicker">ACCOUNT</span><h2>Delete your account</h2><p>Your sign-in will be disabled. Shared reviews and approval history stay in the workspace for audit purposes.</p></div><button className="button button-danger" onClick={() => { setDeleteOpen(true); setDeleteError(''); }}>Delete account <Trash2 size={14} /></button></section>}
    {deleteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteOpen(false); }}><div className="modal-card delete-account-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><div className="modal-heading"><div><span className="eyebrow">ACCOUNT ACCESS</span><h2 id="delete-account-title">Delete your account?</h2><p>This disables your account and signs you out. Shared workspace review history will remain.</p></div><button className="icon-button" onClick={() => setDeleteOpen(false)} aria-label="Close" disabled={deleting}>×</button></div><form className="modal-form" onSubmit={async (event) => { event.preventDefault(); setDeleting(true); setDeleteError(''); try { await api.post('/auth/delete-account', { password }); await logout(); } catch (err) { setDeleteError(err.userMessage || 'Could not delete this account.'); setDeleting(false); } }}><label className="field-label">Confirm with your password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} /></label>{deleteError && <div className="inline-alert error-alert">{deleteError}</div>}<div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>Keep account</button><button className="button button-danger" disabled={deleting || !password}>{deleting ? 'Deleting…' : 'Delete account'} <Trash2 size={14} /></button></div></form></div></div>}
  </div>;
}
