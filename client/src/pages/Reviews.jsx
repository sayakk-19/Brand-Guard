import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileSearch, Filter, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { initials, severityTone, statusTone, timeAgo, titleCase } from '../utils';

const filters = ['all', 'in_review', 'draft', 'changes_requested', 'approved'];

export default function Reviews() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => { setQuery(searchParams.get('q') || ''); }, [searchParams]);
  const loadReviews = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/reviews'); setItems(data.items || []); }
    catch (err) { setError(err.userMessage || 'Unable to load reviews.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadReviews(); }, [loadReviews]);
  const visibleItems = useMemo(() => items.filter((item) => (filter === 'all' || item.status === filter) && `${item.title} ${item.createdBy?.name || ''}`.toLowerCase().includes(query.toLowerCase())), [items, filter, query]);

  function updateQuery(value) { setQuery(value); setSearchParams(value ? { q: value } : {}, { replace: true }); }
  return <div className="page-stack">
    <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> REVIEW OPERATIONS</div><h1>Content reviews</h1><p>One queue for every draft, discussion and approval.</p></div><button className="button button-primary" onClick={() => navigate('/reviews/new')}><Plus size={17} /> Create review</button></section>
    {error && <div className="inline-alert error-alert">{error}<button className="text-button" onClick={loadReviews} disabled={loading}>Try again</button></div>}
    <div className="panel reviews-panel">
      <div className="review-toolbar"><div className="filter-tabs">{filters.map((value) => <button key={value} className={filter === value ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter(value)}>{value === 'all' ? 'All content' : titleCase(value)}</button>)}</div><div className="toolbar-search"><Search size={16} /><input placeholder="Search content…" value={query} onChange={(event) => updateQuery(event.target.value)} /></div></div>
      {loading ? <div className="loading-inline">Loading reviews…</div> : visibleItems.length ? <div className="table-wrap"><table className="data-table reviews-table"><thead><tr><th>CONTENT</th><th>CREATED BY</th><th>FINDINGS</th><th>STATUS</th><th>LAST UPDATED</th><th /></tr></thead><tbody>{visibleItems.map((item) => {
        const findings = item.latestRun?.findings || [];
        const openCount = findings.filter((finding) => finding.status === 'open').length;
        const highCount = findings.filter((finding) => finding.status === 'open' && ['high', 'critical'].includes(finding.severity)).length;
        return <tr key={item._id} onClick={() => navigate(`/reviews/${item._id}`)} className="clickable-row"><td><div className="content-cell"><span className="file-icon"><FileSearch size={16} /></span><div><strong>{item.title}</strong><small>{titleCase(item.channel)} · {item.currentRevisionId ? `Revision ${item.currentRevisionId.revisionNumber}` : 'No revision'}</small></div></div></td><td><div className="owner-cell"><span className="avatar avatar-tiny">{initials(item.createdBy?.name)}</span>{item.createdBy?.name || 'Unknown'}</div></td><td><span className="finding-count">{openCount} open</span>{highCount > 0 && <span className="high-count">{highCount} high</span>}</td><td><span className={`status-badge status-${statusTone(item.status)}`}><i />{titleCase(item.status)}</span></td><td className="muted-cell">{timeAgo(item.updatedAt)}</td><td><ArrowRight size={15} className="row-arrow" /></td></tr>;
      })}</tbody></table></div> : <div className="empty-state large-empty"><div className="empty-icon"><FileSearch size={22} /></div><strong>{query || filter !== 'all' ? 'No matching reviews' : 'No content in the queue yet'}</strong><p>{query || filter !== 'all' ? 'Try changing the search or status filter.' : 'Start with a draft. BrandGuard will check it against your approved brand knowledge.'}</p>{filter === 'all' && !query && <button className="button button-secondary button-small" onClick={() => navigate('/reviews/new')}>Create your first review <ArrowRight size={14} /></button>}</div>}
      <div className="table-footer"><span>{visibleItems.length} {visibleItems.length === 1 ? 'content item' : 'content items'}</span><span><Filter size={13} /> Filter by status and search by title</span></div>
    </div>
  </div>;
}
