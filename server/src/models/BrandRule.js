import mongoose from 'mongoose';

const brandRuleSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  type: { type: String, enum: ['voice', 'terminology', 'fact', 'claim_policy', 'visual', 'accessibility', 'messaging'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  canonicalValue: { type: String, trim: true, default: '' },
  aliases: [{ type: String, trim: true }],
  scope: { type: String, enum: ['all', 'linkedin', 'website', 'email', 'print'], default: 'all' },
  sourceName: { type: String, default: 'Brand handbook', trim: true },
  sourceSection: { type: String, default: 'Approved guidance', trim: true },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'approved', 'retired'], default: 'approved', index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  effectiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

brandRuleSchema.index({ workspaceId: 1, status: 1, type: 1 });
export default mongoose.model('BrandRule', brandRuleSchema);
