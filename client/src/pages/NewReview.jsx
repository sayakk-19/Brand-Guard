import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, FileText, Lightbulb, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { readPreferences } from '../preferences';

const example = 'Meet the easier way to bring your team’s work together. AcmeFlow helps you organise projects, keep conversations in context and move your next idea forward. Start your 14-day free trial today.';

export default function NewReview() {
  const [form, setForm] = useState(() => ({ title: '', channel: readPreferences().preferredChannel, audience: '', objective: '', body: '' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/reviews', form);
      navigate(`/reviews/${data.item._id}`);
    } catch (err) { setError(err.userMessage || 'Could not create this review.'); }
    finally { setBusy(false); }
  }

  return <div className="page-stack new-review-page">
    <div className="back-row"><Link to="/reviews" className="back-link"><ArrowLeft size={15} /> Back to reviews</Link><span>NEW SUBMISSION</span></div>
    <section className="page-title-row new-review-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> REVIEW STUDIO</div><h1>Give your draft a brand check.</h1><p>Share the content and a little context. We’ll compare it with the guidance your team has approved.</p></div><div className="review-step"><span className="step-number">01</span><div><strong>Content details</strong><small>One step · Usually 2 minutes</small></div></div></section>

    <form className="new-review-grid" onSubmit={submit}>
      <div className="new-review-main panel">
        <div className="form-section-heading"><div className="section-icon"><FileText size={17} /></div><div><h2>Content to review</h2><p>Start with the version you intend to publish.</p></div></div>
        <div className="field-grid"><label className="field-label full-field">Content title<input value={form.title} onChange={update('title')} placeholder="e.g. Spring campaign launch" required minLength={3} maxLength={160} /></label>
          <label className="field-label">Publishing channel<select value={form.channel} onChange={update('channel')}><option value="linkedin">LinkedIn</option><option value="website">Website</option><option value="email">Email</option><option value="print">Print / Brochure</option><option value="other">Other</option></select></label>
          <label className="field-label">Intended audience<input value={form.audience} onChange={update('audience')} placeholder="e.g. Small business owners" maxLength={240} /></label>
          <label className="field-label full-field">What should this content achieve?<input value={form.objective} onChange={update('objective')} placeholder="e.g. Encourage qualified visitors to start a free trial" maxLength={400} /></label>
        </div>
        <div className="content-editor-heading"><div><h3>Draft copy</h3><p>Paste the text you want BrandGuard to review.</p></div><span className="character-count">{form.body.length.toLocaleString()} / 30,000</span></div>
        <textarea className="draft-textarea" value={form.body} onChange={update('body')} placeholder="Write or paste your content here…" minLength={20} maxLength={30000} required />
        <div className="editor-footnote"><span><ClipboardCheck size={14} /> Your submitted text is stored as an immutable revision.</span><button type="button" className="text-button" onClick={() => setForm((current) => ({ ...current, body: example }))}>Use sample copy</button></div>
        {error && <div className="inline-alert error-alert">{error}</div>}
        <div className="form-actions"><Link to="/reviews" className="button button-ghost">Cancel</Link><button className="button button-primary" disabled={busy || form.body.trim().length < 20 || form.title.trim().length < 3}>{busy ? <><span className="button-spinner" /> Checking your draft…</> : <>Run brand review <ArrowRight size={16} /></>}</button></div>
      </div>
      <aside className="new-review-aside">
        <div className="panel guidance-panel"><div className="guidance-icon"><Sparkles size={18} /></div><span className="panel-kicker">WHAT HAPPENS NEXT</span><h3>A review that explains itself.</h3><div className="guidance-steps"><div><span>1</span><p><strong>Compare</strong>Draft checked against approved terminology, facts and claim policies.</p></div><div><span>2</span><p><strong>Understand</strong>Each finding includes an explanation and its supporting source.</p></div><div><span>3</span><p><strong>Improve</strong>Apply a correction or make your own edit. A new revision is created.</p></div></div><div className="guidance-note"><Lightbulb size={15} /> A missing source means “unverified”, not automatically “false”.</div></div>
        <div className="privacy-note"><div className="privacy-icon"><Check size={15} /></div><div><strong>Your draft stays in your workspace.</strong><p>Rule-based checks run inside this application. External AI review is optional and can be disabled by the workspace.</p></div></div>
      </aside>
    </form>
  </div>;
}
