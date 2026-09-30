import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../server/src/app.js';
import { BrandKit, Media, MediaRevision, Project } from '../server/src/models.js';
import { backfillProjectStorage, reconcileProjectStorage, supportsTransactions } from '../server/src/project-mutations.js';
import { createMediaAnalysisWorker } from '../server/src/media-analysis.js';

let database, server, base, app, token, stranger, project;
let providerMode = 'normal';
const generated = [];
const fixture = {
  'text/plain': Buffer.from('An evidence-backed story.'),
  'image/png': Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(16)]),
  'audio/mpeg': Buffer.concat([Buffer.from('ID3'), Buffer.alloc(16)]),
  'video/mp4': Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.alloc(16)]),
  'application/pdf': Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'),
};
async function call(path, { method = 'GET', body, auth = token } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const type = response.headers.get('content-type') || '';
  const data = response.status === 204 ? null : type.includes('json') ? await response.json() : await response.arrayBuffer();
  return { response, status: response.status, data };
}
async function upload(mime, name, body = fixture[mime]) {
  const form = new FormData(); form.append('file', new Blob([body], { type: mime }), name);
  return call(`/projects/${project._id}/media`, { method: 'POST', body: form });
}
async function waitFor(assetId, state) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = await call(`/projects/${project._id}/media/${assetId}/analysis`);
    if (result.data.status === state) return result.data;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Analysis did not reach ${state}`);
}
before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { downloadDir: 'tmp/mongodb-binaries' } });
  await mongoose.connect(database.getUri(), { dbName: 'backend-completion' });
  app = createApp({ jwtSecret: 'backend-completion-test-secret-at-least-thirty-two-characters', aiEnabled: true, geminiModel: 'gemini-test-model', generateContent: async (request) => {
    generated.push(request);
    if (providerMode === 'quota') throw Object.assign(new Error('provider secret'), { status: 429 });
    if (providerMode === 'malformed') return { text: '{bad JSON' };
    if (request.contents.at(-1).parts.some(part => part.inlineData?.mimeType === 'application/pdf') && request.config.systemInstruction.includes('name, tone, audience')) return { text: JSON.stringify({ name: 'Test Brand', tone: 'Warm', audience: 'Readers', keywords: ['care'], colors: ['#123456'], guidelines: 'Be exact.' }) };
    return { text: JSON.stringify({ summary: 'Source summary', transcript: 'Spoken words' }) };
  } });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  const owner = await call('/auth/register', { method: 'POST', auth: null, body: { name: 'Owner', email: 'backend-owner@example.com', password: 'StrongPassword123!' } });
  token = owner.data.token;
  stranger = (await call('/auth/register', { method: 'POST', auth: null, body: { name: 'Other', email: 'backend-other@example.com', password: 'StrongPassword123!' } })).data.token;
  project = (await call('/projects', { method: 'POST', body: { name: 'Backend fixture' } })).data;
});
after(async () => { app?.locals.analysisWorker.stop(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await database?.stop(); });

test('replica-set counter enforces concurrent writes and reconciles existing media', async () => {
  assert.equal(supportsTransactions(), true);
  const large = await Media.create({ userId: (await Project.findById(project._id)).userId, projectId: project._id, name: 'old', type: 'text', mimeType: 'text/plain', size: 50 * 1024 * 1024 - fixture['text/plain'].length, data: 'YQ==' });
  await reconcileProjectStorage(project._id);
  const outcomes = await Promise.all([upload('text/plain', 'a.txt'), upload('text/plain', 'b.txt')]);
  assert.deepEqual(outcomes.map(item => item.status).sort(), [201, 413]);
  assert.equal((await Project.findById(project._id)).storageBytes, large.size + fixture['text/plain'].length);
  await Media.deleteOne({ _id: large._id });
  await reconcileProjectStorage(project._id);
  await Project.updateOne({ _id: project._id }, { $unset: { storageBytes: '' } });
  await backfillProjectStorage();
  assert.equal((await Project.findById(project._id)).storageBytes, fixture['text/plain'].length);
});

test('original media types queue and finish analysis without listing transcripts', async () => {
  for (const [mime, name] of [['image/png', 'photo.png'], ['audio/mpeg', 'voice.mp3'], ['video/mp4', 'clip.mp4'], ['application/pdf', 'manual.pdf'], ['text/plain', 'notes.txt']]) {
    const created = await upload(mime, name);
    assert.equal(created.status, 201);
    assert.equal(created.data.analysisStatus, 'pending');
    const analysis = await waitFor(created.data._id, 'ready');
    assert.equal(analysis.summary, 'Source summary');
    assert.equal(analysis.transcript, 'Spoken words');
    assert.equal((await call(`/projects/${project._id}/media/${created.data._id}/analysis`, { auth: stranger })).status, 404);
  }
  const listed = (await call(`/projects/${project._id}/media`)).data;
  assert.ok(listed.every(item => item.analysisTranscript === undefined && item.data === undefined));
  assert.ok(listed.some(item => item.analysisHasTranscript === true));
  assert.ok(generated.some(request => request.contents.at(-1).parts.some(part => part.inlineData?.mimeType === 'video/mp4')));
});

test('provider failure preserves upload, retries and explicit retry can recover', async () => {
  providerMode = 'quota';
  const created = await upload('text/plain', 'retry.txt');
  await waitFor(created.data._id, 'pending');
  assert.equal((await call(`/projects/${project._id}/media/${created.data._id}/analyze`, { method: 'POST', body: {} })).status, 202);
  await Media.updateOne({ _id: created.data._id }, { $set: { analysisStatus: 'failed' } });
  providerMode = 'normal';
  assert.equal((await call(`/projects/${project._id}/media/${created.data._id}/analyze`, { method: 'POST', body: {} })).status, 202);
  assert.equal((await waitFor(created.data._id, 'ready')).summary, 'Source summary');
  assert.ok(await Media.exists({ _id: created.data._id }));
});

test('brand PDF import is owner-only and review-only, malformed drafts do not save', async () => {
  const pdf = (await upload('application/pdf', 'brand.pdf')).data;
  const body = { projectId: project._id, mediaId: pdf._id };
  assert.equal((await call('/brand-kit/import', { method: 'POST', body, auth: stranger })).status, 404);
  providerMode = 'malformed';
  assert.equal((await call('/brand-kit/import', { method: 'POST', body })).status, 502);
  assert.equal(await BrandKit.countDocuments(), 0);
  providerMode = 'normal';
  const imported = await call('/brand-kit/import', { method: 'POST', body });
  assert.equal(imported.status, 200);
  assert.equal(imported.data.draft.name, 'Test Brand');
  assert.equal(await BrandKit.countDocuments(), 0);
});

test('text revisions restore with version checks and PDF export has private headers', async () => {
  const asset = (await upload('text/plain', 'saved.md', Buffer.from('# First\nOriginal'))).data;
  const endpoint = `/projects/${project._id}/media/${asset._id}`;
  const changed = await call(endpoint, { method: 'PATCH', body: { content: '# Second\n- item', version: 0 } });
  assert.equal(changed.status, 200);
  const revisions = await call(`${endpoint}/revisions`);
  assert.equal(revisions.data.length, 1);
  assert.equal(revisions.data[0].version, 0);
  assert.equal((await call(`${endpoint}/restore`, { method: 'POST', body: { revisionId: revisions.data[0]._id, version: 0 } })).status, 409);
  const restored = await call(`${endpoint}/restore`, { method: 'POST', body: { revisionId: revisions.data[0]._id, version: 1 } });
  assert.equal(restored.status, 200);
  assert.equal(restored.data.content, '# First\nOriginal');
  const pdf = await call(`${endpoint}/export?format=pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.response.headers.get('cache-control'), 'private, no-store');
  assert.match(pdf.response.headers.get('content-disposition'), /\.pdf/);
  assert.equal(Buffer.from(pdf.data).subarray(0, 4).toString(), '%PDF');
  const markdown = await call(`${endpoint}/export?format=markdown`);
  assert.equal(Buffer.from(markdown.data).toString(), '# First\nOriginal');
  await call(endpoint, { method: 'DELETE' });
  assert.equal(await MediaRevision.countDocuments({ mediaId: asset._id }), 0);
});

test('disabled AI leaves an uploaded source pending and retry is idempotent', async () => {
  const disabled = createApp({ jwtSecret: 'backend-completion-test-secret-at-least-thirty-two-characters', aiEnabled: false });
  const listener = disabled.listen(0, '127.0.0.1');
  await new Promise(resolve => listener.once('listening', resolve));
  try {
    const origin = `http://127.0.0.1:${listener.address().port}/api`;
    const form = new FormData(); form.append('file', new Blob(['Still available'], { type: 'text/plain' }), 'offline.txt');
    const response = await fetch(`${origin}/projects/${project._id}/media`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    assert.equal(response.status, 201);
    const asset = await response.json();
    assert.equal(asset.analysisStatus, 'pending');
    const retry = await fetch(`${origin}/projects/${project._id}/media/${asset._id}/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(retry.status, 202);
    assert.equal((await retry.json()).status, 'pending');
    await Media.updateOne({ _id: asset._id }, { $set: { analysisStatus: 'failed' } });
  } finally { await new Promise(resolve => listener.close(resolve)); }
});

test('logo bytes are private and ordinary brand responses contain metadata only', async () => {
  const form = new FormData(); form.append('file', new Blob([fixture['image/png']], { type: 'image/png' }), 'mark.png');
  const uploaded = await call('/brand-kit/logo', { method: 'PUT', body: form });
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.data.name, 'mark.png');
  const brand = await call('/brand-kit');
  assert.equal(brand.data.logo.name, 'mark.png');
  assert.equal(brand.data.logo.data, undefined);
  assert.equal((await call('/brand-kit/logo', { auth: stranger })).status, 404);
  const logo = await call('/brand-kit/logo');
  assert.deepEqual(Buffer.from(logo.data), fixture['image/png']);
  assert.equal((await call('/brand-kit/logo', { method: 'DELETE' })).status, 204);
  assert.equal((await call('/brand-kit/logo')).status, 404);
});

test('one lease claims an asset and deletion during analysis cannot recreate it', async () => {
  const owner = (await Project.findById(project._id)).userId;
  const asset = await Media.create({ userId: owner, projectId: project._id, name: 'lease.txt', type: 'text', mimeType: 'text/plain', size: 5, data: Buffer.from('Lease').toString('base64'), analysisStatus: 'pending' });
  let release, started;
  const began = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const worker = createMediaAnalysisWorker({ configured: true, structured: async () => { started(); await gate; return JSON.stringify({ summary: 'Late', transcript: '' }); } });
  const first = worker.processOne();
  await began;
  assert.equal(await worker.processOne(), false);
  await Media.deleteOne({ _id: asset._id });
  release();
  assert.equal(await first, true);
  assert.equal(await Media.countDocuments({ _id: asset._id }), 0);
});

test('twenty prior text versions are retained and project deletion cleans snapshots', async () => {
  const asset = (await upload('text/plain', 'history.txt', Buffer.from('Original'))).data;
  for (let version = 0; version < 22; version++) {
    const result = await call(`/projects/${project._id}/media/${asset._id}`, { method: 'PATCH', body: { content: `Version ${version + 1}`, version } });
    assert.equal(result.status, 200);
  }
  const revisions = (await call(`/projects/${project._id}/media/${asset._id}/revisions`)).data;
  assert.equal(revisions.length, 20);
  assert.equal(revisions[0].version, 21);
  assert.equal(revisions.at(-1).version, 2);
  assert.equal((await call(`/projects/${project._id}`, { method: 'DELETE' })).status, 204);
  assert.equal(await MediaRevision.countDocuments({ projectId: project._id }), 0);
  assert.equal(await Media.countDocuments({ projectId: project._id }), 0);
});
