import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, FileSearch, ShieldCheck, Sparkles } from 'lucide-react';
import api from '../api/client';
import { titleCase } from '../utils';

const categoryLabels = { terminology: 'Terminology', factual: 'Factual consistency', promotional_claim: 'Promotional claims', tone: 'Tone of voice', messaging: 'Key messaging', accessibility: 'Accessibility', visual: 'Visual consistency', other: 'Other' };

function Stat({ label, value, caption, icon: Icon }) { return <div className="insight-stat"><div className="insight-stat-icon"><Icon size={17} /></div><span>{label}</span><strong>{value ?? '—'}</strong><small>{caption}</small></div>; }

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/dashboard/insights').then(({ data }) => setInsights(data.insights)).catch((err) => setError(err.userMessage)); }, []);
  const categories = useMemo(() => Object.entries(insights?.categoryCounts || {}).sort((a, b) => b[1] - a[1]), [insights]);
  const maxCount = Math.max(1, ...categories.map(([, count]) => count));
  const totalFindings = Object.values(insights?.categoryCounts || {}).reduce((sum, value) => sum + value, 0);
  const statuses = insights?.statusCounts || {};

  return <div className="page-stack">
    <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> LEARN FROM EVERY REVIEW</div><h1>Governance insights</h1><p>Patterns from review activity that can help your team improve the guidance itself.</p></div><div className="insight-period"><Activity size={15} /> All available review history</div></section>
    {error && <div className="inline-alert error-alert">{error}</div>}
    <section className="insight-stats-grid"><Stat label="Findings recorded" value={totalFindings} caption="Across stored analysis runs" icon={FileSearch} /><Stat label="Accepted or resolved" value={(statuses.accepted || 0) + (statuses.resolved || 0)} caption="Findings acted on by creators" icon={CheckCircle2} /><Stat label="Dismissed" value={statuses.dismissed || 0} caption="Review decisions to examine" icon={CircleDot} /><Stat label="Review runs" value={insights?.sampleSize} caption="Most recent 200 runs" icon={ShieldCheck} /></section>
    <div className="insights-content-grid">
      <section className="panel insight-chart-panel"><div className="panel-heading"><div><span className="panel-kicker">ISSUE LANDSCAPE</span><h2>Where findings appear</h2><p>Counts reflect findings across the available review history.</p></div><span className="chart-total">{totalFindings} <small>total</small></span></div>
        {categories.length ? <div className="category-bars">{categories.map(([category, count]) => <div className="category-row" key={category}><div className="category-label"><span>{categoryLabels[category] || titleCase(category)}</span><strong>{count}</strong></div><div className="bar-track"><span style={{ width: `${(count / maxCount) * 100}%` }} /></div></div>)}</div> : <div className="empty-chart"><Sparkles size={22} /><strong>Your first insight is around the corner.</strong><span>As content is reviewed, repeated issue patterns will appear here.</span></div>}
      </section>
      <section className="panel insight-action-panel"><div className="panel-heading"><div><span className="panel-kicker">REVIEW OUTCOMES</span><h2>What happens next</h2></div></div>
        <div className="outcome-list"><div><span className="outcome-dot accepted" /><div><strong>Accepted / resolved</strong><small>Creators acted on the finding</small></div><b>{(statuses.accepted || 0) + (statuses.resolved || 0)}</b></div><div><span className="outcome-dot dismissed" /><div><strong>Dismissed</strong><small>Worth checking for false positives</small></div><b>{statuses.dismissed || 0}</b></div><div><span className="outcome-dot open" /><div><strong>Still open</strong><small>Needs a creator or reviewer decision</small></div><b>{statuses.open || 0}</b></div></div>
        <div className="insight-callout"><AlertTriangle size={16} /><p>A frequently dismissed flag may indicate a weak detector, a valid exception or unclear guidance. Treat it as a prompt for investigation, not an automatic rule change.</p></div>
      </section>
    </div>
    <div className="insight-footnote"><span><ShieldCheck size={15} /> Governance recommendations are advisory. Brand administrators remain responsible for approving changes.</span><span>Dataset: {insights?.itemCount ?? '—'} content items</span></div>
  </div>;
}
