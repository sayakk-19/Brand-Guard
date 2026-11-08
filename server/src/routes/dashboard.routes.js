import { Router } from 'express';
import ContentItem from '../models/ContentItem.js';
import ReviewRun from '../models/ReviewRun.js';
import ActivityEvent from '../models/ActivityEvent.js';
import BrandRule from '../models/BrandRule.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/summary', asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;
  const [total, inReview, changesRequested, approved, activeRules, latestItems, activities, contentRows] = await Promise.all([
    ContentItem.countDocuments({ workspaceId, archivedAt: null }),
    ContentItem.countDocuments({ workspaceId, status: 'in_review', archivedAt: null }),
    ContentItem.countDocuments({ workspaceId, status: 'changes_requested', archivedAt: null }),
    ContentItem.countDocuments({ workspaceId, status: 'approved', archivedAt: null }),
    BrandRule.countDocuments({ workspaceId, status: 'approved' }),
    ContentItem.find({ workspaceId, archivedAt: null }).sort({ updatedAt: -1 }).limit(5)
      .populate('createdBy', 'name').populate('assignedTo', 'name').populate('currentRevisionId', 'revisionNumber'),
    ActivityEvent.find({ workspaceId }).sort({ createdAt: -1 }).limit(7).populate('actorId', 'name'),
    ContentItem.find({ workspaceId, archivedAt: null }).select('_id currentRevisionId').lean()
  ]);
  const latestRuns = await ReviewRun.aggregate([
    { $match: { workspaceId, contentItemId: { $in: contentRows.map((item) => item._id) } } },
    { $sort: { runNumber: -1 } },
    { $group: { _id: '$contentItemId', run: { $first: '$$ROOT' } } }
  ]);
  const currentRevisionByItem = new Map(contentRows.map((item) => [String(item._id), String(item.currentRevisionId || '')]));
  const currentRuns = latestRuns.map((entry) => entry.run).filter((run) => currentRevisionByItem.get(String(run.contentItemId)) === String(run.revisionId));
  const allFindings = currentRuns.flatMap((run) => run.findings);
  const openFindings = allFindings.filter((finding) => finding.status === 'open').length;
  const highPriority = allFindings.filter((finding) => ['high', 'critical'].includes(finding.severity) && finding.status === 'open').length;
  res.json({ success: true, summary: { total, inReview, changesRequested, approved, activeRules, openFindings, highPriority }, latestItems, activities });
}));

router.get('/insights', asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;
  const [items, runs] = await Promise.all([
    ContentItem.find({ workspaceId, archivedAt: null }).select('status currentRevisionId createdAt updatedAt'),
    ReviewRun.find({ workspaceId }).sort({ completedAt: -1 }).limit(200).select('contentItemId revisionId findings completedAt provider')
  ]);
  const categoryCounts = {};
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const statusCounts = { accepted: 0, dismissed: 0, resolved: 0, exception: 0, open: 0 };
  for (const run of runs) for (const finding of run.findings) {
    categoryCounts[finding.category] = (categoryCounts[finding.category] || 0) + 1;
    severityCounts[finding.severity] = (severityCounts[finding.severity] || 0) + 1;
    if (finding.status !== 'open') statusCounts[finding.status] = (statusCounts[finding.status] || 0) + 1;
  }
  const latestRunsByItem = new Map();
  for (const run of runs) {
    const itemKey = String(run.contentItemId);
    if (!latestRunsByItem.has(itemKey)) latestRunsByItem.set(itemKey, run);
  }
  const currentOpenFindings = items.flatMap((item) => {
    const run = latestRunsByItem.get(String(item._id));
    return run && String(run.revisionId) === String(item.currentRevisionId) ? run.findings.filter((finding) => finding.status === 'open') : [];
  });
  statusCounts.open = currentOpenFindings.length;
  const reviewStatuses = items.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
  res.json({ success: true, insights: { categoryCounts, severityCounts, statusCounts, reviewStatuses, sampleSize: runs.length, itemCount: items.length } });
}));

export default router;
