import { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, FileCheck2, Plus, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, initials, severityTone, statusTone, timeAgo, titleCase } from '../utils';

function MetricCard({ label, value, note, icon: Icon, tone = 'default', trend }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-icon-${tone}`}><Icon size={17} /></span></div><div className="metric-value">{value ?? '—'}</div><div className="metric-note">{trend && <span className="metric-trend"><ArrowUpRight size={13} /> {trend}</span>}{note}</div></div>;
}

function EmptyPanel({ title, copy, action }) {
  return <div className="empty-state"><div className="empty-icon"><FileCheck2 size={22} /></div><strong>{title}</strong><p>{copy}</p>{action}</div>;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberError, setMemberError] = useState('');
  const [memberNotice, setMemberNotice] = useState('');
  const [memberBusy, setMemberBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const loadDashboard = useCallback(async () => {
    setError('');
    try { const { data: result } = await api.get('/dashboard/summary'); setData(result); }
    catch (err) { setError(err.userMessage || 'Unable to load the dashboard.'); }
  }, []);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  const canManageTeam = user?.role === 'admin' && user?.email !== 'admin@brandguard.demo';
  useEffect(() => { if (!canManageTeam) return; api.get('/workspace/members').then(({ data: result }) => setMembers(result.members)).catch((err) => setMemberError(err.userMessage || 'Could not load workspace members.')); }, [canManageTeam]);
  async function changeMemberRole(memberId, role) {
    setMemberError(''); setMemberNotice(''); setMemberBusy(true);
    try { const { data: result } = await api.patch(`/workspace/members/${memberId}/role`, { role }); setMembers((current) => current.map((member) => member._id === memberId ? result.member : member)); setMemberNotice('Workspace role updated.'); }
    catch (err) { setMemberError(err.userMessage || 'Could not update this role.'); }
    finally { setMemberBusy(false); }
  }
  async function decideAccess(memberId, decision) {
    setMemberBusy(true); setMemberError(''); setMemberNotice('');
    try {
      const { data: result } = await api.patch(`/workspace/members/${memberId}/access`, { decision });
      setMembers((current) => current.map((member) => member._id === memberId ? result.member : member));
      setMemberNotice(`Workspace access ${decision}.`);
    } catch (err) { setMemberError(err.userMessage || 'Could not update access.'); }
    finally { setMemberBusy(false); }
  }
  const summary = data?.summary;

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR BRAND, IN GOOD HANDS</div><h1>Good morning, <span>{user?.name?.split(' ')[0] || 'there'}.</span></h1><p>Here’s what’s happening across your brand workspace.</p></div>
        <button className="button button-primary" onClick={() => navigate('/reviews/new')}><Plus size={17} /> New content review</button>
      </section>
      {error && <div className="inline-alert error-alert">{error}<button className="text-button" onClick={loadDashboard}>Try again</button></div>}
      <section className="metrics-grid">
        <MetricCard label="Content pieces" value={summary?.total} note="Tracked in this workspace" icon={FileCheck2} tone="blue" />
        <MetricCard label="Awaiting review" value={summary?.inReview} note="Items in the review queue" icon={Clock3} tone="amber" />
        <MetricCard label="Open findings" value={summary?.openFindings} note={`${summary?.highPriority ?? 0} high priority`} icon={CircleAlert} tone="rose" />
        <MetricCard label="Approved content" value={summary?.approved} note="Revision-specific approvals" icon={ShieldCheck} tone="green" />
      </section>

      <section className="dashboard-grid-main">
        <div className="panel recent-panel">
          <div className="panel-heading"><div><span className="panel-kicker">CONTENT WORKFLOW</span><h2>Recently reviewed</h2><p>Keep an eye on the work moving through your team.</p></div><Link to="/reviews" className="quiet-link">View all <ArrowRight size={15} /></Link></div>
          {data?.latestItems?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>CONTENT</th><th>OWNER</th><th>STATUS</th><th>UPDATED</th></tr></thead><tbody>{data.latestItems.map((item) => <tr key={item._id} onClick={() => navigate(`/reviews/${item._id}`)} className="clickable-row"><td><div className="content-cell"><span className="file-icon"><FileCheck2 size={16} /></span><div><strong>{item.title}</strong><small>{titleCase(item.channel)} · {item.currentRevisionId ? `v${item.currentRevisionId.revisionNumber}` : 'No revision'}</small></div></div></td><td><div className="owner-cell"><span className="avatar avatar-tiny">{initials(item.createdBy?.name)}</span>{item.createdBy?.name || 'Unknown'}</div></td><td><span className={`status-badge status-${statusTone(item.status)}`}><i />{titleCase(item.status)}</span></td><td className="muted-cell">{timeAgo(item.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyPanel title="Your review history starts here" copy="Create a content review to see findings, revisions and approval activity in one place." action={<button className="button button-secondary button-small" onClick={() => navigate('/reviews/new')}>Create a review <ArrowRight size={14} /></button>} />}
        </div>
        <div className="panel brand-health-panel">
          <div className="panel-heading compact-heading"><div><span className="panel-kicker">BRAND KNOWLEDGE</span><h2>Governance snapshot</h2></div><div className="health-mark"><ShieldCheck size={18} /></div></div>
          <div className="health-stat"><div className="health-stat-number">{summary?.activeRules ?? '—'}</div><div><strong>Approved guidelines</strong><span>Active sources used in reviews</span></div></div>
          <div className="health-divider" />
          <div className="health-progress-label"><span>Review activity</span><strong>{summary ? `${summary.inReview + summary.approved} / ${summary.total || 1}` : '—'}</strong></div>
          <div className="progress-track"><span style={{ width: summary ? `${Math.min(100, ((summary.inReview + summary.approved) / Math.max(summary.total, 1)) * 100)}%` : '0%' }} /></div>
          <p className="health-copy">Your active brand sources are ready to support content checks with traceable guidance.</p>
          <Link to="/brand" className="health-link">Manage brand knowledge <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="dashboard-grid-bottom">
        <div className="panel activity-panel"><div className="panel-heading"><div><span className="panel-kicker">TEAM PULSE</span><h2>Recent activity</h2></div><span className="live-label"><i /> LIVE FEED</span></div>
          {data?.activities?.length ? <div className="activity-list">{data.activities.map((activity) => <div className="activity-item" key={activity._id}><div className="activity-avatar">{initials(activity.actorId?.name || 'BG')}</div><div className="activity-copy"><p>{activity.description}</p><span>{timeAgo(activity.createdAt)}</span></div><span className="activity-dot" /></div>)}</div> : <EmptyPanel title="No activity yet" copy="Review submissions and decisions will appear here." />}
        </div>
        <div className="panel focus-panel"><div className="focus-decoration"><Sparkles size={18} /></div><span className="panel-kicker">A BETTER WAY TO REVIEW</span><h2>Good governance should help great work move forward.</h2><p>BrandGuard connects every finding to approved guidance, so creators know what to change and reviewers know what they are approving.</p><button className="text-button" onClick={() => navigate('/insights')}>Explore governance insights <ArrowRight size={15} /></button></div>
      </section>
      {canManageTeam && <section className="panel team-management-panel"><div className="panel-heading"><div><span className="panel-kicker">WORKSPACE ACCESS</span><h2>Team members</h2><p>Manage the roles of people in {user?.workspaceName || 'your workspace'}.</p></div><button className="button button-secondary button-small" onClick={() => api.get('/workspace/members').then(({ data }) => { setMembers(data.members); setMemberError(''); }).catch((err) => setMemberError(err.userMessage || 'Could not refresh members.'))}>Refresh members</button></div>{memberError && <div className="inline-alert error-alert">{memberError}</div>}{memberNotice && <div className="inline-alert success-alert">{memberNotice}</div>}{members.length ? <div className="team-member-list">{members.map((member) => <div className="team-member-row" key={member._id}><span className="avatar avatar-small">{initials(member.name)}</span><div className="team-member-info"><strong>{member.name}</strong><small>{member.email}</small></div>{member.membershipStatus === 'pending' ? <div><span>Requested: {titleCase(member.role)} </span><button className="button button-secondary button-small" disabled={memberBusy} onClick={() => decideAccess(member._id, 'approved')}>Approve</button> <button className="button button-secondary button-small" disabled={memberBusy} onClick={() => decideAccess(member._id, 'rejected')}>Decline</button></div> : member.membershipStatus === 'rejected' ? <span>Access declined</span> : <select aria-label={`Role for ${member.name}`} value={member.role} disabled={memberBusy || String(member._id) === String(user?.id || user?._id)} onChange={(event) => changeMemberRole(member._id, event.target.value)}><option value="admin">Admin</option><option value="creator">Creator</option><option value="manager">Manager</option><option value="reviewer">Reviewer</option></select>}</div>)}</div> : !memberError ? <p className="team-empty">No active members yet.</p> : null}<p className="team-management-note">Your own role is locked here. The public AcmeFlow demo admin is also protected from role changes.</p></section>}
      <div className="dashboard-footnote"><span><Target size={14} /> Reviews stay tied to the exact content revision and source versions examined.</span><span>BrandGuard workspace · {formatDate(new Date(), { month: 'long', year: 'numeric' })}</span></div>
    </div>
  );
}
