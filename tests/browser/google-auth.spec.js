import { test, expect } from '@playwright/test';

const mockSdk = `export async function signInWithGoogle(config) { window.firebaseConfig = config; return 'test-firebase-id-token'; }`;

async function prepare(page, request, label) {
  const response = await request.post('/api/auth/register', { data: { name: 'Google Browser Test', email: `google-browser-${label}-${Date.now()}@example.com`, password: 'GoogleBrowser123!' } });
  expect(response.status()).toBe(201);
  const account = await response.json();
  await page.route('**/api/auth/google/config', (route) => route.fulfill({ json: { configured: true, firebase: { projectId: 'creatorforge-test', apiKey: 'test-key', authDomain: 'creatorforge-test.firebaseapp.com', appId: 'test-app' } } }));
  await page.route('**/src/firebase-google.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: mockSdk }));
  await page.route('**/api/auth/google/challenge', (route) => route.fulfill({ json: { nonce: 'test-browser-nonce' } }));
  return account;
}
test('configured Google button completes the existing app session flow with mocked Google services', async ({ page, request }, info) => {
  const account = await prepare(page, request, `signin-${info.project.name}`);
  await page.route('**/api/auth/google', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ idToken: 'test-firebase-id-token', nonce: 'test-browser-nonce' });
    expect(route.request().headers()['x-creatorforge-google']).toBe('1');
    await route.fulfill({ json: account });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: "Let's make something, Google." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('creatorforge.token'))).toBe(account.token);
});
test('Google email collision asks for password and preserves the same account', async ({ page, request }, info) => {
  const account = await prepare(page, request, `link-${info.project.name}`);
  await page.route('**/api/auth/google', async (route) => {
    const body = route.request().postDataJSON();
    if (!body.password) await route.fulfill({ status: 409, json: { code: 'ACCOUNT_LINK_REQUIRED', error: 'Confirm your password.' } });
    else { expect(body.password).toBe('GoogleBrowser123!'); await route.fulfill({ json: account }); }
  });
  await page.goto('/register');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByLabel('Existing account password')).toBeVisible();
  expect(await page.evaluate(() => window.firebaseConfig.projectId)).toBe('creatorforge-test');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `tmp/google-link-${info.project.name}.png`, fullPage: true });
  await page.getByLabel('Existing account password').fill('GoogleBrowser123!');
  await page.getByRole('button', { name: 'Connect Google securely' }).click();
  await expect(page.getByRole('heading', { name: "Let's make something, Google." })).toBeVisible();
});
test('Google SDK failure leaves email/password sign-in working', async ({ page, request }, info) => {
  const account = await prepare(page, request, `fallback-${info.project.name}`);
  await page.route('**/src/firebase-google.js*', (route) => route.abort());
  await page.goto('/login');
  await expect(page.getByRole('alert')).toContainText('Google sign-in could not load');
  await page.getByLabel('Email address').fill(account.user.email);
  await page.getByLabel('Password', { exact: true }).fill('GoogleBrowser123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: "Let's make something, Google." })).toBeVisible();
});
test('Firebase popup cancellation permits retry without creating an app session', async ({ page, request }, info) => {
  const account = await prepare(page, request, `cancel-${info.project.name}`);
  await page.route('**/src/firebase-google.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: `export async function signInWithGoogle() { throw Object.assign(new Error('cancelled'), { code: 'auth/popup-closed-by-user' }); }` }));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('alert')).toContainText('cancelled');
  expect(await page.evaluate(() => localStorage.getItem('creatorforge.token'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.getByLabel('Email address').fill(account.user.email);
  await page.getByLabel('Password', { exact: true }).fill('GoogleBrowser123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: "Let's make something, Google." })).toBeVisible();
});


test('blocked popup can be retried successfully', async ({ page, request }, info) => {
  const account = await prepare(page, request, `blocked-${info.project.name}`);
  await page.route('**/src/firebase-google.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: `let attempts = 0; export async function signInWithGoogle() { if (++attempts === 1) throw Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }); return 'retry-token'; }` }));
  await page.route('**/api/auth/google', (route) => route.fulfill({ json: account }));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('alert')).toContainText('blocked');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: "Let's make something, Google." })).toBeVisible();
});

test('expired linking identity is cleared and can restart', async ({ page, request }, info) => {
  await prepare(page, request, `expired-${info.project.name}`);
  await page.route('**/api/auth/google', (route) => route.fulfill(route.request().postDataJSON().password
    ? { status: 401, json: { error: 'Your Google sign-in session expired. Start Google sign-in again.' } }
    : { status: 409, json: { code: 'ACCOUNT_LINK_REQUIRED' } }));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByLabel('Existing account password').fill('GoogleBrowser123!');
  await page.getByRole('button', { name: 'Connect Google securely' }).click();
  await expect(page.getByRole('alert')).toContainText('expired');
  await expect(page.getByLabel('Existing account password')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('creatorforge.token'))).toBeNull();
});
