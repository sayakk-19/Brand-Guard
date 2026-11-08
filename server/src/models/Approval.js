import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  contentItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  revisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentRevision', required: true },
  contentHash: { type: String, required: true },
  sourceRuleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BrandRule' }],
  action: { type: String, enum: ['approved', 'changes_requested', 'exception'], required: true },
  note: { type: String, default: '', maxlength: 1000 },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('Approval', approvalSchema);
