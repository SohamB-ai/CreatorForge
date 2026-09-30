import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = { ...process.env, MONGODB_URI: 'mongodb+srv://deployment-user:example-password@cluster.example.com/creatorforge', JWT_SECRET: 'deployment-test-secret-at-least-thirty-two-characters', CLIENT_URL: 'https://creatorforge.example.com', VITE_API_URL: 'https://api.example.com/api', AI_GENERATION_ENABLED: 'false', GEMINI_API_KEY: '', GEMINI_MODEL: '' };
function check(values = {}) { return spawnSync(process.execPath, ['scripts/check-deployment.mjs'], { cwd: root, env: { ...baseline, ...values }, encoding: 'utf8' }); }
test('deployment preflight is offline, permits disabled AI and never prints secrets', () => {
  const result = check();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /AI generation intentionally disabled/);
  assert.doesNotMatch(result.stdout, /example-password|deployment-test-secret/);
});
test('deployment preflight rejects local/missing destinations and incomplete enabled AI', () => {
  for (const values of [{ MONGODB_URI: '' }, { MONGODB_URI: 'mongodb://127.0.0.1:27017/creatorforge' }, { JWT_SECRET: 'replace_with_example' }, { CLIENT_URL: 'http://127.0.0.1:5173' }, { VITE_API_URL: '' }, { VITE_API_URL: 'https://api.example.com' }, { AI_GENERATION_ENABLED: 'true', GEMINI_MODEL: '', GEMINI_API_KEY: 'never-print-this-key' }]) {
    const result = check(values);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /NEEDS SETUP/);
    assert.doesNotMatch(result.stdout, /never-print-this-key/);
  }
});
