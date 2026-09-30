import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/src/app.js';
import { GoogleChallenge, GoogleTokenExchange, User } from '../server/src/models.js';

const root = fileURLToPath(new URL('../', import.meta.url));
process.env.MONGOMS_DOWNLOAD_DIR = `${root}tmp/mongodb-binaries`;
const { MongoMemoryServer } = await import('mongodb-memory-server');
const firebaseConfig = { projectId: 'creatorforge-test', apiKey: 'test-web-api-key', authDomain: 'creatorforge-test.firebaseapp.com', appId: '1:123:web:test' };
const jwtSecret = 'google-test-only-secret-at-least-thirty-two-characters';
let database;
let base;
const servers = [];
async function start(options) {
  const server = createApp({ jwtSecret, ...options }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/api`;
}
before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'creatorforge-google-test' });
  await User.init();
  await GoogleChallenge.init();
  await GoogleTokenExchange.init();
  base = await start({ firebaseConfig, firebaseGoogleEnabled: true, verifyFirebaseCredential: async (credential) => {
    if (credential === 'invalid-signature') throw new Error('private verification diagnostics');
    return JSON.parse(credential);
  } });
});
after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  await mongoose.disconnect();
  if (database) await database.stop();
});
async function request(path, { method = 'GET', body, cookie, headers = {}, token, endpoint = base } = {}) {
  const response = await fetch(`${endpoint}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
async function challenge() {
  const result = await request('/auth/google/challenge', { method: 'POST', body: {}, headers: { 'X-CreatorForge-Google': '1', Origin: 'http://127.0.0.1:5173' } });
  assert.equal(result.status, 200);
  return { nonce: result.data.nonce, cookie: result.headers.get('set-cookie').split(';')[0], setCookie: result.headers.get('set-cookie') };
}
function claims(nonce, overrides = {}) {
  return { iss: `https://securetoken.google.com/${firebaseConfig.projectId}`, aud: firebaseConfig.projectId, exp: Math.floor(Date.now() / 1000) + 3600, auth_time: Math.floor(Date.now() / 1000), email_verified: true, email: 'google@example.com', sub: 'firebase-user-1', name: 'Google Creator', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [overrides.googleSub || 'google-subject-1'] } }, testTokenId: nonce, ...overrides };
}
async function googleLogin(session, overrides = {}, password) {
  return request('/auth/google', { method: 'POST', cookie: session.cookie, headers: { 'X-CreatorForge-Google': '1' }, body: { idToken: JSON.stringify(claims(session.nonce, overrides)), nonce: overrides.nonce || session.nonce, ...(password ? { password } : {}) } });
}

test('Google sign-in security and account compatibility', async (context) => {
  let googleUser;
  let localUser;
  let localProject;
  let consumedSession;
  let consumedToken;
  await context.test('Google remains disabled until Firebase configuration and explicit enabled flag are set', async () => {
    const endpoint = await start({});
    assert.deepEqual((await request('/auth/google/config', { endpoint })).data, { configured: false, firebase: null });
    assert.equal((await request('/auth/google', { endpoint, method: 'POST', body: { idToken: 'fake', nonce: 'fake' }, headers: { 'X-CreatorForge-Google': '1' } })).status, 503);
    for (const options of [{ firebaseConfig }, { firebaseGoogleEnabled: true }, { firebaseGoogleEnabled: true, firebaseConfig: { ...firebaseConfig, apiKey: '' } }]) {
      assert.equal((await request('/auth/google/config', { endpoint: await start(options) })).data.configured, false);
    }
    assert.deepEqual((await request('/auth/google/config')).data.firebase, firebaseConfig);
  });
  await context.test('sign-in initiation checks request marker and allowed origin', async () => {
    assert.equal((await request('/auth/google/challenge', { method: 'POST', body: {} })).status, 403);
    assert.equal((await request('/auth/google/challenge', { method: 'POST', body: {}, headers: { 'X-CreatorForge-Google': '1', Origin: 'https://attacker.example' } })).status, 403);
    const session = await challenge();
    assert.match(session.setCookie, /HttpOnly/);
    assert.match(session.setCookie, /SameSite=Lax/);
    assert.match(session.setCookie, /Path=\/api\/auth\/google/);
    assert.equal((await request('/auth/google', { method: 'POST', cookie: session.cookie, body: { credential: 'anything' } })).status, 403);
    assert.equal((await request('/auth/google', { method: 'POST', cookie: session.cookie, body: { credential: 'anything' }, headers: { 'X-CreatorForge-Google': '1', Origin: 'https://attacker.example' } })).status, 403);
  });
  await context.test('signed browser challenge is required', async () => {
    assert.equal((await request('/auth/google', { method: 'POST', body: { idToken: 'anything', nonce: 'anything' }, headers: { 'X-CreatorForge-Google': '1' } })).status, 401);
    assert.equal((await request('/auth/google', { method: 'POST', body: { idToken: 'anything', nonce: 'anything' }, cookie: 'creatorforge_google_challenge=forged', headers: { 'X-CreatorForge-Google': '1' } })).status, 401);
  });
  await context.test('reject wrong issuer, audience, expiry, nonce, unverified email and malformed claims', async () => {
    const session = await challenge();
    for (const override of [
      { iss: 'https://attacker.example' }, { aud: 'other-client' }, { exp: 1 }, { nonce: 'wrong' },
      { email_verified: false }, { email: 'not-an-email' }, { sub: '' },
      { auth_time: 1 }, { auth_time: Math.floor(Date.now() / 1000) + 120 }, { auth_time: undefined },
      { firebase: { sign_in_provider: 'password', identities: { 'google.com': ['google-subject-1'] } } },
      { firebase: { sign_in_provider: 'google.com', identities: {} } },
      { firebase: { sign_in_provider: 'google.com', identities: { 'google.com': 'not-an-array' } } },
      { firebase: { sign_in_provider: 'google.com', tenant: 'other-tenant', identities: { 'google.com': ['google-subject-1'] } } },
    ]) assert.equal((await googleLogin(session, override)).status, 401);
    assert.equal(await User.countDocuments({}), 0);
  });
  await context.test('provider verification failure is sanitized', async () => {
    const session = await challenge();
    const result = await request('/auth/google', { method: 'POST', cookie: session.cookie, headers: { 'X-CreatorForge-Google': '1' }, body: { idToken: 'invalid-signature', nonce: session.nonce } });
    assert.equal(result.status, 401);
    assert.doesNotMatch(result.data.error, /private verification/);
  });
  await context.test('real Admin verifier rejects unsigned tokens without exposing credentials', async () => {
    const endpoint = await start({ firebaseConfig, firebaseGoogleEnabled: true });
    const issued = await request('/auth/google/challenge', { endpoint, method: 'POST', body: {}, headers: { 'X-CreatorForge-Google': '1' } });
    const payload = Buffer.from(JSON.stringify(claims(issued.data.nonce))).toString('base64url');
    const idToken = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${payload}.`;
    const result = await request('/auth/google', { endpoint, method: 'POST', cookie: issued.headers.get('set-cookie').split(';')[0], headers: { 'X-CreatorForge-Google': '1' }, body: { idToken, nonce: issued.data.nonce } });
    assert.equal(result.status, 401);
    assert.equal(result.data.error, 'Google could not verify this sign-in. Please try again.');
  });
  await context.test('Firebase emulator cannot disable signature verification in a configured app', () => {
    const previous = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    try { assert.throws(() => createApp({ jwtSecret, firebaseConfig, firebaseGoogleEnabled: true }), /real Firebase token verification/); }
    finally { if (previous === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST; else process.env.FIREBASE_AUTH_EMULATOR_HOST = previous; }
  });
  await context.test('new Google identity receives the normal protected app session', async () => {
    consumedSession = await challenge();
    consumedToken = JSON.stringify(claims(consumedSession.nonce));
    const result = await request('/auth/google', { method: 'POST', cookie: consumedSession.cookie, headers: { 'X-CreatorForge-Google': '1' }, body: { idToken: consumedToken, nonce: consumedSession.nonce } });
    assert.equal(result.status, 200);
    googleUser = result.data;
    assert.ok(googleUser.token);
    assert.equal(googleUser.user.password, undefined);
    assert.equal(googleUser.user.googleSub, undefined);
    assert.equal((await User.findById(googleUser.user._id).select('+password')).password, undefined);
    assert.equal((await request('/auth/me', { token: googleUser.token })).data._id, googleUser.user._id);
    assert.equal((await request('/projects', { token: googleUser.token })).status, 200);
    assert.match(result.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  });
  await context.test('consumed challenge cannot replay a Google credential', async () => {
    assert.equal((await googleLogin(consumedSession)).status, 401);
  });
  await context.test('a consumed Firebase token cannot be reused with a new browser challenge', async () => {
    const session = await challenge();
    const result = await request('/auth/google', { method: 'POST', cookie: session.cookie, headers: { 'X-CreatorForge-Google': '1' }, body: { idToken: consumedToken, nonce: session.nonce } });
    assert.equal(result.status, 401);
    assert.equal(await User.countDocuments({}), 1);
  });
  await context.test('stable Google subject logs into the same account even if Google email changes', async () => {
    const result = await googleLogin(await challenge(), { email: 'new-email@example.com', sub: 'firebase-recreated-uid' });
    assert.equal(result.status, 200);
    assert.equal(result.data.user._id, googleUser.user._id);
    assert.equal(result.data.user.email, 'google@example.com');
    assert.equal(await User.countDocuments({}), 1);
    assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'google@example.com', password: 'any-password' } })).status, 401);
  });
  await context.test('email/password collision requires explicit password confirmation', async () => {
    localUser = (await request('/auth/register', { method: 'POST', body: { name: 'Local Creator', email: 'local@example.com', password: 'LocalPass123!' } })).data;
    localProject = (await request('/projects', { method: 'POST', token: localUser.token, body: { name: 'Existing project' } })).data;
    const session = await challenge();
    const identity = { email: 'local@example.com', sub: 'firebase-local-link', googleSub: 'google-local-link' };
    const blocked = await googleLogin(session, identity);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.code, 'ACCOUNT_LINK_REQUIRED');
    assert.equal((await User.findById(localUser.user._id).select('+googleSub')).googleSub, undefined);
    assert.equal((await googleLogin(session, identity, 'WrongPassword')).status, 401);
    assert.equal((await User.findById(localUser.user._id).select('+googleSub')).googleSub, undefined);
    const connected = await googleLogin(session, identity, 'LocalPass123!');
    assert.equal(connected.status, 200);
    assert.equal(connected.data.user._id, localUser.user._id);
    assert.equal((await request(`/projects/${localProject._id}`, { token: connected.data.token })).status, 200);
    assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'local@example.com', password: 'LocalPass123!' } })).status, 200);
  });
  await context.test('a different Google subject cannot claim an already-linked email', async () => {
    const result = await googleLogin(await challenge(), { email: 'local@example.com', googleSub: 'different-google-user' }, 'LocalPass123!');
    assert.equal(result.status, 409);
    assert.equal((await User.findById(localUser.user._id).select('+googleSub')).googleSub, 'google-local-link');
  });
  await context.test('expired stored challenge is rejected even before cookie expiry', async () => {
    const session = await challenge();
    await GoogleChallenge.updateMany({}, { $set: { expiresAt: new Date(0) } });
    assert.equal((await googleLogin(session)).status, 401);
  });
  await context.test('HTTPS deployments receive secure challenge cookies', async () => {
    const endpoint = await start({ firebaseConfig, firebaseGoogleEnabled: true, clientUrl: 'https://app.example.com' });
    const result = await request('/auth/google/challenge', { endpoint, method: 'POST', body: {}, headers: { 'X-CreatorForge-Google': '1', Origin: 'https://app.example.com' } });
    assert.equal(result.status, 200);
    assert.match(result.headers.get('set-cookie'), /Secure/);
    assert.match(result.headers.get('set-cookie'), /SameSite=None/);
    assert.match(result.headers.get('set-cookie'), /HttpOnly/);
  });
});


test('concurrent Google exchanges issue only one session per token or challenge', async () => {
  const endpoint = await start({ firebaseConfig, firebaseGoogleEnabled: true, verifyFirebaseCredential: async (token) => JSON.parse(token) });
  const initiate = async () => {
    const issued = await request('/auth/google/challenge', { endpoint, method: 'POST', body: {}, headers: { 'X-CreatorForge-Google': '1' } });
    return { nonce: issued.data.nonce, cookie: issued.headers.get('set-cookie').split(';')[0] };
  };
  const exchange = (session, token) => request('/auth/google', { endpoint, method: 'POST', cookie: session.cookie, headers: { 'X-CreatorForge-Google': '1' }, body: { idToken: token, nonce: session.nonce } });
  const a = await initiate();
  const b = await initiate();
  const token = JSON.stringify(claims(a.nonce, { email: 'concurrent@example.com', googleSub: 'concurrent-sub', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['concurrent-sub'] } } }));
  assert.deepEqual((await Promise.all([exchange(a, token), exchange(b, token)])).map((r) => r.status).sort(), [200, 401]);
  const c = await initiate();
  const first = JSON.stringify(claims(c.nonce, { email: 'concurrent@example.com', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['concurrent-sub'] } } }));
  const second = JSON.stringify({ ...JSON.parse(first), testTokenId: 'another-token' });
  assert.deepEqual((await Promise.all([exchange(c, first), exchange(c, second)])).map((r) => r.status).sort(), [200, 401]);
  assert.equal(await User.countDocuments({ googleSub: 'concurrent-sub' }), 1);
});
