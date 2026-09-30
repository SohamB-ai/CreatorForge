import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../server/src/app.js';
import { CreatorProfile, Message, Project } from '../../server/src/models.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
let directory;
let database;
let server;
let origin;
let captured;
test.beforeAll(async () => {
  directory = await mkdtemp(`${root}tmp/onboarding-browser-`);
  database = await MongoMemoryServer.create({ instance: { dbPath: directory }, binary: { downloadDir: `${root}tmp/mongodb-binaries` } });
  await mongoose.connect(database.getUri(), { dbName: 'onboarding-browser-test' });
  await CreatorProfile.init();
  server = createApp({ jwtSecret: 'onboarding-browser-secret-at-least-thirty-two-characters', aiEnabled: true, geminiModel: 'gemini-test-provider', generateContentStream: async function* (request) { captured = request; yield '# Specialist fixture\n\n'; yield 'An isolated test-provider response.'; } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function accountPage(page, info, label, profile) {
  const account = await (await fetch(`${origin}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Creator', email: `${label}-${info.project.name}@example.com`, password: 'BrowserTest123!' }) })).json();
  if (profile) await fetch(`${origin}/api/onboarding`, { method: 'PUT', headers: { Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
  await page.route('**/api/**', async route => {
    const address = new URL(route.request().url());
    const target = `${origin}${address.pathname}${address.search}`;
    if (address.pathname === '/api/chat/stream') return route.continue({ url: target });
    const response = await route.fetch({ url: target });
    await route.fulfill({ response });
  });
  await page.addInitScript(token => localStorage.setItem('creatorforge.token', token), account.token);
  return account;
}

test('multi-profession onboarding combines skills, switches collections and creates a specialist project', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const account = await accountPage(page, info, 'combined');
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Personalize my workspace' }).click();
  await expect(page.getByRole('heading', { name: 'What do you do?', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  for (const name of [/^Content creator/, /^Student/, /^Designer/]) await page.getByRole('checkbox', { name }).check();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${root}tmp/onboarding-role-${info.project.name}.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How can CreatorForge help you?', exact: true })).toBeFocused();
  await page.getByRole('checkbox', { name: /^Audio → Blog post/ }).check();
  await page.getByRole('checkbox', { name: /^Text brief → Image prompt/ }).check();
  await page.getByLabel(/Anything else we should know/).fill('Podcast work alongside my studies. ✨');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Student/ })).toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Audio → Blog post/ })).toBeChecked();
  await page.getByRole('button', { name: 'Explore my skills' }).click();
  await expect(page).toHaveURL(/\/skills$/);
  expect((await CreatorProfile.findOne({ userId: account.user._id })).professions).toEqual(['creator', 'student', 'designer']);
  await page.getByRole('button', { name: 'Student', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No skills supplied for this profession yet.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2 skills together' })).toBeVisible();
  await page.getByRole('button', { name: 'All my professions', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('.skill-card-body').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${root}tmp/skills-library-${info.project.name}.png`, fullPage: true, animations: 'disabled' });
  await page.getByLabel('Project name', { exact: true }).fill('Multi-profession campaign');
  await page.getByLabel(/Project brief/).fill('A quiet studio in morning sunlight. A warm editorial style.');
  await page.getByRole('button', { name: 'Create project with skills' }).click();
  await expect(page).toHaveURL(/\/project\//);
  const project = await Project.findOne({ userId: account.user._id });
  expect(project.skillIds).toEqual(['audio-blog', 'image-prompt']);
  await page.getByLabel('Active project skill').selectOption('audio-blog');
  await expect(page.getByRole('button', { name: 'Run Audio Blog Editor' })).toBeDisabled();
  await page.getByLabel('Active project skill').selectOption('image-prompt');
  await page.getByRole('button', { name: 'Run Image Prompt Writer' }).click();
  await expect(page.getByRole('heading', { name: 'Specialist fixture' })).toBeVisible();
  expect(captured.config.systemInstruction).toContain('Image Prompt Writer');
  expect(await Message.countDocuments({ projectId: project._id })).toBe(2);
  await page.getByRole('button', { name: 'Save response to library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Response saved to library', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Active project skill')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Specialist fixture' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('link', { name: 'Edit preferences' }).click();
  await expect(page.getByRole('checkbox', { name: /^Student/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test('shared skills are deduplicated and adding to an existing project keeps its original skills', async ({ page }, info) => {
  const account = await accountPage(page, info, 'shared', { professions: ['creator', 'marketer', 'designer'], skillIds: [], workflow: '', roleDetail: '' });
  const project = await Project.create({ userId: account.user._id, name: 'Existing client campaign', skillIds: ['image-prompt'] });
  await page.goto(`/skills?project=${project._id}`);
  await expect(page.getByRole('checkbox', { name: /Audio → Blog post/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Marketer', exact: true }).click();
  await page.getByRole('checkbox', { name: /Audio → Blog post/ }).check();
  await page.getByRole('button', { name: 'Content creator', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Audio → Blog post/ })).toBeChecked();
  await page.getByRole('button', { name: 'Add skills to project' }).click();
  await expect(page).toHaveURL(new RegExp(`/project/${project._id}$`));
  expect((await Project.findById(project._id)).skillIds).toEqual(['image-prompt', 'audio-blog']);
});

test('custom professions require detail and Skip never creates a profile', async ({ page }, info) => {
  const account = await accountPage(page, info, 'skip');
  await page.goto('/onboarding');
  await page.getByRole('checkbox', { name: /^Something else/ }).check();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.getByLabel('Tell us what you do').fill('Podcast producer');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/their skills aren’t available yet/)).toBeVisible();
  await page.getByRole('link', { name: 'Skip for now' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await CreatorProfile.countDocuments({ userId: account.user._id })).toBe(0);
});

test('failed saving retains answers for retry instead of pretending onboarding completed', async ({ page }, info) => {
  await accountPage(page, info, 'retry');
  await page.goto('/onboarding');
  await page.getByRole('checkbox', { name: /^Designer/ }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('checkbox', { name: /^Text brief → Image prompt/ }).check();
  await page.route('**/api/onboarding', async route => {
    if (route.request().method() === 'PUT') return route.fulfill({ status: 503, json: { error: 'Preferences are temporarily unavailable.' } });
    await route.fallback();
  });
  await page.getByRole('button', { name: 'Explore my skills' }).click();
  await expect(page.getByRole('alert')).toContainText('Preferences are temporarily unavailable.');
  await expect(page.getByRole('checkbox', { name: /^Text brief → Image prompt/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Explore my skills' })).toBeEnabled();
});

test('failed loading blocks profile editing and unconfigured skill access offers setup', async ({ page }, info) => {
  await accountPage(page, info, 'load');
  await page.goto('/skills');
  await expect(page.getByRole('link', { name: 'Set up my professions' })).toBeVisible();
  await page.route('**/api/onboarding', route => route.fulfill({ status: 503, json: { error: 'Cannot load preferences.' } }));
  await page.goto('/onboarding');
  await expect(page.getByRole('alert')).toContainText('Cannot load preferences.');
  await expect(page.getByRole('checkbox', { name: /^Content creator/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reload preferences' })).toBeVisible();
});

test('onboarding and skill library remain protected by the existing sign-in flow', async ({ page }) => {
  for (const route of ['/onboarding', '/skills']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  }
});
