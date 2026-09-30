import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerator } from '../server/src/ai.js';

const input = { project: { name: 'Test', description: '' }, brand: null, media: [], history: [], prompt: 'Create a caption.' };
test('AI requires explicit enablement and a configured model; there is no automatic model switch', async () => {
  let calls = 0;
  const generateContent = async (request) => { calls += 1; assert.equal(request.model, 'gemini-configured-model'); return 'Actual test-provider response'; };
  for (const options of [{ geminiModel: 'gemini-configured-model', generateContent }, { aiEnabled: true, generateContent }, { aiEnabled: true, geminiModel: 'invalid-model', generateContent }, { aiEnabled: true, geminiModel: 'gemini-configured-model' }, { aiEnabled: false, geminiModel: 'gemini-configured-model', geminiApiKey: 'placeholder' }]) {
    const generate = createGenerator(options);
    assert.equal(generate.configured, false);
    await assert.rejects(generate(input), { status: 503 });
  }
  assert.equal(calls, 0);
  const generate = createGenerator({ aiEnabled: true, geminiModel: 'gemini-configured-model', generateContent });
  assert.equal(generate.configured, true);
  assert.equal(await generate(input), 'Actual test-provider response');
  assert.equal(calls, 1);
});
test('empty or failed providers never produce invented content and the chosen model never falls back', async () => {
  for (const generateContent of [async () => { throw new Error('private key diagnostics'); }, async () => '']) {
    const generate = createGenerator({ aiEnabled: true, geminiModel: 'gemini-user-selected', generateContent });
    await assert.rejects(generate(input), (failure) => failure.status === 503 && !failure.message.includes('private key'));
  }
});
