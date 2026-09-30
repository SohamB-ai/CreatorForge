import mongoose from 'mongoose';
const {
  Schema
} = mongoose;
const schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  agentId: String,
  skillVersion: String,
  brief: String,
  duration: Number,
  sourceIds: [Schema.Types.ObjectId],
  brand: Schema.Types.Mixed,
  overrides: Schema.Types.Mixed,
  artifacts: {
    type: Schema.Types.Mixed,
    default: {}
  },
  selectedAngle: {
    type: Number,
    default: -1
  },
  outlineApproved: {
    type: Boolean,
    default: false
  },
  stale: {
    type: [String],
    default: []
  },
  revision: {
    type: Number,
    default: 0
  },
  audit: Schema.Types.Mixed,
  assets: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  minimize: false
});
export const StudioRun = mongoose.model('StudioRun', schema);
export const StudioRevision = mongoose.model('StudioRevision', new Schema({
  runId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  revision: Number,
  snapshot: Schema.Types.Mixed
}, {
  timestamps: true
}));
export const StudioRequest = mongoose.model('StudioRequest', new Schema({
  runId: Schema.Types.ObjectId,
  requestId: String,
  result: Schema.Types.Mixed
}, {
  timestamps: true
}));
StudioRequest.schema.index({
  runId: 1,
  requestId: 1
}, {
  unique: true
});
