import mongoose from 'mongoose';

const contentRevisionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  contentItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  revisionNumber: { type: Number, required: true },
  body: { type: String, required: true, maxlength: 30000 },
  contentHash: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changeNote: { type: String, default: 'Initial submission', maxlength: 300 }
}, { timestamps: true });

contentRevisionSchema.index({ contentItemId: 1, revisionNumber: 1 }, { unique: true });
export default mongoose.model('ContentRevision', contentRevisionSchema);
