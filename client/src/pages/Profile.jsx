import { useAuth } from '../context/AuthContext';
import { initials, titleCase } from '../utils';
import { ShieldCheck, UserRound, LogOut, CalendarDays, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function signOut() { await logout(); navigate('/'); }
  return <div className="page-stack">
    <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR ACCOUNT</div><h1>Your profile</h1><p>Review the account details and access level used in this workspace.</p></div></section>
    <section className="panel account-profile-card"><div className="account-profile-avatar">{initials(user?.name)}</div><div className="account-profile-main"><span className="panel-kicker">BRANDGUARD MEMBER</span><h2>{user?.name || 'Workspace member'}</h2><p>{user?.email}</p></div><span className="account-role-badge"><ShieldCheck size={14} /> {titleCase(user?.role)}</span></section>
    <section className="account-profile-grid"><section className="panel account-details"><div className="panel-heading"><div><span className="panel-kicker">ACCOUNT DETAILS</span><h2>Profile information</h2></div><UserRound size={18} /></div><dl><div><dt><UserRound size={14} /> Name</dt><dd>{user?.name || '—'}</dd></div><div><dt><span className="profile-at-icon">@</span> Email</dt><dd>{user?.email || '—'}</dd></div><div><dt><ShieldCheck size={14} /> Workspace role</dt><dd>{titleCase(user?.role) || '—'}</dd></div><div><dt><Building2 size={14} /> Workspace</dt><dd>{user?.workspaceName || '—'}</dd></div></dl><p className="profile-readonly-note">Your workspace administrator manages your role and account details.</p></section><aside className="panel profile-actions-panel"><span className="panel-kicker">ACCOUNT ACTIONS</span><h2>Manage your session</h2><p>Sign out of BrandGuard on this device.</p><button className="button button-secondary" onClick={signOut}><LogOut size={15} /> Sign out</button><div className="profile-security-note"><CalendarDays size={15} /><span>Your access is controlled by your workspace role.</span></div></aside></section>
  </div>;
}
