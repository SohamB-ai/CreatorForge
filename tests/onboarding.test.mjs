import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/src/app.js';
import { BrandKit, CreatorProfile, Media, Message, Project, User } from '../server/src/models.js';
import { readChatStream } from '../client/src/chat-stream.js';
import { skillCatalog } from '../shared/skills.js';

const root = fileURLToPath(new URL('../', import.meta.url));
let directory;
let database;
let server;
let base;
let owner;
let stranger;
let captured;
const settings = { jwtSecret: 'onboarding-test-secret-at-least-thirty-two-characters', aiEnabled: true, geminiModel: 'gemini-test-provider', generateContent: async request => { captured = request; return '# Scoped test response'; }, generateContentStream: async function* (request) { captured = request; yield '# Scoped test response'; } };
const values = { professions: ['creator', 'marketer', 'designer', 'student'], roleDetail: '', skillIds: ['social-caption', 'audio-blog', 'image-prompt'], workflow: 'A weekly podcast becomes a week of posts. ✨' };

async function request(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json(), headers: response.headers };
}

before(async () => {
  directory = await mkdtemp(`${root}tmp/onboarding-api-`);
  database = await MongoMemoryServer.create({ instance: { dbPath: directory }, binary: { downloadDir: `${root}tmp/mongodb-binaries` } });
  await mongoose.connect(database.getUri(), { dbName: 'onboarding-test' });
  await CreatorProfile.init();
  server = createApp(settings).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  owner = (await request('/auth/register', null, 'POST', { name: 'Profile Owner', email: 'onboarding-owner@example.com', password: 'TestPassword123!' })).data;
  stranger = (await request('/auth/register', null, 'POST', { name: 'Another Creator', email: 'onboarding-stranger@example.com', password: 'TestPassword123!' })).data;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('onboarding requires a session and treats existing accounts as unconfigured without migrating them', async () => {
  assert.equal((await request('/onboarding')).status, 401);
  assert.equal((await request('/onboarding', null, 'PUT', values)).status, 401);
  const response = await request('/onboarding', owner.token);
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { profile: null });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('onboarding persists a private profile and does not change accounts or brand guidelines', async () => {
  const account = await User.findById(owner.user._id).select('+password').lean();
  const brand = await BrandKit.findOne({ userId: owner.user._id }).lean();
  const saved = await request('/onboarding', owner.token, 'PUT', values);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.data, { profile: values });
  assert.deepEqual((await request('/onboarding', owner.token)).data, saved.data);
  assert.deepEqual((await request('/onboarding', stranger.token)).data, { profile: null });
  assert.deepEqual(await User.findById(owner.user._id).select('+password').lean(), account);
  assert.deepEqual(await BrandKit.findOne({ userId: owner.user._id }).lean(), brand);
  assert.equal((await request('/auth/me', owner.token)).status, 200);
});

test('profile validation rejects unsupported, duplicate, empty, oversized and owner-controlled values', async () => {
  for (const patch of [
    { professions: ['admin'] }, { professions: [] }, { professions: ['creator', 'creator'] }, { professions: ['other'] }, { roleDetail: 'x'.repeat(121) },
    { skillIds: ['audio-blog', 'audio-blog'] }, { skillIds: ['unknown'] }, { professions: ['student'], skillIds: ['audio-blog'] },
    { workflow: 'x'.repeat(1001) }, { userId: stranger.user._id }, { completedAt: 'fake' },
  ]) {
    assert.equal((await request('/onboarding', owner.token, 'PUT', { ...values, ...patch })).status, 400, JSON.stringify(patch));
  }
  assert.deepEqual((await request('/onboarding', owner.token)).data.profile, values);
});

test('editing a profile trims optional answers, supports another role and keeps one profile per account', async () => {
  const edited = { professions: ['other', 'designer'], roleDetail: '  Podcast producer  ', skillIds: ['image-prompt'], workflow: '  Weekly interviews  ' };
  assert.equal((await request('/onboarding', owner.token, 'PUT', edited)).status, 200);
  assert.deepEqual((await request('/onboarding', owner.token)).data.profile, { ...edited, roleDetail: 'Podcast producer', workflow: 'Weekly interviews' });
  assert.equal(await CreatorProfile.countDocuments({ userId: owner.user._id }), 1);
});

test('concurrent first saves never create duplicate profiles or affect another account', async () => {
  const responses = await Promise.all(Array.from({ length: 4 }, () => request('/onboarding', stranger.token, 'PUT', values)));
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(await CreatorProfile.countDocuments({ userId: stranger.user._id }), 1);
  assert.deepEqual((await request('/onboarding', owner.token)).data.profile.professions, ['other', 'designer']);
});

test('legacy single-role profiles are readable without an account migration', async () => {
  await CreatorProfile.updateOne({ userId: stranger.user._id }, { $set: { role: 'creator', professions: [], skillIds: [] } });
  assert.deepEqual((await request('/onboarding', stranger.token)).data.profile.professions, ['creator']);
  await request('/onboarding', stranger.token, 'PUT', values);
  assert.equal((await CreatorProfile.findOne({ userId: stranger.user._id })).role, undefined);
});

test('multi-profession projects persist catalog skills, reject fake skills and keep normal projects compatible', async () => {
  await request('/onboarding', owner.token, 'PUT', values);
  const created = await request('/projects', owner.token, 'POST', { name: 'Combined skills', skillIds: ['social-caption', 'image-prompt'] });
  assert.equal(created.status, 201);
  assert.deepEqual(created.data.skillIds, ['social-caption', 'image-prompt']);
  assert.deepEqual((await request(`/projects/${created.data._id}`, owner.token)).data.skillIds, created.data.skillIds);
  assert.equal((await request('/projects', owner.token, 'POST', { name: 'Unknown', skillIds: ['made-up'] })).status, 400);
  assert.equal((await request('/projects', owner.token, 'POST', { name: 'Duplicates', skillIds: ['image-prompt', 'image-prompt'] })).status, 400);
  const ordinary = await request('/projects', owner.token, 'POST', { name: 'Ordinary project' });
  assert.equal(ordinary.status, 201);
  assert.deepEqual(ordinary.data.skillIds, []);
  assert.equal((await request(`/projects/${created.data._id}`, stranger.token, 'PATCH', { skillIds: ['audio-blog'] })).status, 404);
});

test('profiles limit newly added skills without breaking already-attached project skills', async () => {
  const project = await Project.create({ userId: owner.user._id, name: 'Keep existing skills', skillIds: ['image-prompt'] });
  await request('/onboarding', owner.token, 'PUT', { professions: ['creator', 'student'], skillIds: [], roleDetail: '', workflow: '' });
  assert.equal((await request(`/projects/${project._id}`, owner.token, 'PATCH', { skillIds: ['image-prompt', 'audio-blog'] })).status, 200);
  assert.equal((await request(`/projects/${project._id}`, owner.token, 'PATCH', { skillIds: ['image-prompt', 'audio-blog', 'visual-style'] })).status, 400);
  await request('/onboarding', owner.token, 'PUT', values);
});

test('concurrent additions preserve the union of skills and enforce project ownership', async () => {
  const project = await Project.create({ userId: owner.user._id, name: 'Concurrent skills', skillIds: ['image-prompt'] });
  const replies = await Promise.all(['audio-blog', 'social-caption'].map(identifier => request(`/projects/${project._id}/skills`, owner.token, 'PATCH', { skillIds: [identifier] })));
  assert.ok(replies.every(reply => reply.status === 200));
  assert.deepEqual(new Set((await Project.findById(project._id)).skillIds), new Set(['image-prompt', 'audio-blog', 'social-caption']));
  assert.equal((await request(`/projects/${project._id}/skills`, stranger.token, 'PATCH', { skillIds: ['audio-blog'] })).status, 404);
});

test('skill execution requires project membership and appropriate source material before provider calls', async () => {
  const project = await Project.create({ userId: owner.user._id, name: 'Input validation', skillIds: ['audio-blog'] });
  captured = null;
  for (const skillId of ['unknown', 'image-prompt', 'audio-blog']) {
    const response = await fetch(`${base}/chat/stream`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: String(project._id), message: 'Run skill', skillId }) });
    assert.equal(response.status, 400);
    assert.equal(captured, null);
  }
  assert.equal(await Message.countDocuments({ projectId: project._id }), 0);
});

test('each attached skill uses its assigned specialist, real media payloads and saved brand context', async () => {
  const project = await Project.create({ userId: owner.user._id, name: 'All supplied workflows', description: 'A warm independent studio.', skillIds: skillCatalog.map(skill => skill.id) });
  await Media.create([
    { userId: owner.user._id, projectId: project._id, name: 'voice.wav', type: 'audio', mimeType: 'audio/wav', data: Buffer.from('test-only audio').toString('base64'), size: 15 },
    { userId: owner.user._id, projectId: project._id, name: 'sketch.png', type: 'image', mimeType: 'image/png', data: Buffer.from('test-only image').toString('base64'), size: 15 },
    { userId: owner.user._id, projectId: project._id, name: 'brief.pdf', type: 'document', mimeType: 'application/pdf', data: Buffer.from('test-only pdf').toString('base64'), size: 13 },
  ]);
  await request('/brand-kit', owner.token, 'PUT', { name: 'Studio Fixture', tone: 'Warm and concise', guidelines: 'Do not invent testimonials.' });
  const scoped = createApp(settings).listen(0, '127.0.0.1');
  await new Promise(resolve => scoped.once('listening', resolve));
  const address = `http://127.0.0.1:${scoped.address().port}/api`;
  try {
    for (const skill of skillCatalog) {
      const response = await fetch(`${address}/chat/stream`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: String(project._id), message: skill.prompt, skillId: skill.id }) });
      assert.equal(response.status, 200);
      assert.equal((await readChatStream(response.body, { onDelta() {} })).assistantMessage.content, '# Scoped test response');
      assert.ok(captured.config.systemInstruction.includes(skill.agent.name));
      assert.ok(captured.config.systemInstruction.includes(skill.agent.instruction));
      assert.match(captured.config.systemInstruction, /Studio Fixture|Warm and concise/);
      assert.ok(captured.contents.at(-1).parts.some(part => part.inlineData?.mimeType === 'audio/wav'));
    }
    const json = await fetch(`${address}/chat`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: String(project._id), message: 'A text brief', skillId: 'image-prompt' }) });
    assert.equal(json.status, 200);
    assert.match(captured.config.systemInstruction, /Image Prompt Writer/);
  } finally { await new Promise(resolve => scoped.close(resolve)); }
});
