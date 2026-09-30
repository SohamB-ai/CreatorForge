import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { createApp, MAX_FILE_BYTES } from '../server/src/app.js';
import { Media, Message, User } from '../server/src/models.js';

const root = fileURLToPath(new URL('../', import.meta.url));
process.env.MONGOMS_DOWNLOAD_DIR = `${root}tmp/mongodb-binaries`;
const { MongoMemoryServer } = await import('mongodb-memory-server');
let database;
let server;
let base;
let requests = [];
let providerFails = false;
const jwtSecret = 'test-only-creatorforge-secret-at-least-thirty-two-characters';
before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'creatorforge-test' });
  const app = createApp({ jwtSecret, generateContent: async (request) => { requests.push(request); if (providerFails) throw new Error('provider secret must never be exposed'); return { text: '# Test generation\nGrounded in the supplied sources.' }; } });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});
async function request(path, { token, body, method = 'GET' } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const data = response.status === 204 ? null : response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, data, response };
}
async function upload(projectId, token, content, type = 'text/plain', name = 'brief.txt') {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  return request(`/projects/${projectId}/media`, { method: 'POST', token, body: form });
}

test('CreatorForge authentication, ownership, media, brand and generation contract', async (context) => {
  let owner;
  let stranger;
  let project;
  let asset;
  await context.test('health and protected API', async () => {
    assert.equal((await request('/health')).data.database, 'connected');
    assert.equal((await request('/projects')).status, 401);
    assert.equal((await request('/projects', { token: 'invalid' })).status, 401);
  });
  await context.test('registration, validation and password hashing', async () => {
    assert.equal((await request('/auth/register', { method: 'POST', body: { name: 'Test', email: 'bad', password: 'short' } })).status, 400);
    owner = (await request('/auth/register', { method: 'POST', body: { name: 'Creator', email: 'OWNER@example.com', password: 'StrongPass123!' } })).data;
    assert.ok(owner.token);
    assert.equal(owner.user.email, 'owner@example.com');
    assert.equal(owner.user.password, undefined);
    const stored = await User.findById(owner.user._id).select('+password');
    assert.notEqual(stored.password, 'StrongPass123!');
    assert.equal((await request('/auth/register', { method: 'POST', body: { name: 'Duplicate', email: 'owner@example.com', password: 'StrongPass123!' } })).status, 409);
    stranger = (await request('/auth/register', { method: 'POST', body: { name: 'Another', email: 'other@example.com', password: 'StrongPass123!' } })).data;
    assert.equal((await request('/auth/register', { method: 'POST', body: { name: 'Long', email: 'long@example.com', password: '🔒'.repeat(20) } })).status, 400);
  });
  await context.test('login and current account', async () => {
    assert.equal((await request('/auth/login', { method: 'POST', body: { email: owner.user.email, password: 'wrong' } })).status, 401);
    assert.ok((await request('/auth/login', { method: 'POST', body: { email: owner.user.email, password: 'StrongPass123!' } })).data.token);
    assert.equal((await request('/auth/me', { token: owner.token })).data._id, owner.user._id);
  });
  await context.test('project CRUD prevents mass assignment and cross-account access', async () => {
    const created = await request('/projects', { token: owner.token, method: 'POST', body: { name: 'Campaign', description: 'Autumn launch', userId: stranger.user._id } });
    assert.equal(created.status, 201);
    project = created.data;
    assert.equal(project.userId, owner.user._id);
    assert.equal((await request('/projects', { token: stranger.token })).data.length, 0);
    for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await request(`/projects/${project._id}`, { token: stranger.token, method, body: method === 'PATCH' ? { name: 'Hijacked' } : undefined })).status, 404);
    assert.equal((await request('/projects/not-an-id', { token: owner.token })).status, 404);
    assert.equal((await request(`/projects/${project._id}`, { token: owner.token, method: 'PATCH', body: { name: 'Updated campaign', userId: stranger.user._id } })).data.name, 'Updated campaign');
  });
  await context.test('text uploads and authorized binary retrieval', async () => {
    const uploaded = await upload(project._id, owner.token, 'A thoughtful autumn campaign about sustainable travel.');
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.data));
    asset = uploaded.data;
    assert.equal(asset.data, undefined);
    assert.equal((await request(`/projects/${project._id}/media`, { token: owner.token })).data.length, 1);
    assert.equal((await request(`/projects/${project._id}/media/${asset._id}/content`, { token: owner.token })).data, 'A thoughtful autumn campaign about sustainable travel.');
    assert.equal((await request(`/projects/${project._id}/media/${asset._id}/content`, { token: stranger.token })).status, 404);
    assert.equal((await upload(project._id, stranger.token, 'Cannot write this.')).status, 404);
  });
  await context.test('upload safety: limits, supported types and signatures', async () => {
    assert.equal((await upload(project._id, owner.token, Buffer.alloc(MAX_FILE_BYTES + 1, 65))).status, 413);
    assert.equal((await upload(project._id, owner.token, '<svg/>', 'image/svg+xml', 'bad.svg')).status, 415);
    assert.equal((await upload(project._id, owner.token, 'not a PNG', 'image/png', 'bad.png')).status, 415);
    assert.equal((await upload(project._id, owner.token, Buffer.from([0, 1, 2]), 'text/plain')).status, 415);
    assert.equal((await upload(project._id, owner.token, '')).status, 400);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64');
    assert.equal((await upload(project._id, owner.token, png, 'image/png', 'reference.png')).status, 201);
  });
  await context.test('global brand isolation and explicit field validation', async () => {
    const brand = await request('/brand-kit', { token: owner.token, method: 'PUT', body: { name: 'Studio', tone: 'Thoughtful', audience: 'Travelers', keywords: ['sustainable'], colors: ['#8b5cf6'], guidelines: 'Avoid hype.', userId: stranger.user._id } });
    assert.equal(brand.status, 200);
    assert.equal(brand.data.userId, owner.user._id);
    assert.equal((await request('/brand-kit', { token: stranger.token })).data.name, '');
    assert.equal((await request('/brand-kit', { token: owner.token, method: 'PUT', body: { colors: ['invalid'] } })).status, 400);
  });
  await context.test('AI adapter receives all media, brand, prompt and conversation history', async () => {
    const reply = await request('/chat', { token: owner.token, method: 'POST', body: { projectId: project._id, message: 'Write a caption.' } });
    assert.equal(reply.status, 200);
    assert.equal(reply.data.assistantMessage.role, 'model');
    const captured = requests.at(-1);
    assert.match(captured.config.systemInstruction, /Thoughtful/);
    assert.match(captured.config.systemInstruction, /Avoid hype/);
    assert.ok(captured.contents.at(-1).parts.some((part) => part.inlineData?.mimeType === 'image/png'));
    assert.ok(captured.contents.at(-1).parts.some((part) => part.text?.includes('sustainable travel')));
    await request('/chat', { token: owner.token, method: 'POST', body: { projectId: project._id, message: 'Make it shorter.' } });
    assert.equal(requests.at(-1).contents.length, 3);
    assert.equal((await request(`/projects/${project._id}/messages`, { token: owner.token })).data.length, 4);
    assert.equal((await request('/chat', { token: stranger.token, method: 'POST', body: { projectId: project._id, message: 'Read secrets' } })).status, 404);
  });
  await context.test('remix selected source and persist generated text asset', async () => {
    const reply = await request('/remix', { token: owner.token, method: 'POST', body: { projectId: project._id, mediaId: asset._id, format: 'Blog post', instructions: 'Keep it concise.' } });
    assert.equal(reply.status, 200);
    assert.ok(reply.data.content);
    assert.equal((await request(`/projects/${project._id}/media`, { token: owner.token })).data.length, 3);
    assert.ok(!requests.at(-1).contents.at(-1).parts.some((part) => part.inlineData));
    assert.match(requests.at(-1).contents.at(-1).parts[0].text, /Keep it concise/);
    assert.equal((await request('/remix', { token: stranger.token, method: 'POST', body: { projectId: project._id, mediaId: asset._id, format: 'Blog post' } })).status, 404);
  });
  await context.test('provider errors are sanitized and do not save phantom messages', async () => {
    providerFails = true;
    const count = await Message.countDocuments({ projectId: project._id });
    const reply = await request('/chat', { token: owner.token, method: 'POST', body: { projectId: project._id, message: 'Try again.' } });
    assert.equal(reply.status, 503);
    assert.doesNotMatch(reply.data.error, /provider secret/);
    assert.equal(await Message.countDocuments({ projectId: project._id }), count);
    providerFails = false;
  });
  await context.test('missing AI key reports configuration, never fabricated content', async () => {
    const disconnected = createApp({ jwtSecret }).listen(0, '127.0.0.1');
    await new Promise((resolve) => disconnected.once('listening', resolve));
    try {
      const reply = await fetch(`http://127.0.0.1:${disconnected.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` }, body: JSON.stringify({ projectId: project._id, message: 'Generate' }) });
      assert.equal(reply.status, 503);
      assert.match((await reply.json()).error, /GEMINI_API_KEY/);
    } finally { await new Promise((resolve) => disconnected.close(resolve)); }
  });
  await context.test('project deletion cascades only its own media and history', async () => {
    assert.equal((await request(`/projects/${project._id}`, { token: owner.token, method: 'DELETE' })).status, 204);
    assert.equal(await Media.countDocuments({ projectId: project._id }), 0);
    assert.equal(await Message.countDocuments({ projectId: project._id }), 0);
    assert.equal((await request(`/projects/${project._id}`, { token: owner.token })).status, 404);
  });
});
