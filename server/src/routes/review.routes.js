import { Router } from 'express';
import { z } from 'zod';
import ContentItem from '../models/ContentItem.js';
import ContentRevision from '../models/ContentRevision.js';
import ReviewRun from '../models/ReviewRun.js';
import ReviewComment from '../models/ReviewComment.js';
import Approval from '../models/Approval.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { createReviewRun, hashContent } from '../services/reviewEngine.js';
import { recordActivity } from '../services/activity.js';

const router = Router();
const createSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(20).max(30000),
  channel: z.enum(['linkedin', 'website', 'email', 'print', 'other']),
  audience: z.string().max(240).optional().default(''),
  objective: z.string().max(400).optional().default('')
});
const revisionSchema = z.object({ body: z.string().trim().min(20).max(30000), changeNote: z.string().trim().max(300).optional().default('Updated content') });
const findOwnedItem = (id, workspaceId) => ContentItem.findOne({ _id: id, workspaceId, archivedAt: null });

function canEditItem(item, user) {
  return ['admin', 'manager'].includes(user.role) || (['creator', 'reviewer'].includes(user.role) && String(item.createdBy) === String(user._id));
}

function assertCanEditItem(item, user) {
  if (!canEditItem(item, user)) throw new ApiError(403, 'You can only edit your own submissions. Ask a workspace manager for access.');
}

async function addRevisionAndReview({ item, body, changeNote, user }) {
  const previous = await ContentRevision.findOne({ contentItemId: item._id, workspaceId: item.workspaceId }).sort({ revisionNumber: -1 }).select('revisionNumber');
  const revision = await ContentRevision.create({
    workspaceId: item.workspaceId, contentItemId: item._id, revisionNumber: (previous?.revisionNumber || 0) + 1,
    body, contentHash: hashContent(body), createdBy: user._id, changeNote
  });
  item.currentRevisionId = revision._id;
  item.status = 'draft';
  item.approvedRevisionId = null;
  await item.save();
  const run = await createReviewRun({ workspaceId: item.workspaceId, contentItemId: item._id, revision, channel: item.channel, audience: item.audience, objective: item.objective });
  item.lastReviewedAt = run.completedAt;
  await item.save();
  return { revision, run };
}

router.get('/', asyncHandler(async (req, res) => {
  const status = req.query.status;
  const filter = { workspaceId: req.user.workspaceId, archivedAt: null };
  if (['draft', 'in_review', 'changes_requested', 'approved'].includes(status)) filter.status = status;
  const items = await ContentItem.find(filter)
    .sort({ updatedAt: -1 }).limit(100)
    .populate('createdBy', 'name email role')
    .populate('assignedTo', 'name role')
    .populate('currentRevisionId', 'revisionNumber body createdAt')
    .lean();
  const latestRuns = await ReviewRun.aggregate([
    { $match: { workspaceId: req.user.workspaceId, contentItemId: { $in: items.map((item) => item._id) } } },
    { $sort: { runNumber: -1 } }, { $group: { _id: '$contentItemId', run: { $first: '$$ROOT' } } }
  ]);
  const runMap = new Map(latestRuns.map((entry) => [String(entry._id), entry.run]));
  res.json({ success: true, items: items.map((item) => ({ ...item, latestRun: runMap.get(String(item._id)) || null })) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const item = await ContentItem.create({
    workspaceId: req.user.workspaceId, title: input.title, channel: input.channel,
    audience: input.audience, objective: input.objective, createdBy: req.user._id, status: 'draft'
  });
  const { revision, run } = await addRevisionAndReview({ item, body: input.body, changeNote: 'Initial submission', user: req.user });
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, contentItemId: item._id, action: 'review_created', description: `${req.user.name} created “${item.title}”.` });
  res.status(201).json({ success: true, item, revision, run });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await findOwnedItem(req.params.id, req.user.workspaceId)
    .populate('createdBy', 'name email role').populate('assignedTo', 'name role')
    .populate('currentRevisionId').populate('approvedRevisionId');
  if (!item) throw new ApiError(404, 'Review not found.');
  const [revisions, runs, comments, approvals] = await Promise.all([
    ContentRevision.find({ contentItemId: item._id, workspaceId: req.user.workspaceId }).sort({ revisionNumber: -1 }).populate('createdBy', 'name role'),
    ReviewRun.find({ contentItemId: item._id, workspaceId: req.user.workspaceId }).sort({ runNumber: -1 }),
    ReviewComment.find({ contentItemId: item._id, workspaceId: req.user.workspaceId }).sort({ createdAt: 1 }).populate('authorId', 'name role'),
    Approval.find({ contentItemId: item._id, workspaceId: req.user.workspaceId }).sort({ createdAt: -1 }).populate('reviewerId', 'name role')
  ]);
  res.json({ success: true, item, revisions, runs, comments, approvals });
}));

router.post('/:id/revisions', asyncHandler(async (req, res) => {
  const input = revisionSchema.parse(req.body);
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  assertCanEditItem(item, req.user);
  const result = await addRevisionAndReview({ item, body: input.body, changeNote: input.changeNote, user: req.user });
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, contentItemId: item._id, action: 'revision_created', description: `${req.user.name} created revision ${result.revision.revisionNumber} of “${item.title}”.` });
  res.status(201).json({ success: true, ...result, item });
}));

router.post('/:id/apply-suggestion', asyncHandler(async (req, res) => {
  const input = z.object({ findingId: z.string().min(1) }).parse(req.body);
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  assertCanEditItem(item, req.user);
  const revision = await ContentRevision.findOne({ _id: item.currentRevisionId, workspaceId: req.user.workspaceId });
  const latestRun = await ReviewRun.findOne({ contentItemId: item._id, revisionId: revision?._id, workspaceId: req.user.workspaceId }).sort({ runNumber: -1 });
  const finding = latestRun?.findings.id(input.findingId);
  if (!finding || !finding.suggestion) throw new ApiError(404, 'A usable suggestion was not found for this revision.');
  let start = finding.startIndex;
  let end = finding.endIndex;
  if (start < 0 || end <= start || revision.body.slice(start, end) !== finding.excerpt) {
    start = revision.body.indexOf(finding.excerpt);
    end = start >= 0 ? start + finding.excerpt.length : -1;
  }
  if (start < 0) throw new ApiError(409, 'The quoted text is no longer present. Review the latest revision before applying this suggestion.');
  const updatedBody = revision.body.slice(0, start) + finding.suggestion + revision.body.slice(end);
  const result = await addRevisionAndReview({ item, body: updatedBody, changeNote: `Applied suggestion: ${finding.title}`, user: req.user });
  finding.status = 'resolved';
  await latestRun.save();
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, contentItemId: item._id, action: 'suggestion_applied', description: `${req.user.name} applied a suggested correction to “${item.title}”.` });
  res.status(201).json({ success: true, ...result, item });
}));

router.post('/:id/recheck', asyncHandler(async (req, res) => {
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  const revision = await ContentRevision.findOne({ _id: item.currentRevisionId, workspaceId: req.user.workspaceId });
  if (!revision) throw new ApiError(409, 'The review does not have a current revision.');
  const run = await createReviewRun({ workspaceId: item.workspaceId, contentItemId: item._id, revision, channel: item.channel, audience: item.audience, objective: item.objective });
  item.lastReviewedAt = run.completedAt;
  await item.save();
  res.json({ success: true, run });
}));

router.post('/:id/submit', asyncHandler(async (req, res) => {
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  assertCanEditItem(item, req.user);
  if (!item.currentRevisionId) throw new ApiError(409, 'Create a revision before submitting.');
  if (item.status === 'in_review') return res.json({ success: true, item });
  if (item.status === 'approved') throw new ApiError(409, 'Create a new revision before resubmitting approved content.');
  item.status = 'in_review';
  await item.save();
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, contentItemId: item._id, action: 'submitted_for_review', description: `${req.user.name} submitted “${item.title}” for review.` });
  res.json({ success: true, item });
}));

router.post('/:id/comments', asyncHandler(async (req, res) => {
  const input = z.object({ message: z.string().trim().min(2).max(2000), findingId: z.string().optional().nullable() }).parse(req.body);
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  const comment = await ReviewComment.create({
    workspaceId: req.user.workspaceId, contentItemId: item._id, revisionId: item.currentRevisionId,
    authorId: req.user._id, message: input.message, findingId: input.findingId || null
  });
  await comment.populate('authorId', 'name role');
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, contentItemId: item._id, action: 'comment_added', description: `${req.user.name} commented on “${item.title}”.` });
  res.status(201).json({ success: true, comment });
}));

router.patch('/:id/findings/:findingId', asyncHandler(async (req, res) => {
  const input = z.object({ status: z.enum(['accepted', 'dismissed', 'open']), resolutionNote: z.string().max(500).optional().default('') }).parse(req.body);
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  const revision = await ContentRevision.findOne({ _id: item.currentRevisionId, workspaceId: req.user.workspaceId });
  const run = await ReviewRun.findOne({ contentItemId: item._id, revisionId: revision?._id, workspaceId: req.user.workspaceId }).sort({ runNumber: -1 });
  const finding = run?.findings.id(req.params.findingId);
  if (!finding) throw new ApiError(404, 'Finding not found in the current review.');
  finding.status = input.status;
  finding.resolutionNote = input.resolutionNote;
  await run.save();
  res.json({ success: true, finding });
}));

router.post('/:id/decision', requireRole('admin', 'manager', 'reviewer'), asyncHandler(async (req, res) => {
  const input = z.object({ action: z.enum(['approved', 'changes_requested', 'exception']), note: z.string().trim().max(1000).optional().default('') }).parse(req.body);
  const item = await findOwnedItem(req.params.id, req.user.workspaceId);
  if (!item) throw new ApiError(404, 'Review not found.');
  if (String(item.createdBy) === String(req.user._id)) throw new ApiError(403, 'A creator cannot approve their own submission. Ask another reviewer to make the decision.');
  if (item.status !== 'in_review') throw new ApiError(409, 'Submit this revision for review before making an approval decision.');
  const revision = await ContentRevision.findOne({ _id: item.currentRevisionId, workspaceId: req.user.workspaceId });
  if (!revision) throw new ApiError(409, 'No current revision is available to approve.');
  const latestRun = await ReviewRun.findOne({ contentItemId: item._id, revisionId: revision._id, workspaceId: req.user.workspaceId }).sort({ runNumber: -1 });
  if (!latestRun) throw new ApiError(409, 'Run the brand review before making a decision.');
  if (input.action === 'approved' && latestRun.status === 'failed') throw new ApiError(409, 'A failed review cannot be approved.');
  if (input.action === 'approved' && latestRun.status === 'partial' && !input.note.trim()) throw new ApiError(409, 'Add a reviewer note before approving a partially completed review.');
  const approval = await Approval.create({
    workspaceId: req.user.workspaceId, contentItemId: item._id, revisionId: revision._id,
    contentHash: revision.contentHash, sourceRuleIds: latestRun.sourceRuleIds, action: input.action,
    note: input.note, reviewerId: req.user._id
  });
  item.status = input.action === 'approved' || input.action === 'exception' ? 'approved' : 'changes_requested';
  item.approvedRevisionId = item.status === 'approved' ? revision._id : null;
  await item.save();
  await recordActivity({ workspaceId: req.user.workspaceId, actorId: req.user._id, contentItemId: item._id, action: input.action, description: `${req.user.name} ${input.action.replace('_', ' ')} “${item.title}”.`, metadata: { revisionId: revision._id, contentHash: revision.contentHash } });
  res.status(201).json({ success: true, item, approval });
}));

export default router;
