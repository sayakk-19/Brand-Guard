import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, FileText, Plus, ShieldCheck, Tag, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, titleCase } from '../utils';

const types = [
  { value: 'voice', label: 'Voice & tone', detail: 'How the brand should sound', icon: BookOpen },
  { value: 'terminology', label: 'Terminology', detail: 'Names and preferred language', icon: Tag },
  { value: 'fact', label: 'Approved facts', detail: 'Product details and offers', icon: CheckCircle2 },
  { value: 'claim_policy', label: 'Claims policy', detail: 'Evidence required for claims', icon: ShieldCheck },
  { value: 'messaging', label: 'Key messaging', detail: 'Required campaign messages', icon: FileText },
  { value: 'accessibility', label: 'Accessibility', detail: 'Inclusive publishing guidance', icon: CircleHelp },
  { value: 'visual', label: 'Visual identity', detail: 'Logo and design treatment', icon: BookOpen }
];

function RuleCard({ rule, onApprove, canApprove }) {
  const Icon = types.find((type) => type.value === rule.type)?.icon || FileText;
  return <article className="rule-card"><div className="rule-card-top"><span className={`rule-type-icon rule-type-${rule.type}`}><Icon size={16} /></span><span className={`rule-status ${rule.status === 'approved' ? 'approved' : 'pending'}`}><i />{titleCase(rule.status)}</span></div><div className="rule-type-label">{titleCase(rule.type)}</div><h3>{rule.title}</h3><p>{rule.description}</p>{rule.canonicalValue && <div className="canonical-value"><span>APPROVED VALUE</span><strong>{rule.canonicalValue}</strong></div>}{rule.aliases?.length > 0 && <div className="alias-list">Also flagged: {rule.aliases.join(' · ')}</div>}<div className="rule-card-footer"><span><FileText size={13} /> {rule.sourceName || 'Brand guidance'} · v{rule.version}</span><span>{formatDate(rule.updatedAt)}</span></div>{canApprove && rule.status === 'draft' && <button className="button button-secondary button-small rule-approve" onClick={() => onApprove(rule._id)}>Approve guidance <Check size={14} /></button>}</article>;
}

function AddRuleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ type: 'voice', title: '', description: '', canonicalValue: '', aliases: '', scope: 'all', sourceName: 'AcmeFlow Brand Handbook', sourceSection: 'Approved guidance', severity: 'medium' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...form, aliases: form.aliases.split(',').map((value) => value.trim()).filter(Boolean) };
      const { data } = await api.post('/brand/rules', payload);
      onCreated(data.rule);
    } catch (err) { setError(err.userMessage || 'Could not save this guideline.'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="rule-modal-title"><div className="modal-heading"><div><span className="eyebrow">BRAND BRAIN</span><h2 id="rule-modal-title">Add approved guidance</h2><p>Make one source of truth clearer for every review.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <form onSubmit={submit} className="modal-form"><label className="field-label">Guideline category<select value={form.type} onChange={change('type')}>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="field-label">Title<input value={form.title} onChange={change('title')} placeholder="e.g. Use the current product name" required minLength={3} /></label><label className="field-label">Guidance<textarea value={form.description} onChange={change('description')} placeholder="Explain the rule in clear, actionable language…" required minLength={8} rows={3} /></label><div className="field-grid"><label className="field-label">Approved value <span className="optional-label">Optional</span><input value={form.canonicalValue} onChange={change('canonicalValue')} placeholder="e.g. AcmeFlow" /></label><label className="field-label">Severity<select value={form.severity} onChange={change('severity')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div><label className="field-label">Terms to flag <span className="optional-label">Comma-separated</span><input value={form.aliases} onChange={change('aliases')} placeholder="e.g. ACME flow, Acme Flow" /></label><div className="field-grid"><label className="field-label">Source document<input value={form.sourceName} onChange={change('sourceName')} /></label><label className="field-label">Source section<input value={form.sourceSection} onChange={change('sourceSection')} /></label></div>{error && <div className="inline-alert error-alert">{error}</div>}<div className="modal-footnote"><ShieldCheck size={15} /> {`Admin-created guidance is approved immediately. Other submissions require administrator approval.`}</div><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save guidance'} <Check size={15} /></button></div></form>
    </div></div>;
}

export default function BrandBrain() {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canManage = ['admin', 'manager'].includes(user?.role);
  const canApprove = user?.role === 'admin';
  const navigate = useNavigate();
  useEffect(() => {
    Promise.all([api.get('/brand/rules'), api.get('/workspace/settings')])
      .then(([rulesResponse, settingsResponse]) => { setRules(rulesResponse.data.rules); setSettings(settingsResponse.data); })
      .catch((err) => setError(err.userMessage || 'Could not load workspace guidance.'))
      .finally(() => setLoading(false));
  }, []);
  const visibleRules = useMemo(() => rules.filter((rule) => filter === 'all' || (filter === 'approved' ? rule.status === 'approved' : rule.status === 'draft')), [rules, filter]);

  async function toggleExternalAi() {
    if (!settings) return;
    setAiBusy(true); setError('');
    try {
      const { data } = await api.patch('/workspace/settings', { externalAiEnabled: !settings.settings.externalAiEnabled });
      setSettings((current) => ({ ...current, settings: data.settings }));
    } catch (err) { setError(err.userMessage || 'Could not update the AI review setting.'); }
    finally { setAiBusy(false); }
  }

  async function approve(id) {
    try { const { data } = await api.patch(`/brand/rules/${id}/status`, { status: 'approved' }); setRules((current) => current.map((rule) => rule._id === id ? data.rule : rule)); }
    catch (err) { setError(err.userMessage || 'Could not approve the guidance.'); }
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> THE SOURCE OF TRUTH</div><h1>Brand Brain</h1><p>Approved knowledge that keeps every piece of content on-brand.</p></div>{canManage && <button className="button button-primary" onClick={() => setShowModal(true)}><Plus size={17} /> Add guidance</button>}</section>
    <div className="brand-summary-strip"><div className="brand-summary-icon"><BookOpen size={19} /></div><div className="brand-summary-copy"><strong>AcmeFlow brand knowledge</strong><span>Demo brand used to show how approved facts and rules guide reviews.</span></div><div className="brand-summary-count"><strong>{rules.filter((rule) => rule.status === 'approved').length}</strong><span>Approved rules</span></div><div className="brand-summary-count"><strong>{rules.filter((rule) => rule.status === 'draft').length}</strong><span>Awaiting approval</span></div><div className="brand-ai-control"><div><span>OPTIONAL AI REVIEW</span><strong>{settings?.settings?.externalAiEnabled ? 'Enabled for this workspace' : 'Disabled by default'}</strong><small>{settings?.aiProviderConfigured ? 'Gemini is ready for tone and messaging checks.' : settings?.aiKeyConfigured ? 'Gemini key found. Restart the backend after changing server settings.' : 'Add a Gemini key in server/.env, then restart the backend.'}</small></div>{user?.role === 'admin' && <button className={`ai-toggle ${settings?.settings?.externalAiEnabled ? 'ai-toggle-on' : ''}`} disabled={aiBusy || (!settings?.aiProviderConfigured && !settings?.settings?.externalAiEnabled)} onClick={toggleExternalAi}>{aiBusy ? 'Saving…' : settings?.settings?.externalAiEnabled ? 'Disable' : 'Enable'}</button>}</div>{settings?.settings?.externalAiEnabled && <button className="button button-primary ai-review-start" onClick={() => navigate('/reviews/new')}><Sparkles size={14} /> Start AI-assisted review</button>}</div>
    <div className="brand-section-heading"><div><span className="panel-kicker">BRAND GUIDANCE LIBRARY</span><h2>Rules your team can rely on</h2></div><div className="filter-tabs compact-tabs"><button className={filter === 'all' ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter('all')}>All <span>{rules.length}</span></button><button className={filter === 'approved' ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter('approved')}>Approved</button><button className={filter === 'draft' ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter('draft')}>Pending</button></div></div>
    {error && <div className="inline-alert error-alert">{error}</div>}
    {loading ? <div className="panel loading-inline">Loading approved guidance…</div> : visibleRules.length ? <div className="rules-grid">{visibleRules.map((rule) => <RuleCard key={rule._id} rule={rule} canApprove={canApprove} onApprove={approve} />)}</div> : <div className="panel empty-state large-empty"><div className="empty-icon"><BookOpen size={22} /></div><strong>No guidance in this view</strong><p>Try another status filter or add a new brand rule.</p></div>}
    <div className="brand-guidance-note"><div><Clock3 size={16} /><div><strong>Source approval matters.</strong><p>Imported or newly submitted information should be reviewed before becoming authoritative. Conflicting guidance should be resolved by an administrator, not silently selected by the system.</p></div></div><span>Workspace role: {titleCase(user?.role)}</span></div>
    {showModal && <AddRuleModal onClose={() => setShowModal(false)} onCreated={(rule) => { setRules((current) => [rule, ...current]); setShowModal(false); }} />}
  </div>;
}
