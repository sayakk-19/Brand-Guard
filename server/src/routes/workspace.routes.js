import { Router } from 'express';
import { z } from 'zod';
import Workspace from '../models/Workspace.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recordActivity } from '../services/activity.js';
import User from '../models/User.js';

const router = Router();

router.get('/members', requireRole('admin'), asyncHandler(async (req, res) => {
  if (req.user.email === 'admin@brandguard.demo') throw new ApiError(403, 'Role management is disabled for the public demo administrator.');
  const members = await User.find({ workspaceId: req.user.workspaceId, isActive: true }).select('name email role createdAt').sort({ name: 1 });
  res.json({ success: true, members });
}));

router.patch('/members/:id/role', requireRole('admin'), asyncHandler(async (req, res) => {
  if (req.user.email === 'admin@brandguard.demo') throw new ApiError(403, 'Role management is disabled for the public demo administrator.');
  const input = z.object({ role: z.enum(['admin', 'creator', 'manager', 'reviewer']) }).parse(req.body);
  const member = await User.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId, isActive: true });
  if (!member) throw new ApiError(404, 'Workspace member not found.');
  if (member._id.equals(req.user._id)) throw new ApiError(400, 'You cannot change your own role. Ask another workspace administrator.');
  if (member.email === 'admin@brandguard.demo') throw new ApiError(403, 'The public demo administrator role cannot be changed.');
  if (member.role === 'admin' && input.role !== 'admin') {
    const adminCount = await User.countDocuments({ workspaceId: req.user.workspaceId, role: 'admin', isActive: true });
    if (adminCount <= 1) throw new ApiError(400, 'This is the last workspace administrator. Promote another member first.');
  }
  const previousRole = member.role;
  member.role = input.role;
  await member.save();
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, action: 'member_role_changed', description: `${member.name}'s role changed from ${previousRole} to ${input.role}.` });
  res.json({ success: true, member: { _id: member._id, name: member.name, email: member.email, role: member.role, createdAt: member.createdAt } });
}));

router.get('/settings', asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.user.workspaceId).select('name settings');
  if (!workspace) throw new ApiError(404, 'Workspace not found.');
  res.json({
    success: true,
    settings: workspace.settings,
    workspaceName: workspace.name,
    aiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    aiReviewEnabled: process.env.ENABLE_AI_REVIEW === 'true',
    aiProviderConfigured: process.env.ENABLE_AI_REVIEW === 'true' && Boolean(process.env.GEMINI_API_KEY)
  });
}));

router.patch('/settings', requireRole('admin'), asyncHandler(async (req, res) => {
  const input = z.object({ externalAiEnabled: z.boolean() }).parse(req.body);
  const workspace = await Workspace.findByIdAndUpdate(
    req.user.workspaceId,
    { $set: { 'settings.externalAiEnabled': input.externalAiEnabled } },
    { new: true, runValidators: true }
  ).select('name settings');
  if (!workspace) throw new ApiError(404, 'Workspace not found.');
  await recordActivity({
    workspaceId: req.user.workspaceId, actorId: req.user._id, action: 'external_ai_setting_changed',
    description: `${req.user.name} ${input.externalAiEnabled ? 'enabled' : 'disabled'} external AI review.`
  });
  res.json({ success: true, settings: workspace.settings, workspaceName: workspace.name });
}));

export default router;
