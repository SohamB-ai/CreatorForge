import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/src/app.js';
import { Media, Message, Project } from '../server/src/models.js';

let database;
let server;
let origin;
let token;
let ownerId;
let provider = async () => 'Generated fixture';
const limit = 50 * 1024 * 1024;
async function request(path, method = 'GET', body) {
  const response = await fetch(`${origin}/api${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
async function project() { return (await request('/projects', 'POST', { name: 'Race fixture' })).data; }
async function asset(projectId, size = 1) { return Media.create({ projectId, userId: ownerId, name: 'Source.txt', type: 'text', mimeType: 'text/plain', size, data: Buffer.from('Source').toString('base64') }); }
async function upload(projectId, size) {
  const form = new FormData();
  form.append('file', new Blob([Buffer.alloc(size, 65)], { type: 'text/plain' }), 'upload.txt');
  return request(`/projects/${projectId}/media`, 'POST', form);
}
function deferred() { let resolve; const promise = new Promise(ready => { resolve = ready; }); return { promise, resolve }; }
before(async () => {
  database = await MongoMemoryServer.create({ binary: { downloadDir: fileURLToPath(new URL('../tmp/mongodb-binaries', import.meta.url)) } });
  await mongoose.connect(database.getUri());
  server = createApp({ jwtSecret: 'consistency-test-secret-at-least-thirty-two-characters', aiEnabled: true, geminiModel: 'gemini-test-model', generateContent: request => provider(request) }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const account = await request('/auth/register', 'POST', { name: 'Race Owner', email: 'race@example.com', password: 'RaceTest123!' });
  token = account.data.token;
  ownerId = account.data.user._id;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});
test('deletion during remix rejects late persistence without orphan assets', async () => {
  const found = await project();
  const source = await asset(found._id);
  const started = deferred();
  const release = deferred();
  provider = async () => { started.resolve(); await release.promise; return 'Late remix'; };
  const pending = request('/remix', 'POST', { projectId: found._id, mediaId: source.id, format: 'Summary' });
  await started.promise;
  try { assert.equal((await request(`/projects/${found._id}`, 'DELETE')).status, 204); } finally { release.resolve(); }
  assert.equal((await pending).status, 404);
  assert.equal(await Project.countDocuments({ _id: found._id }), 0);
  assert.equal(await Media.countDocuments({ projectId: found._id }), 0);
});
test('deletion during legacy chat rejects late history persistence', async () => {
  const found = await project();
  const started = deferred();
  const release = deferred();
  provider = async () => { started.resolve(); await release.promise; return 'Late chat'; };
  const pending = request('/chat', 'POST', { projectId: found._id, message: 'Create a draft' });
  await started.promise;
  try { assert.equal((await request(`/projects/${found._id}`, 'DELETE')).status, 204); } finally { release.resolve(); }
  assert.equal((await pending).status, 404);
  assert.equal(await Message.countDocuments({ projectId: found._id }), 0);
});
test('concurrent uploads cannot exceed the project storage limit', async () => {
  const found = await project();
  await asset(found._id, limit - 1024 * 1024);
  const original = Media.aggregate;
  Media.aggregate = async function (...args) { const result = await original.apply(this, args); await new Promise(resolve => setTimeout(resolve, 100)); return result; };
  try {
    const results = await Promise.all([upload(found._id, 1024 * 1024), upload(found._id, 1024 * 1024)]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 413]);
    const totals = await original.call(Media, [{ $match: { projectId: new mongoose.Types.ObjectId(found._id) } }, { $group: { _id: null, size: { $sum: '$size' } } }]);
    assert.equal(totals[0].size, limit);
  } finally { Media.aggregate = original; }
});
test('remix output obeys the same project storage cap as uploads', async () => {
  const found = await project();
  const source = await asset(found._id);
  await asset(found._id, limit - 1);
  let generated = false;
  provider = async () => { generated = true; return 'Over quota'; };
  assert.equal((await request('/remix', 'POST', { projectId: found._id, mediaId: source.id, format: 'Summary' })).status, 413);
  assert.equal(generated, true);
  assert.equal(await Media.countDocuments({ projectId: found._id }), 2);
});
test('uploads and chat saves share one storage budget', async () => {
  const found = await project();
  await asset(found._id, limit - 1024);
  const message = await Message.create({ projectId: found._id, userId: ownerId, role: 'model', content: 'A'.repeat(1024) });
  const original = Media.aggregate;
  Media.aggregate = async function (...args) { const result = await original.apply(this, args); await new Promise(resolve => setTimeout(resolve, 100)); return result; };
  try {
    const results = await Promise.all([upload(found._id, 1024), request(`/projects/${found._id}/messages/${message.id}/save`, 'POST', {})]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 413]);
  } finally { Media.aggregate = original; }
});
test('concurrent edits to different assets cannot overdraw storage', async () => {
  const found = await project();
  await asset(found._id, limit - 1024);
  const first = await asset(found._id, 1);
  const second = await asset(found._id, 1);
  const original = Media.aggregate;
  Media.aggregate = async function (...args) { const result = await original.apply(this, args); await new Promise(resolve => setTimeout(resolve, 100)); return result; };
  try {
    const results = await Promise.all([first, second].map(source => request(`/projects/${found._id}/media/${source.id}`, 'PATCH', { content: 'A'.repeat(1023), version: 0 })));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 413]);
  } finally { Media.aggregate = original; }
});
test('project deletion waits for an accepted upload and then removes all assets', async () => {
  const found = await project();
  const started = deferred();
  const release = deferred();
  const original = Media.create;
  Media.create = async function (...args) { started.resolve(); await release.promise; return original.apply(this, args); };
  try {
    const pendingUpload = upload(found._id, 10);
    await started.promise;
    const pendingDelete = request(`/projects/${found._id}`, 'DELETE');
    release.resolve();
    assert.equal((await pendingUpload).status, 201);
    assert.equal((await pendingDelete).status, 204);
    assert.equal(await Media.countDocuments({ projectId: found._id }), 0);
  } finally { release.resolve(); Media.create = original; }
});
