import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'creator', 'manager', 'reviewer'], default: 'creator' },
  isActive: { type: Boolean, default: true },
  membershipStatus: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
  avatarColor: { type: String, default: '#dce8e3' }
}, { timestamps: true });

userSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
export default mongoose.model('User', userSchema);
