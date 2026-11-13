import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Login() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('admin@brandguard.demo');
  const [password, setPassword] = useState('BrandGuard@123');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceExists, setWorkspaceExists] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [role, setRole] = useState('admin');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!registering || workspaceName.trim().length < 2) { setWorkspaceExists(null); return undefined; }
    let active = true;
    setLookupError('');
    const timer = setTimeout(() => api.get('/auth/workspace-lookup', { params: { name: workspaceName.trim() } }).then(({ data }) => { if (active) { setWorkspaceExists(data.exists); setRole(data.exists ? 'creator' : 'admin'); } }).catch((err) => { if (active) { setWorkspaceExists(null); setLookupError(err.userMessage || 'Could not check this workspace. Try entering its name again.'); } }), 350);
    return () => { active = false; clearTimeout(timer); };
  }, [registering, workspaceName]);

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    if (registering && password !== confirmPassword) { setError('Those passwords do not match.'); setBusy(false); return; }
    try { if (registering) await register({ name, email, password, workspaceName, role }); else await login({ email, password }); }
    catch (err) { setError(err.userMessage || 'Sign-in failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="login-brand"><div className="brand-mark">B</div><span>brandguard<span className="brand-register">®</span></span></div>
        <div className="login-copy">
          <div className="eyebrow light-eyebrow"><span className="eyebrow-line" /> BRAND CONFIDENCE, BUILT IN</div>
          <h1>Protect what makes your brand <em>yours.</em></h1>
          <p>One considered review before every piece of content goes out into the world.</p>
          <div className="login-feature-list">
            <div><span><ShieldCheck size={17} /></span><div><strong>Guidance with a source</strong><small>Every flag connects back to approved brand knowledge.</small></div></div>
            <div><span><Sparkles size={17} /></span><div><strong>Better drafts, not roadblocks</strong><small>Clear explanations and practical corrections.</small></div></div>
          </div>
        </div>
        <div className="login-left-footer"><span>© 2026 BrandGuard</span><span>Built for thoughtful teams.</span></div>
      </div>
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-heading"><span className="eyebrow">{registering ? 'GET STARTED' : 'WELCOME BACK'}</span><h2>{registering ? 'Create your workspace' : 'Sign in to your workspace'}</h2><p>{registering ? 'Set up your account to start reviewing content with BrandGuard.' : 'Pick up where your team left off.'}</p></div>
          <form onSubmit={handleSubmit} className="login-form">
            {registering && <><label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sayak Sarkar" required minLength={2} maxLength={80} /></label><label>Workspace name<input autoComplete="organization" value={workspaceName} onChange={(event) => { setWorkspaceName(event.target.value); setWorkspaceExists(null); }} placeholder="Enter an existing workspace name to join, or create a new one" required minLength={2} maxLength={80} /></label><label>Your role<select value={role} disabled={workspaceExists === null} onChange={(event) => setRole(event.target.value)}>{workspaceExists === true ? <><option value="creator">Creator</option><option value="manager">Manager</option><option value="reviewer">Reviewer</option></> : <option value="admin">Admin · workspace owner</option>}</select><small className="registration-hint">{workspaceExists === true ? `Joining ${workspaceName.trim()} · choose your role` : workspaceExists === false ? 'New workspace · the first member is its administrator' : 'Checking workspace…'}</small></label></>}
            <label>Email address<input autoComplete="username" type="email" value={registering && email === 'admin@brandguard.demo' ? '' : email} onChange={(event) => setEmail(event.target.value)} placeholder={registering ? 'you@company.com' : undefined} required /></label>
            <label>Password<div className="password-field"><input autoComplete={registering ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={registering ? 8 : undefined} required /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{registering && <small className="registration-hint">Use at least 8 characters.</small>}</label>
            {registering && <label>Confirm password<div className="password-field"><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div></label>}
            {error && <div className="form-error">{error}</div>}
            {registering && lookupError && <div className="form-error" role="alert">{lookupError}</div>}
            <button className="button button-primary login-submit" disabled={busy || (registering && workspaceExists === null)}>{busy ? (registering ? 'Creating workspace…' : 'Signing in…') : (registering ? 'Create account' : 'Continue to workspace')} <ArrowRight size={17} /></button>
          </form>
          {registering ? <div className="auth-switch">Already have an account? <button onClick={() => { setRegistering(false); setError(''); setEmail(''); setPassword(''); }}>Sign in</button></div> : <div className="auth-switch">Don’t have an account? <button onClick={() => { setRegistering(true); setError(''); setName(''); setWorkspaceName(''); setWorkspaceExists(null); setRole('admin'); setConfirmPassword(''); setEmail(''); setPassword(''); }}>Register</button></div>}
          {!registering && <div className="demo-access"><div className="demo-access-heading"><span>DEMO ACCESS</span><span className="demo-live"><i /> LIVE DATA</span></div><p>Use one of the preconfigured roles to explore the review workflow.</p>
            <div className="demo-roles"><button onClick={() => { setEmail('admin@brandguard.demo'); setPassword('BrandGuard@123'); }}>Admin</button><button onClick={() => { setEmail('creator@brandguard.demo'); setPassword('BrandGuard@123'); }}>Creator</button><button onClick={() => { setEmail('manager@brandguard.demo'); setPassword('BrandGuard@123'); }}>Manager</button><button onClick={() => { setEmail('reviewer@brandguard.demo'); setPassword('BrandGuard@123'); }}>Reviewer</button></div>
            <div className="demo-password">Shared password <code>BrandGuard@123</code></div>
          </div>}
          <div className="login-footnote">Secure access · Role-based permissions · Revision history</div>
        </div>
      </div>
    </div>
  );
}
