import BrandRule from '../models/BrandRule.js';
import ReviewRun from '../models/ReviewRun.js';
import Workspace from '../models/Workspace.js';
import { reviewWithGemini } from './geminiReview.js';
import { hashContent, runDeterministicChecks } from './reviewCore.js';

export { hashContent, runDeterministicChecks };
const activeOn = (rule, now) => rule.status === 'approved' && (!rule.effectiveAt || rule.effectiveAt <= now) && (!rule.expiresAt || rule.expiresAt > now);

export async function createReviewRun({ workspaceId, contentItemId, revision, channel, audience, objective }) {
  const now = new Date();
  const [allRules, workspace] = await Promise.all([
    BrandRule.find({ workspaceId, status: 'approved', $or: [{ scope: 'all' }, { scope: channel }] }).sort({ type: 1, title: 1 }),
    Workspace.findById(workspaceId).select('settings.externalAiEnabled')
  ]);
  const rules = allRules.filter((rule) => activeOn(rule, now));
  const deterministicFindings = runDeterministicChecks(revision.body, rules);
  const checks = [
    { name: 'Approved terminology', status: 'completed', message: 'Compared the draft with active terminology rules.' },
    { name: 'Approved facts', status: 'completed', message: 'Checked known product and offer facts.' },
    { name: 'Promotional claims', status: 'completed', message: 'Flagged strong claims that need evidence.' },
    { name: 'Required messaging', status: 'completed', message: 'Checked mandatory messages for this channel.' }
  ];

  let findings = deterministicFindings;
  let provider = 'rules';
  let status = 'completed';
  if (process.env.ENABLE_AI_REVIEW === 'true' && process.env.GEMINI_API_KEY && workspace?.settings?.externalAiEnabled === true) {
    try {
      const aiResult = await reviewWithGemini({ body: revision.body, channel, audience, objective, rules });
      findings = [...findings, ...aiResult.findings];
      provider = 'rules+gemini';
      checks.push({ name: 'Tone and messaging interpretation', status: 'completed', message: 'Gemini reviewed the draft against approved voice guidance.' });
    } catch (error) {
      status = 'partial';
      checks.push({ name: 'Tone and messaging interpretation', status: 'incomplete', message: 'AI review could not be completed. Rule-based checks are still available.' });
      console.warn(`Optional AI review skipped: ${error.message}`);
    }
  } else {
    checks.push({ name: 'Tone and messaging interpretation', status: 'skipped', message: 'AI review is not configured and enabled for this workspace.' });
  }

  const seen = new Set();
  findings = findings.filter((finding) => {
    const key = `${finding.category}:${finding.startIndex}:${finding.excerpt.toLowerCase()}:${finding.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const previousRun = await ReviewRun.findOne({ workspaceId, contentItemId }).sort({ runNumber: -1 }).select('runNumber');
  const runNumber = (previousRun?.runNumber || 0) + 1;
  return ReviewRun.create({
    workspaceId, contentItemId, revisionId: revision._id, runNumber, status, provider, checks, findings,
    sourceRuleIds: rules.map((rule) => rule._id), completedAt: new Date()
  });
}
