import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/db.js';
import Workspace from './models/Workspace.js';
import User from './models/User.js';
import BrandRule from './models/BrandRule.js';
import ContentItem from './models/ContentItem.js';
import ContentRevision from './models/ContentRevision.js';
import ReviewRun from './models/ReviewRun.js';
import ReviewComment from './models/ReviewComment.js';
import Approval from './models/Approval.js';
import ActivityEvent from './models/ActivityEvent.js';
import { createReviewRun, hashContent } from './services/reviewEngine.js';

await connectDatabase();
const workspace = await Workspace.findOneAndUpdate(
  { slug: 'acmeflow-demo' },
  { $set: { name: 'AcmeFlow Studio', slug: 'acmeflow-demo' }, $setOnInsert: { settings: { externalAiEnabled: false, defaultBrandName: 'AcmeFlow' } } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

if (process.argv.includes('--reset')) {
  await Promise.all([User, BrandRule, ContentItem, ContentRevision, ReviewRun, ReviewComment, Approval, ActivityEvent].map((Model) => Model.deleteMany({ workspaceId: workspace._id })));
}

const demoPassword = 'BrandGuard@123';
const passwordHash = await bcrypt.hash(demoPassword, 12);
const accounts = [
  { name: 'Alex Morgan', email: 'admin@brandguard.demo', role: 'admin', avatarColor: '#d8e7df' },
  { name: 'Jamie Chen', email: 'creator@brandguard.demo', role: 'creator', avatarColor: '#e9dfd1' },
  { name: 'Taylor Reed', email: 'manager@brandguard.demo', role: 'manager', avatarColor: '#e4dff0' },
  { name: 'Jordan Blake', email: 'reviewer@brandguard.demo', role: 'reviewer', avatarColor: '#dce8ee' }
];
const users = {};
for (const account of accounts) {
  users[account.role] = await User.findOneAndUpdate(
    { workspaceId: workspace._id, email: account.email },
    { $set: { ...account, workspaceId: workspace._id, passwordHash, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const ruleSeeds = [
  { type: 'voice', title: 'A clear, helpful brand voice', description: 'Write in a helpful, clear and confident voice. Avoid inflated language, pressure tactics and unnecessary jargon.', sourceName: 'AcmeFlow Brand Handbook', sourceSection: 'Voice and tone', severity: 'medium' },
  { type: 'terminology', title: 'Product name is always AcmeFlow', description: 'Use the exact product name AcmeFlow in all customer-facing copy. Do not split or capitalise the name differently.', canonicalValue: 'AcmeFlow', aliases: ['ACME flow', 'Acme flow', 'Acme Flow'], sourceName: 'AcmeFlow Brand Handbook', sourceSection: 'Product naming', severity: 'medium' },
  { type: 'fact', title: 'Free trial duration', description: 'The current standard free trial lasts 14 days. Older 30-day offer copy is no longer valid.', canonicalValue: '14-day free trial', aliases: ['30-day free trial', '30 day free trial', '30 days free', '30-day trial'], sourceName: 'Product Facts Register', sourceSection: 'Trial offer', severity: 'high' },
  { type: 'fact', title: 'Starting subscription price', description: 'The approved starting subscription price is ₹499 per month. Price claims should include the applicable plan context.', canonicalValue: '₹499/month', aliases: ['₹399/month', '₹399 per month', 'starts at ₹399'], sourceName: 'Product Facts Register', sourceSection: 'Pricing', severity: 'high' },
  { type: 'claim_policy', title: 'Evidence required for performance claims', description: 'Performance, comparative, guaranteed and market-leading claims must be supported by approved evidence before publication.', canonicalValue: 'Performance claims require approved evidence.', sourceName: 'Claims and Evidence Policy', sourceSection: 'Promotional claims', severity: 'high' },
  { type: 'messaging', title: 'Include the current trial qualification', description: 'For trial-led LinkedIn promotions, make the trial duration clear so the offer is not misleading.', canonicalValue: '14-day free trial', sourceName: 'Campaign Messaging Guide', sourceSection: 'Trial campaign', scope: 'linkedin', severity: 'medium' },
  { type: 'accessibility', title: 'Provide meaningful image descriptions', description: 'When publishing a meaningful image on a website, provide useful alternative text that communicates its purpose.', sourceName: 'Digital Accessibility Guide', sourceSection: 'Alternative text', severity: 'medium' }
];
for (const seed of ruleSeeds) {
  await BrandRule.findOneAndUpdate(
    { workspaceId: workspace._id, title: seed.title },
    { $setOnInsert: { ...seed, workspaceId: workspace._id, status: 'approved', version: 1, approvedBy: users.admin._id, createdBy: users.admin._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

let existing = await ContentItem.countDocuments({ workspaceId: workspace._id });
if (existing === 0) {
  const sampleBody = 'ACME flow guarantees 10× productivity for every team. Start your 30-day free trial today and get started for only ₹399/month.';
  const item = await ContentItem.create({
    workspaceId: workspace._id, title: 'Spring campaign launch', channel: 'linkedin',
    audience: 'Small business owners and growing teams', objective: 'Encourage qualified visitors to start a free trial',
    status: 'in_review', createdBy: users.creator._id, assignedTo: users.manager._id
  });
  const revision = await ContentRevision.create({
    workspaceId: workspace._id, contentItemId: item._id, revisionNumber: 1, body: sampleBody,
    contentHash: hashContent(sampleBody), createdBy: users.creator._id, changeNote: 'Initial campaign draft'
  });
  item.currentRevisionId = revision._id;
  await item.save();
  const run = await createReviewRun({ workspaceId: workspace._id, contentItemId: item._id, revision, channel: item.channel, audience: item.audience, objective: item.objective });
  item.lastReviewedAt = run.completedAt;
  await item.save();
  await ReviewComment.create({ workspaceId: workspace._id, contentItemId: item._id, revisionId: revision._id, authorId: users.manager._id, message: 'Please verify the latest trial duration and pricing before approval.' });
  await ActivityEvent.create({ workspaceId: workspace._id, actorId: users.creator._id, contentItemId: item._id, action: 'submitted_for_review', description: 'Jamie Chen submitted “Spring campaign launch” for review.' });
  await ActivityEvent.create({ workspaceId: workspace._id, actorId: users.admin._id, action: 'brand_knowledge_approved', description: 'Alex Morgan approved the AcmeFlow brand knowledge base.' });
}

console.log('\nBrandGuard demo data is ready.');
console.log('Workspace: AcmeFlow Studio');
console.log('Password for all demo accounts: BrandGuard@123');
for (const account of accounts) console.log(`  ${account.role.padEnd(8)} ${account.email}`);
console.log('\nStart the app with: npm run dev\n');
process.exit(0);
