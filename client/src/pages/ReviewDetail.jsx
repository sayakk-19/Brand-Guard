import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileCheck2, FileText, GitBranch, History, MessageCircle, MoreHorizontal, RefreshCw, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, WandSparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, initials, severityTone, statusTone, timeAgo, titleCase } from '../utils';

function Badge({ status, tone }) { return <span className={`status-badge status-${tone || statusTone(status)}`}><i />{titleCase(status)}</span>; }

function FindingCard({ finding, onApply, onStatus, busy, canEdit }) {
  const [expanded, setExpanded] = useState(true);
  return <article className={`finding-card finding-${finding.severity}`}>
    <div className="finding-card-heading"><div className="finding-heading-left"><span className={`severity-icon severity-${severityTone(finding.severity)}`}><AlertCircle size={16} /></span><div><div className="finding-title-row"><strong>{finding.title}</strong><span className={`severity-label severity-text-${severityTone(finding.severity)}`}>{titleCase(finding.severity)} priority</span></div><div className="finding-meta"><span>{titleCase(finding.category)}</span><span>·</span><span>{titleCase(finding.certainty)} confidence</span></div></div></div><div className="finding-heading-right"><Badge status={finding.status} tone={finding.status === 'resolved' || finding.status === 'accepted' ? 'success' : finding.status === 'dismissed' ? 'neutral' : 'warning'} /><button className="icon-button finding-collapse" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Collapse finding' : 'Expand finding'}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></div></div>
    {expanded && <div className="finding-card-body">
      <div className="flagged-excerpt"><span>FLAGGED CONTENT</span><p>“{finding.excerpt}”</p></div>
      <p className="finding-explanation">{finding.explanation}</p>
      {finding.evidence?.sourceName && <div className="evidence-box"><div className="evidence-icon"><FileText size={15} /></div><div><span>APPROVED SOURCE</span><strong>{finding.evidence.sourceName}{finding.evidence.sourceVersion ? ` · v${finding.evidence.sourceVersion}` : ''}</strong><small>{finding.evidence.sourceSection || 'Approved guidance'}</small>{finding.evidence.approvedValue && <p>{finding.evidence.approvedValue}</p>}</div></div>}
      {finding.suggestion && <div className="suggestion-box"><div className="suggestion-label"><Sparkles size={14} /> SUGGESTED CORRECTION</div><p>{finding.suggestion}</p><div className="suggestion-actions"><button className="button button-primary button-small" disabled={busy || !canEdit || finding.status === 'resolved'} onClick={() => onApply(finding)}><WandSparkles size={14} /> Apply as new revision</button><button className="text-button" onClick={() => onStatus(finding, 'accepted')}>Mark accepted</button></div></div>}
      <div className="finding-footer-actions"><button onClick={() => onStatus(finding, 'dismissed')} disabled={busy || finding.status === 'dismissed'}><ThumbsDown size={13} /> Not relevant</button><button onClick={() => onStatus(finding, 'open')} disabled={busy || finding.status === 'open'}><RefreshCw size={13} /> Reopen</button></div>
    </div>}
  </article>;
}

export default function ReviewDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [comment, setComment] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editNote, setEditNote] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get(`/reviews/${id}`);
    setDetail(data);
  }, [id]);
  useEffect(() => { let active = true; api.get(`/reviews/${id}`).then(({ data }) => { if (active) setDetail(data); }).catch((err) => { if (active) setError(err.userMessage || 'Unable to open this review.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);

  const item = detail?.item;
  const currentRevision = item?.currentRevisionId;
  const currentRun = useMemo(() => detail?.runs?.find((run) => String(run.revisionId) === String(currentRevision?._id)), [detail, currentRevision]);
  const findings = currentRun?.findings || [];
  const openFindings = findings.filter((finding) => finding.status === 'open');
  const highCount = openFindings.filter((finding) => ['high', 'critical'].includes(finding.severity)).length;
  const isReviewer = ['admin', 'manager', 'reviewer'].includes(user?.role) && String(item?.createdBy?._id || item?.createdBy) !== String(user?._id || '');
  const canSubmit = item && ['draft', 'changes_requested'].includes(item.status);
  const canEdit = item && (['admin', 'manager'].includes(user?.role) || (user?.role === 'creator' && String(item.createdBy?._id || item.createdBy) === String(user?._id)));
  const canDecide = item?.status === 'in_review' && isReviewer;

  async function runAction(key, action) {
    setBusyKey(key); setError('');
    try { await action(); await load(); }
    catch (err) { setError(err.userMessage || 'That action could not be completed.'); }
    finally { setBusyKey(''); }
  }

  async function applySuggestion(finding) {
    await runAction(`apply-${finding._id}`, () => api.post(`/reviews/${id}/apply-suggestion`, { findingId: finding._id }));
  }
  async function changeFinding(finding, status) {
    await runAction(`finding-${finding._id}`, () => api.patch(`/reviews/${id}/findings/${finding._id}`, { status }));
  }
  async function saveManualEdit(event) {
    event.preventDefault();
    if (editBody.trim().length < 20) { setError('The revised content must contain at least 20 characters.'); return; }
    await runAction('edit', async () => {
      await api.post(`/reviews/${id}/revisions`, { body: editBody, changeNote: editNote.trim() || 'Manual content edit' });
      setEditMode(false); setEditNote('');
    });
  }

  async function postComment(event) {
    event.preventDefault(); if (!comment.trim()) return;
    await runAction('comment', async () => { await api.post(`/reviews/${id}/comments`, { message: comment.trim() }); setComment(''); });
  }
  async function makeDecision(action) {
    await runAction('decision', async () => { await api.post(`/reviews/${id}/decision`, { action, note: decisionNote }); setDecisionOpen(false); setDecisionNote(''); });
  }

  if (loading) return <div className="panel loading-inline">Opening review workspace…</div>;
  if (!item) return <div className="page-stack"><Link to="/reviews" className="back-link"><ArrowLeft size={15} /> Back to reviews</Link><div className="panel empty-state"><AlertCircle size={22} /><strong>Review unavailable</strong><p>{error || 'This content could not be found in your workspace.'}</p></div></div>;
  const isApprovedCurrent = String(item.approvedRevisionId?._id || item.approvedRevisionId || '') === String(currentRevision?._id || '');

  return <div className="page-stack review-detail-page">
    <div className="back-row"><Link to="/reviews" className="back-link"><ArrowLeft size={15} /> All content reviews</Link><span>CONTENT / {item._id.slice(-6).toUpperCase()}</span></div>
    <section className="detail-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> REVIEW WORKSPACE</div><div className="detail-title-line"><h1>{item.title}</h1><Badge status={item.status} /></div><div className="detail-subtitle"><span>{titleCase(item.channel)}</span><span>·</span><span>Created by {item.createdBy?.name || 'Team member'}</span><span>·</span><span>Updated {timeAgo(item.updatedAt)}</span></div></div><div className="detail-header-actions">{canSubmit && canEdit && <button className="button button-primary" disabled={busyKey === 'submit'} onClick={() => runAction('submit', () => api.post(`/reviews/${id}/submit`))}>{busyKey === 'submit' ? 'Submitting…' : <>Submit for review <ArrowRight size={15} /></>}</button>}<button className="button button-secondary" disabled={busyKey === 'recheck'} onClick={() => runAction('recheck', () => api.post(`/reviews/${id}/recheck`))}><RefreshCw size={15} /> Re-run checks</button></div></section>
    {error && <div className="inline-alert error-alert">{error}</div>}

    <div className="detail-summary-strip"><div className="summary-strip-item"><span className="summary-strip-icon"><GitBranch size={16} /></span><div><small>CURRENT VERSION</small><strong>Revision {currentRevision?.revisionNumber || '—'}</strong></div></div><div className="summary-strip-item"><span className="summary-strip-icon"><FileCheck2 size={16} /></span><div><small>FINDINGS</small><strong>{findings.length} total · {openFindings.length} open</strong></div></div><div className="summary-strip-item"><span className="summary-strip-icon"><AlertCircle size={16} /></span><div><small>HIGH PRIORITY</small><strong>{highCount} need attention</strong></div></div><div className="summary-strip-item"><span className="summary-strip-icon"><ShieldCheck size={16} /></span><div><small>ANALYSIS</small><strong>{currentRun?.provider === 'rules+gemini' ? 'Rules + Gemini' : 'Rule-based checks'}{currentRun?.status === 'partial' ? ' · Partial' : ''}</strong></div></div></div>

    <div className="review-workspace-grid">
      <div className="review-main-column">
        <section className="panel submitted-content-panel"><div className="panel-heading"><div><span className="panel-kicker">SUBMITTED CONTENT</span><h2>Draft preview</h2><p>Revision {currentRevision?.revisionNumber} · {formatDate(currentRevision?.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div><div className="content-heading-actions"><span className="revision-pill"><GitBranch size={13} /> v{currentRevision?.revisionNumber}</span>{canEdit && !editMode && <button className="button button-secondary button-small" onClick={() => { setEditBody(currentRevision?.body || ''); setEditMode(true); }}>Edit content</button>}</div></div>{editMode ? <form className="manual-edit-form" onSubmit={saveManualEdit}><label className="field-label">Revised content<textarea rows={8} value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={30000} required /></label><label className="field-label">What changed? <span className="optional-label">Optional</span><input value={editNote} onChange={(event) => setEditNote(event.target.value)} placeholder="e.g. Updated trial wording and removed unsupported claim" maxLength={300} /></label><div className="manual-edit-actions"><button type="button" className="button button-ghost button-small" onClick={() => setEditMode(false)}>Cancel</button><button className="button button-primary button-small" disabled={busyKey === 'edit'}>{busyKey === 'edit' ? 'Saving revision…' : <>Save as new revision <ArrowRight size={14} /></>}</button></div></form> : <div className="content-preview">{currentRevision?.body || 'No content found for this revision.'}</div>}<div className="content-context"><div><span>CHANNEL</span><strong>{titleCase(item.channel)}</strong></div><div><span>AUDIENCE</span><strong>{item.audience || 'Not specified'}</strong></div><div><span>OBJECTIVE</span><strong>{item.objective || 'Not specified'}</strong></div></div>{isApprovedCurrent && <div className="approved-revision-note"><CheckCircle2 size={15} /> This exact revision has an approval record. Later edits require a fresh review.</div>}</section>

        <section className="findings-section"><div className="section-heading-row"><div><span className="panel-kicker">BRAND REVIEW RESULTS</span><h2>What we found <span className="heading-count">{findings.length}</span></h2><p>Findings are linked to the approved guidance used for this analysis.</p></div><span className={`run-status run-${currentRun?.status || 'failed'}`}><i /> {currentRun ? titleCase(currentRun.status) : 'Not analysed'}</span></div>
          {currentRun?.checks?.length > 0 && <div className="checks-summary">{currentRun.checks.map((check) => <div key={check.name} className={`check-chip check-${check.status}`}><span>{check.status === 'completed' ? <CheckCircle2 size={13} /> : check.status === 'incomplete' ? <AlertCircle size={13} /> : <Clock3 size={13} />}</span>{check.name}<small>{titleCase(check.status)}</small></div>)}</div>}
          {findings.length ? <div className="findings-list">{findings.map((finding) => <FindingCard key={finding._id} finding={finding} canEdit={canEdit} busy={busyKey === `apply-${finding._id}` || busyKey === `finding-${finding._id}`} onApply={applySuggestion} onStatus={changeFinding} />)}</div> : <div className="panel empty-state"><div className="empty-icon success-empty"><CheckCircle2 size={22} /></div><strong>No actionable findings in this revision</strong><p>All enabled checks completed without flagging a concern. Human review is still required before publication.</p></div>}
          {currentRun?.status === 'partial' && <div className="inline-alert warning-alert">Some checks could not run. Do not treat this report as a complete review.</div>}
        </section>

        <section className="panel comments-panel"><div className="panel-heading"><div><span className="panel-kicker">TEAM DISCUSSION</span><h2>Comments <span className="heading-count">{detail.comments.length}</span></h2><p>Keep review notes and decisions alongside the content.</p></div><MessageCircle size={18} className="comments-heading-icon" /></div><div className="comments-list">{detail.comments.length ? detail.comments.map((entry) => <div className="comment-item" key={entry._id}><div className="avatar avatar-small">{initials(entry.authorId?.name)}</div><div className="comment-body"><div className="comment-meta"><strong>{entry.authorId?.name || 'Team member'}</strong><span>{titleCase(entry.authorId?.role)}</span><time>{timeAgo(entry.createdAt)}</time></div><p>{entry.message}</p></div></div>) : <p className="no-comments">No comments yet. Use this space to ask for context or explain a review decision.</p>}</div><form className="comment-compose" onSubmit={postComment}><div className="avatar avatar-small">{initials(user?.name)}</div><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a note for your team…" maxLength={2000} /><button className="button button-primary button-small" disabled={!comment.trim() || busyKey === 'comment'}><Send size={14} /> Send</button></form></section>
      </div>

      <aside className="review-side-column">
        {canDecide && <section className="panel decision-panel"><div className="decision-panel-icon"><ShieldCheck size={18} /></div><span className="panel-kicker">REVIEWER DECISION</span><h3>Ready to make a call?</h3><p>Approval will apply to revision {currentRevision?.revisionNumber} and the approved source versions used in this review.</p>{currentRun?.status === 'partial' && <div className="decision-warning"><AlertCircle size={14} /> Some checks did not complete. A reviewer note is required to approve this revision.</div>}{!decisionOpen ? <div className="decision-actions"><button className="button button-primary" onClick={() => setDecisionOpen(true)}><Check size={15} /> Review decision</button></div> : <div className="decision-form"><label className="field-label">Decision note <span className="optional-label">{currentRun?.status === 'partial' ? 'Required for partial review' : 'Optional'}</span><textarea rows={3} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Add a reason or context for the decision…" /></label><button className="button button-primary" onClick={() => makeDecision('approved')} disabled={busyKey === 'decision'}><CheckCircle2 size={14} /> Approve revision</button><button className="button button-warning" onClick={() => makeDecision('changes_requested')} disabled={busyKey === 'decision'}>Request changes</button><button className="text-button cancel-decision" onClick={() => setDecisionOpen(false)}>Cancel</button></div>}</section>}
        <section className="panel workflow-panel"><div className="panel-heading"><div><span className="panel-kicker">APPROVAL TRAIL</span><h2>Revision history</h2></div><History size={17} className="history-icon" /></div><div className="revision-list">{detail.revisions.map((revision, index) => <div className={`revision-item ${index === 0 ? 'revision-current' : ''}`} key={revision._id}><span className="revision-node">{index === 0 ? <span /> : <i />}</span><div className="revision-info"><strong>Revision {revision.revisionNumber} {index === 0 && <em>Current</em>}</strong><span>{revision.changeNote}</span><small>{revision.createdBy?.name || 'Team member'} · {timeAgo(revision.createdAt)}</small></div></div>)}</div></section>
        <section className="panel decision-history-panel"><div className="panel-heading"><div><span className="panel-kicker">HUMAN CONTROL</span><h2>Review decisions</h2></div></div>{detail.approvals.length ? <div className="decision-history-list">{detail.approvals.map((approval) => <div className="decision-history-item" key={approval._id}><span className={`decision-history-icon ${approval.action === 'approved' ? 'decision-approved' : 'decision-requested'}`}>{approval.action === 'approved' ? <Check size={14} /> : <ArrowDownRight size={14} />}</span><div><strong>{titleCase(approval.action)}</strong><span>Revision hash · {approval.contentHash.slice(0, 10)}…</span><small>{approval.reviewerId?.name || 'Reviewer'} · {timeAgo(approval.createdAt)}</small>{approval.note && <p>{approval.note}</p>}</div></div>)}</div> : <p className="empty-side-copy">No decision recorded yet. Decisions will appear here with the exact revision hash.</p>}</section>
        <div className="integrity-note"><ShieldCheck size={16} /><p><strong>Approval integrity</strong>Every decision is tied to a specific content revision and source set. Editing after approval does not change the historical approval record.</p></div>
      </aside>
    </div>
  </div>;
}
