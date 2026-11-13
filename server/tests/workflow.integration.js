// Run explicitly: node server/tests/workflow.integration.js
// Starts its own MongoDB process with temporary data; never reads server/.env.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import auth from '../src/routes/auth.routes.js';
import workspace from '../src/routes/workspace.routes.js';
import reviews from '../src/routes/review.routes.js';
import brand from '../src/routes/brand.routes.js';
import { requireAuth } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-secret-at-least-thirty-two-characters';
process.env.ENABLE_AI_REVIEW = 'false';
const dataPath = await mkdtemp(join(tmpdir(), 'brandguard-audit-'));
const database = spawn(process.env.MONGOD_BINARY || 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe', ['--dbpath', dataPath, '--port', '27028', '--bind_ip', '127.0.0.1', '--quiet'], { windowsHide: true, stdio: 'ignore' });
database.on('error', (error) => console.error(error.message));
let server;
let passed = 0;
function check(condition, message) { assert.ok(condition, message); passed++; console.log(`PASS ${message}`); }
try {
  for (let attempt = 0; ; attempt++) {
    try { await mongoose.connect('mongodb://127.0.0.1:27028/brandguard_audit', { serverSelectionTimeoutMS: 500 }); break; }
    catch (error) { if (attempt >= 12) throw error; }
  }
  await Promise.all([User.init(), Workspace.init()]);
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/auth', auth);
  app.use('/workspace', requireAuth, workspace);
  app.use('/reviews', requireAuth, reviews);
  app.use('/brand', requireAuth, brand);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body, cookie) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], setCookie: response.headers.get('set-cookie') };
  }
  const password = 'AuditPassword@123';
  const signup = (email, workspaceName, role) => request('/auth/register', 'POST', { name: email.split('@')[0], email, password, workspaceName, role });
  const owner = await signup('owner@audit.example', 'Audit Studio', 'admin');
  check(owner.status === 201 && owner.data.user.workspaceName === 'Audit Studio', 'new workspace registration returns its actual name');
  check(Boolean(owner.cookie), 'registration sets a session cookie');
  const lookup = await request('/auth/workspace-lookup?name=audit%20studio');
  check(lookup.data.exists, 'workspace matching ignores case');
  const creator = await signup('creator@audit.example', 'audit studio', 'creator');
  check(creator.status === 201 && creator.data.pendingApproval && !creator.cookie, 'join request waits for approval without a session');
  check((await request('/auth/login', 'POST', { email: 'creator@audit.example', password })).status === 403, 'pending member cannot sign in');
  const pending = await User.findOne({ email: 'creator@audit.example' });
  const accessPath = `/workspace/members/${pending._id}/access`;
  check((await request(accessPath, 'PATCH', { decision: 'approved' }, owner.cookie)).status === 200, 'owner approves join request');
  check((await request(accessPath, 'PATCH', { decision: 'approved' }, owner.cookie)).status === 409, 'repeated approval is safely rejected');
  const approvedLogin = await request('/auth/login', 'POST', { email: 'creator@audit.example', password });
  creator.cookie = approvedLogin.cookie; creator.data.user = approvedLogin.data.user;
  check(approvedLogin.status === 200, 'approved member can sign in');
  check((await signup('intruder@audit.example', 'Audit Studio', 'admin')).status === 400, 'joining cannot select administrator');
  check((await signup('creator@audit.example', 'Other Studio', 'admin')).status === 409, 'duplicate email is rejected');
  check((await request('/workspace/members')).status === 401, 'member list requires authentication');
  check((await request('/workspace/members', 'GET', undefined, creator.cookie)).status === 403, 'creator cannot list role controls');
  const members = await request('/workspace/members', 'GET', undefined, owner.cookie);
  check(members.data.members.length === 2, 'admin sees shared workspace members');
  const creatorId = creator.data.user.id;
  check((await request(`/workspace/members/${creatorId}/role`, 'PATCH', { role: 'reviewer' }, creator.cookie)).status === 403, 'creator cannot promote themselves');
  check((await request(`/workspace/members/${creatorId}/role`, 'PATCH', { role: 'reviewer' }, owner.cookie)).status === 200, 'admin can change another member role');
  check((await request('/auth/me', 'GET', undefined, creator.cookie)).data.user.role === 'reviewer', 'existing session sees updated role on next API request');
  check((await request(`/workspace/members/${owner.data.user.id}/role`, 'PATCH', { role: 'creator' }, owner.cookie)).status === 400, 'admin cannot demote their own account');
  const outsider = await signup('outside@audit.example', 'Separate Studio', 'admin');
  check((await request(`/workspace/members/${creatorId}/role`, 'PATCH', { role: 'admin' }, outsider.cookie)).status === 404, 'roles cannot be changed across workspaces');
  await request(`/workspace/members/${creatorId}/role`, 'PATCH', { role: 'creator' }, owner.cookie);
  const rule = await request('/brand/rules', 'POST', { type: 'terminology', title: 'Product name', description: 'Use the approved product name AuditFlow.', canonicalValue: 'AuditFlow', aliases: ['AUDIT flow'] }, owner.cookie);
  check(rule.status === 201, 'admin can add approved guidance');
  const draft = await request('/reviews', 'POST', { title: 'Audit campaign', channel: 'website', body: 'Try AUDIT flow to organise all your projects today.' }, creator.cookie);
  check(draft.status === 201 && draft.data.run.findings.length > 0, 'shared brand rule produces a review finding');
  const id = draft.data.item._id;
  check((await request(`/reviews/${id}`, 'GET', undefined, owner.cookie)).status === 200, 'workspace members share review access');
  check((await request(`/reviews/${id}`, 'GET', undefined, outsider.cookie)).status === 404, 'review access is isolated by workspace');
  check((await request(`/reviews/${id}/submit`, 'POST', {}, creator.cookie)).status === 200, 'creator submits draft for review');
  check((await request(`/reviews/${id}/decision`, 'POST', { action: 'approved' }, owner.cookie)).status === 201, 'another authorized member approves the revision');
  const revision = await request(`/reviews/${id}/revisions`, 'POST', { body: 'Use AuditFlow to organise all your projects today.' }, creator.cookie);
  check(revision.status === 201 && revision.data.item.status === 'draft' && !revision.data.item.approvedRevisionId, 'editing creates a new revision and clears approval');
  const demo = await User.create({ workspaceId: owner.data.user.workspaceId, name: 'Demo admin', email: 'admin@brandguard.demo', role: 'admin', passwordHash: await bcrypt.hash(password, 4) });
  const demoLogin = await request('/auth/login', 'POST', { email: demo.email, password });
  check((await request('/workspace/members', 'GET', undefined, demoLogin.cookie)).status === 403, 'demo admin cannot use role management');
  check((await request(`/workspace/members/${demo._id}/role`, 'PATCH', { role: 'creator' }, owner.cookie)).status === 403, 'demo admin cannot be demoted');
  check((await signup('demo-join@audit.example', 'Audit Studio', 'creator')).status === 400, 'demo workspace directs new users to demo accounts');
  const rejected = await signup('declined@audit.example', 'Separate Studio', 'reviewer');
  const rejectedUser = await User.findOne({ email: 'declined@audit.example' });
  const rejectionPath = `/workspace/members/${rejectedUser._id}/access`;
  check((await request(rejectionPath, 'PATCH', { decision: 'approved' }, owner.cookie)).status === 409, 'another workspace cannot approve membership');
  check((await request(rejectionPath, 'PATCH', { decision: 'rejected' }, outsider.cookie)).status === 200, 'owner can decline membership');
  check((await request('/auth/login', 'POST', { email: rejectedUser.email, password })).status === 403, 'declined account cannot sign in');
  check((await request('/reviews', 'POST', { title: '', body: 'short', channel: 'invalid' }, owner.cookie)).status === 400, 'invalid draft receives a validation response');
  check((await request('/reviews/not-an-id', 'GET', undefined, owner.cookie)).status === 400, 'malformed review ID does not crash API');
  check((await request('/auth/delete-account', 'POST', { password }, demoLogin.cookie)).status === 403, 'shared demo identity cannot be deleted');
  process.env.NODE_ENV = 'production';
  const login = await request('/auth/login', 'POST', { email: 'owner@audit.example', password });
  check(login.status === 200 && /Secure/i.test(login.setCookie) && /SameSite=None/i.test(login.setCookie) && /HttpOnly/i.test(login.setCookie), 'production cookies retain Secure, HttpOnly and SameSite=None');
  console.log(`Completed ${passed} integration checks. Temporary test data: ${dataPath}`);
} finally {
  process.env.NODE_ENV = 'test';
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  database.kill();
}
