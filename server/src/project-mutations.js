import mongoose from 'mongoose';
import { Media, Project } from './models.js';

const pending = new Map();
export const MAX_PROJECT_BYTES = 50 * 1024 * 1024;
mongoose.set('transactionAsyncLocalStorage', true);

export function supportsTransactions() {
  const topology = mongoose.connection.getClient?.()?.topology?.description?.type;
  return topology === 'ReplicaSetWithPrimary' || topology === 'Sharded';
}

export async function reconcileProjectStorage(projectId) {
  const totals = await Media.aggregate([{ $match: { projectId: new mongoose.Types.ObjectId(projectId) } }, { $group: { _id: null, bytes: { $sum: '$size' } } }]);
  const bytes = totals[0]?.bytes || 0;
  await Project.updateOne({ _id: projectId }, { $set: { storageBytes: bytes } });
  return bytes;
}

export async function backfillProjectStorage() {
  const cursor = Project.find({ storageBytes: { $exists: false } }).select('_id').cursor();
  for await (const project of cursor) await reconcileProjectStorage(project._id);
}

export async function withProjectMutation(projectId, userId, operation) {
  if (supportsTransactions()) return mongoose.connection.transaction(async () => {
    if (!await Project.exists({ _id: projectId, userId })) throw Object.assign(new Error('Project no longer exists.'), { status: 404 });
    return operation();
  });
  // Standalone MongoDB remains available for local development; production requires a replica set.
  const key = projectId.toString();
  const previous = pending.get(key) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  pending.set(key, current);
  await previous;
  try {
    if (!await Project.exists({ _id: projectId, userId })) throw Object.assign(new Error('Project no longer exists.'), { status: 404 });
    return await operation();
  } finally {
    release();
    if (pending.get(key) === current) pending.delete(key);
  }
}

export async function ensureStorage(projectId, addedBytes, removedBytes = 0) {
  const delta = addedBytes - removedBytes;
  if (supportsTransactions()) {
    const changed = await Project.updateOne({ _id: projectId, storageBytes: { $exists: true, $gte: Math.max(0, -delta), $lte: MAX_PROJECT_BYTES - delta } }, { $inc: { storageBytes: delta } });
    if (!changed.matchedCount) {
      if (!await Project.exists({ _id: projectId })) throw Object.assign(new Error('Project no longer exists.'), { status: 404 });
      throw Object.assign(new Error('This project has reached its 50 MB storage limit. Remove an asset first.'), { status: 413 });
    }
    return;
  }
  const totals = await Media.aggregate([{ $match: { projectId } }, { $group: { _id: null, bytes: { $sum: '$size' } } }]);
  if ((totals[0]?.bytes || 0) + delta > MAX_PROJECT_BYTES) throw Object.assign(new Error('This project has reached its 50 MB storage limit. Remove an asset first.'), { status: 413 });
  await Project.updateOne({ _id: projectId }, { $set: { storageBytes: Math.max(0, (totals[0]?.bytes || 0) + delta) } });
}
