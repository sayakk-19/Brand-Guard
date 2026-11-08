import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  plan: { type: String, default: 'hackathon' },
  settings: {
    externalAiEnabled: { type: Boolean, default: false },
    defaultBrandName: { type: String, default: 'AcmeFlow' }
  }
}, { timestamps: true });

export default mongoose.model('Workspace', workspaceSchema);
