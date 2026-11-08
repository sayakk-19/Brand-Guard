import mongoose from 'mongoose';

const reviewCommentSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  contentItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  revisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentRevision', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  findingId: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { timestamps: true });

export default mongoose.model('ReviewComment', reviewCommentSchema);
