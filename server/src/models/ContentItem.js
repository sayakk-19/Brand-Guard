import mongoose from 'mongoose';

const contentItemSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  channel: { type: String, enum: ['linkedin', 'website', 'email', 'print', 'other'], default: 'linkedin' },
  audience: { type: String, default: '', maxlength: 240 },
  objective: { type: String, default: '', maxlength: 400 },
  status: { type: String, enum: ['draft', 'in_review', 'changes_requested', 'approved'], default: 'draft', index: true },
  currentRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentRevision', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastReviewedAt: { type: Date, default: null },
  approvedRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentRevision', default: null },
  archivedAt: { type: Date, default: null }
}, { timestamps: true });

contentItemSchema.index({ workspaceId: 1, updatedAt: -1 });
export default mongoose.model('ContentItem', contentItemSchema);
