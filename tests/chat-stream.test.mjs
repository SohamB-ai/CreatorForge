import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/src/app.js';
import { Message } from '../server/src/models.js';
import { createGenerator } from '../server/src/ai.js';
import { readChatStream } from '../client/src/chat-stream.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let database;
let directory;
let server;
let origin;
let owner;
let stranger;
let project;
let proceed;
let providerSignal;
let providerCalls = 0;
let provider = async function* () { yield '# First\n'; yield 'Second ✨'; };
const settings = { jwtSecret: 'stream-test-secret-at-least-thirty-two-characters', aiEnabled: true, geminiModel: 'gemini-test-provider', generateContent: async () => 'Legacy complete response', generateContentStream: request => { providerCalls++; providerSignal = request.config.abortSignal; return provider(request); } };
async function request(path, token = owner?.token, values, port = origin, signal) {
  return fetch(`${port}/api${path}`, { method: values ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: values ? JSON.stringify(values) : undefined, signal });
}
const send = (message = 'Create a caption.', signal) => request('/chat/stream', owner.token, { projectId: String(project._id), message }, origin, signal);
async function history() { return Message.find({ projectId: project._id }).sort({ createdAt: 1, _id: 1 }).lean(); }
async function eventually(check) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await check()) return; await pause(20); }
  assert.fail('Condition did not settle');
}
before(async () => {
  directory = await mkdtemp(`${root}tmp/chat-stream-api-`);
  database = await MongoMemoryServer.create({ instance: { dbPath: directory }, binary: { downloadDir: `${root}tmp/mongodb-binaries` } });
  await mongoose.connect(database.getUri(), { dbName: 'stream-test' });
  server = createApp(settings).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  owner = await (await request('/auth/register', null, { name: 'Owner', email: 'stream-owner@example.com', password: 'TestPassword123!' })).json();
  stranger = await (await request('/auth/register', null, { name: 'Stranger', email: 'stream-stranger@example.com', password: 'TestPassword123!' })).json();
  project = await (await request('/projects', owner.token, { name: 'Streaming fixture' })).json();
});
after(async () => {
  proceed?.();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('stream emits early chunks, locks the project and persists only completed messages', async () => {
  const gate = new Promise(resolve => { proceed = resolve; });
  provider = async function* () { yield '# First\n'; await gate; yield 'Second ✨'; };
  const response = await send();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  let first;
  const ready = new Promise(resolve => { first = resolve; });
  const updates = [];
  const operation = readChatStream(response.body, { onDelta(content) { updates.push(content); first(); } });
  await ready;
  assert.deepEqual(updates, ['# First\n']);
  assert.equal((await history()).length, 0);
  assert.equal((await request('/chat', owner.token, { projectId: project._id, message: 'Competing chat' })).status, 409);
  assert.equal((await send('Competing stream')).status, 409);
  proceed();
  const result = await operation;
  assert.equal(result.assistantMessage.content, '# First\nSecond ✨');
  assert.equal((await history()).length, 2);
  assert.equal((await history())[1].content, result.assistantMessage.content);
  assert.equal(providerSignal.aborted, false);
});
test('Stop aborts the provider, saves no partial history and releases the project lock', async () => {
  const baseline = (await history()).length;
  provider = async function* () { yield 'Partial draft'; await new Promise(() => {}); };
  const controller = new AbortController();
  const response = await send('Stop this', controller.signal);
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /Partial draft/);
  const cancelledSignal = providerSignal;
  controller.abort();
  await reader.cancel().catch(() => {});
  await eventually(() => cancelledSignal.aborted);
  assert.equal((await history()).length, baseline);
  provider = async function* () { yield 'Retry succeeded'; };
  await eventually(async () => {
    const retry = await send('Retry');
    if (retry.status === 409) { await retry.text(); return false; }
    assert.equal(retry.status, 200);
    const result = await readChatStream(retry.body, { onDelta() {} });
    assert.equal(result.assistantMessage.content, 'Retry succeeded');
    return true;
  });
  assert.equal((await history()).length, baseline + 2);
});
test('provider denial after partial text is sanitized and never logs out or persists', async () => {
  const baseline = (await history()).length;
  provider = async function* () { yield 'Partial'; throw Object.assign(new Error('private provider token'), { status: 403 }); };
  const response = await send('Provider denial');
  const data = await response.text();
  assert.match(data, /AI_ACCESS_DENIED/);
  assert.doesNotMatch(data, /private provider token|event: done/);
  assert.equal((await history()).length, baseline);
  assert.equal((await request('/auth/me')).status, 200);
});
test('stream preflight enforces authentication, ownership, input and explicit AI enablement', async () => {
  const calls = providerCalls;
  assert.equal((await request('/chat/stream', null, { projectId: project._id, message: 'Unauthorized' })).status, 401);
  assert.equal((await request('/chat/stream', stranger.token, { projectId: project._id, message: 'Wrong owner' })).status, 404);
  assert.equal((await send(' ')).status, 400);
  assert.equal((await request('/chat/stream', owner.token, { projectId: project._id, message: 'Injected', extra: true })).status, 400);
  const disabled = createApp({ ...settings, aiEnabled: false }).listen(0, '127.0.0.1');
  await new Promise(resolve => disabled.once('listening', resolve));
  try {
    const response = await request('/chat/stream', owner.token, { projectId: project._id, message: 'Disabled' }, `http://127.0.0.1:${disabled.address().port}`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'AI_NOT_CONFIGURED');
  } finally { await new Promise(resolve => disabled.close(resolve)); }
  assert.equal(providerCalls, calls);
});
test('stream timeout terminates a hung provider and permits a subsequent generation', async () => {
  const baseline = (await history()).length;
  provider = async function* () { yield 'Partial'; await new Promise(() => {}); };
  const timed = createApp({ ...settings, streamTimeoutMs: 200 }).listen(0, '127.0.0.1');
  await new Promise(resolve => timed.once('listening', resolve));
  const address = `http://127.0.0.1:${timed.address().port}`;
  try {
    const response = await request('/chat/stream', owner.token, { projectId: project._id, message: 'Timeout' }, address);
    const text = await response.text();
    assert.match(text, /AI_TIMEOUT/);
    assert.doesNotMatch(text, /event: done/);
    assert.equal((await history()).length, baseline);
    provider = async function* () { yield 'After timeout'; };
    const retry = await request('/chat/stream', owner.token, { projectId: project._id, message: 'Retry timeout' }, address);
    assert.equal((await readChatStream(retry.body, { onDelta() {} })).assistantMessage.content, 'After timeout');
  } finally { await new Promise(resolve => timed.close(resolve)); }
});
test('stream generator rejects empty, oversized, blocked and truncated provider responses', async () => {
  const input = { project: { name: 'Fixture' }, media: [], history: [], prompt: 'Fixture' };
  for (const chunks of [[], [' '], ['✨'.repeat(20001)], [{ text: 'Blocked', candidates: [{ finishReason: 'SAFETY' }] }], [{ text: 'Truncated' }], [{ text: 'Incomplete', candidates: [{ finishReason: 'MAX_TOKENS' }] }]]) {
    const generate = createGenerator({ ...settings, generateContentStream: async function* () { yield* chunks; } });
    await assert.rejects(async () => { for await (const text of generate.stream(generate.prepare(input))) assert.equal(typeof text, 'string'); });
  }
  const generate = createGenerator({ ...settings, generateContentStream: async function* () { yield { text: 'Complete', candidates: [{ finishReason: 'STOP' }] }; } });
  const chunks = [];
  for await (const text of generate.stream(generate.prepare(input))) chunks.push(text);
  assert.deepEqual(chunks, ['Complete']);
});
test('a partial database insert is rolled back and never emits a completed reply', async () => {
  const baseline = (await history()).length;
  const insertMany = Message.insertMany;
  provider = async function* () { yield 'Completed provider reply'; };
  Message.insertMany = async function (entries) {
    await insertMany.call(this, [entries[0]]);
    throw new Error('Private database diagnostics');
  };
  try {
    const response = await send('Failed persistence');
    const text = await response.text();
    assert.match(text, /event: error/);
    assert.doesNotMatch(text, /event: done|Private database diagnostics/);
    assert.equal((await history()).length, baseline);
  } finally { Message.insertMany = insertMany; }
});
test('disconnect during persistence rolls back only this request’s inserted messages', async () => {
  const service = createApp(settings).listen(0, '127.0.0.1');
  await new Promise(resolve => service.once('listening', resolve));
  const address = `http://127.0.0.1:${service.address().port}`;
  const baseline = (await history()).length;
  const insertMany = Message.insertMany;
  let entered;
  const inserting = new Promise(resolve => { entered = resolve; });
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  provider = async function* () { yield 'Finished but not committed'; };
  Message.insertMany = async function (entries) {
    entered();
    await gate;
    return insertMany.call(this, entries);
  };
  const controller = new AbortController();
  try {
    const response = await request('/chat/stream', owner.token, { projectId: project._id, message: 'Cancel during persistence' }, address, controller.signal);
    const reading = response.text().catch(() => 'Disconnected');
    await inserting;
    const signal = providerSignal;
    controller.abort();
    await eventually(() => signal.aborted);
    finish();
    await reading;
    await eventually(async () => {
      const response = await request('/chat', owner.token, { projectId: project._id, message: 'After rollback' }, address);
      if (response.status === 409) return false;
      assert.equal(response.status, 200);
      return true;
    });
    assert.equal((await history()).length, baseline + 2);
    assert.equal((await history()).at(-1).content, 'Legacy complete response');
  } finally {
    finish();
    Message.insertMany = insertMany;
    await new Promise(resolve => service.close(resolve));
  }
});
test('a large confirmed reply remains persisted when the client closes after done', async () => {
  const baseline = (await history()).length;
  const content = '✨'.repeat(20000);
  provider = async function* () { yield content.slice(0, 10000); yield content.slice(10000); };
  const service = createApp(settings).listen(0, '127.0.0.1');
  await new Promise(resolve => service.once('listening', resolve));
  try {
    const response = await request('/chat/stream', owner.token, { projectId: project._id, message: 'Boundary-size reply' }, `http://127.0.0.1:${service.address().port}`);
    const result = await readChatStream(response.body, { onDelta() {} });
    assert.equal(result.assistantMessage.content, content);
    await pause(30);
    assert.equal((await history()).length, baseline + 2);
    assert.equal((await history()).at(-1).content, content);
  } finally { await new Promise(resolve => service.close(resolve)); }
});
