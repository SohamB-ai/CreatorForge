import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/src/app.js';
import { Media, Message } from '../server/src/models.js';

const root = fileURLToPath(new URL('../', import.meta.url));
let database;
let directory;
let server;
let base;
let owner;
let stranger;
let project;
async function request(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = response.status === 204 ? null : response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, data };
}
const message = (content = '# Original response\n\nA creator’s voice ✨\n', role = 'model', projectId = project._id) => Message.create({ projectId, userId: owner.user._id, role, content });
const savePath = entry => `/projects/${project._id}/messages/${entry._id}/save`;
before(async () => {
  directory = await mkdtemp(`${root}tmp/chat-save-api-`);
  database = await MongoMemoryServer.create({ instance: { dbPath: directory }, binary: { downloadDir: `${root}tmp/mongodb-binaries` } });
  await mongoose.connect(database.getUri(), { dbName: 'chat-save-test' });
  await Media.init();
  server = createApp({ jwtSecret: 'chat-save-test-secret-at-least-thirty-two-characters' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  owner = (await request('/auth/register', null, 'POST', { name: 'Owner', email: 'chat-owner@example.com', password: 'TestPassword123!' })).data;
  stranger = (await request('/auth/register', null, 'POST', { name: 'Stranger', email: 'chat-stranger@example.com', password: 'TestPassword123!' })).data;
  project = (await request('/projects', owner.token, 'POST', { name: 'Saved chat' })).data;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});
test('saving chat preserves exact content and creates an editable private Markdown asset', async () => {
  const entry = await message();
  const saved = await request(savePath(entry), owner.token, 'POST', {});
  assert.equal(saved.status, 201);
  assert.equal(saved.data.sourceMessageId, String(entry._id));
  assert.equal(saved.data.name, 'Saved AI response.md');
  assert.equal(saved.data.mimeType, 'text/markdown');
  assert.equal(saved.data.size, Buffer.byteLength(entry.content));
  assert.equal(saved.data.data, undefined);
  const edited = await request(`/projects/${project._id}/media/${saved.data._id}/edit`, owner.token);
  assert.equal(edited.data.content, entry.content);
  for (const format of ['markdown', 'text']) {
    const exported = await request(`/projects/${project._id}/media/${saved.data._id}/export?format=${format}`, owner.token);
    assert.equal(exported.data, entry.content);
  }
  assert.equal((await Message.findById(entry._id)).content, entry.content);
});
test('repeat saves return the same asset without overwriting later edits', async () => {
  const entry = await message();
  const first = await request(savePath(entry), owner.token, 'POST', {});
  await request(`/projects/${project._id}/media/${first.data._id}`, owner.token, 'PATCH', { content: 'Edited saved response', version: 0 });
  const again = await request(savePath(entry), owner.token, 'POST', {});
  assert.equal(again.status, 200);
  assert.equal(again.data._id, first.data._id);
  assert.equal((await request(`/projects/${project._id}/media/${first.data._id}/edit`, owner.token)).data.content, 'Edited saved response');
  assert.equal(await Media.countDocuments({ sourceMessageId: entry._id }), 1);
});
test('concurrent saves are idempotent and deleting the asset permits saving again', async () => {
  const entry = await message();
  const results = await Promise.all(Array.from({ length: 5 }, () => request(savePath(entry), owner.token, 'POST', {})));
  assert.equal(results.filter(result => result.status === 201).length, 1);
  assert(results.every(result => result.status === 201 || result.status === 200));
  assert.equal(new Set(results.map(result => result.data._id)).size, 1);
  await request(`/projects/${project._id}/media/${results[0].data._id}`, owner.token, 'DELETE');
  const restored = await request(savePath(entry), owner.token, 'POST', {});
  assert.equal(restored.status, 201);
  assert.notEqual(restored.data._id, results[0].data._id);
});
test('saving requires ownership, the correct project and a model response', async () => {
  const entry = await message();
  assert.equal((await request(savePath(entry), null, 'POST', {})).status, 401);
  assert.equal((await request(savePath(entry), stranger.token, 'POST', {})).status, 404);
  const another = (await request('/projects', owner.token, 'POST', { name: 'Another project' })).data;
  assert.equal((await request(`/projects/${another._id}/messages/${entry._id}/save`, owner.token, 'POST', {})).status, 404);
  assert.equal((await request(`/projects/${project._id}/messages/bad-id/save`, owner.token, 'POST', {})).status, 404);
  assert.equal((await request(savePath(await message('A user prompt', 'user')), owner.token, 'POST', {})).status, 415);
  assert.equal((await request(savePath(entry), owner.token, 'POST', { content: 'Injected replacement', userId: stranger.user._id })).status, 400);
  assert.equal(await Media.countDocuments({ sourceMessageId: entry._id }), 0);
});
test('saved responses obey UTF-8 editing limits and project storage quotas', async () => {
  for (const content of [' ', '\0', '✨'.repeat(20001)]) {
    const entry = await message(content);
    assert.equal((await request(savePath(entry), owner.token, 'POST', {})).status, 400);
    assert.equal(await Media.countDocuments({ sourceMessageId: entry._id }), 0);
  }
  const boundary = await message('✨'.repeat(20000));
  assert.equal((await request(savePath(boundary), owner.token, 'POST', {})).status, 201);
  const quota = await Media.create({ projectId: project._id, userId: owner.user._id, name: 'Quota fixture', type: 'text', mimeType: 'text/plain', data: 'eA==', size: 50 * 1024 * 1024 });
  const overQuota = await message('Cannot exceed project quota.');
  assert.equal((await request(savePath(overQuota), owner.token, 'POST', {})).status, 413);
  assert.equal(await Media.countDocuments({ sourceMessageId: overQuota._id }), 0);
  await quota.deleteOne();
});
