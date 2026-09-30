import mongoose from 'mongoose';

const { Schema } = mongoose;
const options = { timestamps: true };
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const project = { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true };

export const User = mongoose.model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: function () { return !this.googleSub; }, select: false },
  googleSub: { type: String, unique: true, sparse: true, select: false },
}, options));
export const GoogleChallenge = mongoose.model('GoogleChallenge', new Schema({
  nonceHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}));
export const Project = mongoose.model('Project', new Schema({
  userId: owner,
  name: { type: String, required: true },
  description: { type: String, default: '' },
}, options));
export const Media = mongoose.model('Media', new Schema({
  userId: owner,
  projectId: project,
  name: { type: String, required: true },
  type: { type: String, enum: ['image', 'audio', 'video', 'document', 'text'], required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: String, required: true, select: false },
  autoDescription: { type: String, default: '' },
}, options));
export const Message = mongoose.model('Message', new Schema({
  userId: owner,
  projectId: project,
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true },
}, options));
export const BrandKit = mongoose.model('BrandKit', new Schema({
  userId: { ...owner, unique: true },
  name: { type: String, default: '' },
  tone: { type: String, default: 'Professional and conversational' },
  audience: { type: String, default: '' },
  keywords: { type: [String], default: [] },
  colors: { type: [String], default: [] },
  guidelines: { type: String, default: '' },
}, options));
