import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { clearSessionCookie, createSessionCookie, requireAuth } from '../middleware/auth.js';
import ActivityEvent from '../models/ActivityEvent.js';
import Workspace from '../models/Workspace.js';

const router = Router();
const loginSchema = z.object({ email: z.string().email().max(160), password: z.string().min(8).max(128) });
const safeUser = (user, workspaceName) => ({ id: user._id, _id: user._id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId, workspaceName });
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/workspace-lookup', asyncHandler(async (req, res) => {
  const name = z.string().trim().min(2).max(80).parse(String(req.query.name || ''));
  const workspace = await Workspace.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') }).select('name');
  res.json({ success: true, exists: Boolean(workspace), workspaceName: workspace?.name || null });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  const valid = user && user.isActive && await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'The email or password is incorrect.');
  if (user.membershipStatus === 'pending') throw new ApiError(403, 'Your request is awaiting workspace administrator approval. Sign in again after approval.');
  if (user.membershipStatus === 'rejected') throw new ApiError(403, 'Your workspace request was declined. Contact the workspace administrator.');
  createSessionCookie(res, user._id.toString());
  const workspace = await Workspace.findById(user.workspaceId).select('name');
  res.json({ success: true, user: safeUser(user, workspace?.name) });
}));

router.post('/register', asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(128),
    workspaceName: z.string().trim().min(2).max(80),
    role: z.enum(['admin', 'creator', 'manager', 'reviewer']).default('admin')
  }).parse(req.body);
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists. Sign in instead.');

  let workspace = await Workspace.findOne({ name: new RegExp(`^${escapeRegex(input.workspaceName)}$`, 'i') });
  const joiningWorkspace = Boolean(workspace);
  if (workspace && await User.exists({ workspaceId: workspace._id, email: 'admin@brandguard.demo' })) throw new ApiError(400, 'This is the shared demo workspace. Use a demo account to explore it, or choose a different name for your own workspace.');
  if (joiningWorkspace && input.role === 'admin') throw new ApiError(400, 'Choose Creator, Manager or Reviewer to join an existing workspace. Admin access is managed by its current administrator.');
  if (!joiningWorkspace && input.role !== 'admin') throw new ApiError(400, 'The first person in a new workspace must start as Admin. Choose Admin, or enter the name of an existing workspace to join it.');
  const slugBase = input.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'workspace';
  if (!workspace) workspace = await Workspace.create({ name: input.workspaceName, slug: `${slugBase}-${randomBytes(4).toString('hex')}` });
  try {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({ workspaceId: workspace._id, name: input.name, email, passwordHash, role: joiningWorkspace ? input.role : 'admin', membershipStatus: joiningWorkspace ? 'pending' : 'approved' });
    if (joiningWorkspace) return res.status(201).json({ success: true, pendingApproval: true, message: 'Request sent. Your workspace administrator must approve your access. Sign in again after approval.' });
    createSessionCookie(res, user._id.toString());
    res.status(201).json({ success: true, joinedWorkspace: joiningWorkspace, user: safeUser(user, workspace.name) });
  } catch (error) {
    if (!joiningWorkspace) await Workspace.findByIdAndDelete(workspace._id);
    if (error?.code === 11000) throw new ApiError(409, 'An account with this email already exists. Sign in instead.');
    throw error;
  }
}));

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.user.workspaceId).select('name');
  res.json({ success: true, user: safeUser(req.user, workspace?.name) });
}));

router.post('/delete-account', requireAuth, asyncHandler(async (req, res) => {
  const input = z.object({ password: z.string().min(8).max(128) }).parse(req.body);
  if (['admin', 'creator', 'manager', 'reviewer'].some((role) => req.user.email === `${role}@brandguard.demo`)) throw new ApiError(403, 'Shared demo accounts cannot be deleted.');
  if (req.user.role === 'admin') throw new ApiError(403, 'Workspace administrators cannot delete their account here. Transfer the admin role first.');
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user || !await bcrypt.compare(input.password, user.passwordHash)) throw new ApiError(400, 'The password is incorrect.');
  user.isActive = false;
  await user.save();
  await ActivityEvent.create({ workspaceId: user.workspaceId, actorId: user._id, action: 'account_deactivated', description: `${user.name} deactivated their account.` });
  clearSessionCookie(res);
  res.json({ success: true, message: 'Your account has been deactivated.' });
}));

export default router;
