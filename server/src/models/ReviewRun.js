import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema({
  category: { type: String, enum: ['terminology', 'factual', 'promotional_claim', 'tone', 'messaging', 'accessibility', 'visual', 'other'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  certainty: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['open', 'accepted', 'dismissed', 'resolved', 'exception'], default: 'open' },
  title: { type: String, required: true },
  excerpt: { type: String, required: true },
  explanation: { type: String, required: true },
  suggestion: { type: String, default: '' },
  evidence: {
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandRule', default: null },
    sourceName: { type: String, default: '' },
    sourceSection: { type: String, default: '' },
    approvedValue: { type: String, default: '' },
    sourceVersion: { type: Number, default: null }
  },
  startIndex: { type: Number, default: -1 },
  endIndex: { type: Number, default: -1 },
  resolutionNote: { type: String, default: '' }
}, { timestamps: true });

const reviewRunSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  contentItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  revisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentRevision', required: true },
  runNumber: { type: Number, required: true },
  status: { type: String, enum: ['completed', 'partial', 'failed'], default: 'completed' },
  provider: { type: String, enum: ['rules', 'rules+gemini'], default: 'rules' },
  checks: [{ name: String, status: { type: String, enum: ['completed', 'incomplete', 'skipped'] }, message: String }],
  findings: [findingSchema],
  sourceRuleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BrandRule' }],
  completedAt: { type: Date, default: Date.now },
  errorSummary: { type: String, default: '' }
}, { timestamps: true });

reviewRunSchema.index({ contentItemId: 1, runNumber: -1 });
reviewRunSchema.index({ contentItemId: 1, runNumber: 1 }, { unique: true });
export default mongoose.model('ReviewRun', reviewRunSchema);
