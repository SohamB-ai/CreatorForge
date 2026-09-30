import { Media, Project } from './models.js';

const pending = new Map();
export const MAX_PROJECT_BYTES = 50 * 1024 * 1024;

export async function withProjectMutation(projectId, userId, operation) {
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
  const totals = await Media.aggregate([{ $match: { projectId } }, { $group: { _id: null, bytes: { $sum: '$size' } } }]);
  if ((totals[0]?.bytes || 0) - removedBytes + addedBytes > MAX_PROJECT_BYTES) throw Object.assign(new Error('This project has reached its 50 MB storage limit. Remove an asset first.'), { status: 413 });
}
