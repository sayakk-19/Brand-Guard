import { Router } from 'express';
import { z } from 'zod';
import BrandRule from '../models/BrandRule.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recordActivity } from '../services/activity.js';

const router = Router();
const ruleSchema = z.object({
  type: z.enum(['voice', 'terminology', 'fact', 'claim_policy', 'visual', 'accessibility', 'messaging']),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(8).max(1200),
  canonicalValue: z.string().trim().max(500).optional().default(''),
  aliases: z.array(z.string().trim().min(1).max(140)).max(20).optional().default([]),
  scope: z.enum(['all', 'linkedin', 'website', 'email', 'print']).optional().default('all'),
  sourceName: z.string().trim().max(140).optional().default('Brand handbook'),
  sourceSection: z.string().trim().max(140).optional().default('Approved guidance'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium')
});

router.get('/rules', asyncHandler(async (req, res) => {
  const rules = await BrandRule.find({ workspaceId: req.user.workspaceId }).sort({ status: 1, type: 1, title: 1 }).populate('approvedBy', 'name');
  res.json({ success: true, rules });
}));

router.post('/rules', requireRole('admin', 'manager'), asyncHandler(async (req, res) => {
  const input = ruleSchema.parse(req.body);
  const status = req.user.role === 'admin' ? 'approved' : 'draft';
  const rule = await BrandRule.create({
    ...input, workspaceId: req.user.workspaceId, createdBy: req.user._id,
    status, approvedBy: status === 'approved' ? req.user._id : null
  });
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, action: 'brand_rule_created', description: `${req.user.name} added ${rule.title}.` });
  res.status(201).json({ success: true, rule });
}));

router.patch('/rules/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const statusSchema = z.object({ status: z.enum(['approved', 'retired']), note: z.string().max(240).optional() });
  const input = statusSchema.parse(req.body);
  const rule = await BrandRule.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
  if (!rule) throw new ApiError(404, 'Brand rule not found.');
  rule.status = input.status;
  if (input.status === 'approved') rule.approvedBy = req.user._id;
  await rule.save();
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, action: 'brand_rule_status_changed', description: `${rule.title} was ${input.status}.`, metadata: { ruleId: rule._id, note: input.note || '' } });
  res.json({ success: true, rule });
}));

export default router;
