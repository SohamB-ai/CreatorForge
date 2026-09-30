import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readChatStream } from '../client/src/chat-stream.js';

const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const completed = content => ({ userMessage: { _id: 'user-id', role: 'user', content: 'Prompt' }, assistantMessage: { _id: 'model-id', role: 'model', content } });
const body = chunks => new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
const encoded = text => new TextEncoder().encode(text);

test('SSE parser preserves UTF-8 across every byte boundary, CRLF and heartbeats', async () => {
  const text = '# Caption\n\nHello ✨ café';
  const data = encoded((': heartbeat\n\n' + frame('delta', { text: '# Caption\n\n' }) + frame('delta', { text: 'Hello ✨ café' }) + frame('done', completed(text))).replaceAll('\n', '\r\n'));
  const updates = [];
  const result = await readChatStream(body(Array.from(data, byte => Uint8Array.of(byte))), { onDelta: content => updates.push(content) });
  assert.equal(result.assistantMessage.content, text);
  assert.deepEqual(updates, ['# Caption\n\n', text]);
});
test('SSE parser rejects failed, malformed, truncated and unconfirmed replies', async () => {
  for (const text of [
    frame('delta', { text: 'Partial' }),
    frame('error', { error: 'Safe provider error' }),
    'event: delta\ndata: bad-json\n\n',
    frame('delta', { text: 7 }),
    frame('delta', null),
    frame('unknown', {}),
    frame('done', completed('No deltas')),
    frame('delta', { text: 'Draft' }) + frame('done', completed('Different saved text')),
    frame('delta', { text: '✨'.repeat(20001) }),
  ]) await assert.rejects(readChatStream(body([encoded(text)]), { onDelta() {} }));
});
test('SSE parser cancels its reader on Stop even while waiting for bytes', async () => {
  const controller = new AbortController();
  let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  const operation = readChatStream(stream, { signal: controller.signal, onDelta() {} });
  controller.abort();
  await assert.rejects(operation, { name: 'AbortError' });
  assert.equal(cancelled, true);
});
test('Stop does not wait for an unresponsive transport cancellation', async () => {
  const controller = new AbortController();
  const stream = new ReadableStream({ cancel() { return new Promise(() => {}); } });
  const operation = readChatStream(stream, { signal: controller.signal, onDelta() {} });
  controller.abort();
  let deadline;
  try {
    await assert.rejects(Promise.race([operation, new Promise((resolve, reject) => { deadline = setTimeout(() => reject(new Error('Stop waited for transport cleanup')), 500); })]), { name: 'AbortError' });
  } finally { clearTimeout(deadline); }
});
test('a confirmed reply does not wait for transport cancellation cleanup', async () => {
  const text = 'Confirmed reply';
  const stream = new ReadableStream({ start(controller) { controller.enqueue(encoded(frame('delta', { text }) + frame('done', completed(text)))); }, cancel() { return new Promise(() => {}); } });
  let deadline;
  try {
    const result = await Promise.race([readChatStream(stream, { onDelta() {} }), new Promise((resolve, reject) => { deadline = setTimeout(() => reject(new Error('Completion waited for transport cleanup')), 500); })]);
    assert.equal(result.assistantMessage.content, text);
  } finally { clearTimeout(deadline); }
});
