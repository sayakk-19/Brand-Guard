import mongoose from 'mongoose';

const activityEventSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  contentItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentItem', default: null },
  action: { type: String, required: true },
  description: { type: String, required: true, maxlength: 240 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model('ActivityEvent', activityEventSchema);
