import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../server/src/app.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
let database;
let directory;
let server;
let origin;
test.beforeAll(async () => {
  directory = await mkdtemp(`${root}tmp/chat-save-browser-`);
  database = await MongoMemoryServer.create({ instance: { dbPath: directory }, binary: { downloadDir: `${root}tmp/mongodb-binaries` } });
  await mongoose.connect(database.getUri(), { dbName: 'chat-save-browser-test' });
  server = createApp({ jwtSecret: 'browser-chat-save-test-secret-at-least-thirty-two-characters', aiEnabled: true, geminiModel: 'gemini-test-provider', generateContentStream: async function* () { yield '# Generated campaign\n\n'; yield 'A test-only creative response. ✨'; } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});
test('chat responses save to the library, edit, export and retain saved state after reload', async ({ page }, info) => {
  const registered = await fetch(`${origin}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Chat Creator', email: `chat-${info.project.name}@example.com`, password: 'BrowserTest123!' }) });
  const account = await registered.json();
  const headers = { Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' };
  const created = await fetch(`${origin}/api/projects`, { method: 'POST', headers, body: JSON.stringify({ name: 'Chat save browser fixture' }) });
  const project = await created.json();
  await page.route('**/api/**', async route => {
    const address = new URL(route.request().url());
    const response = await route.fetch({ url: `${origin}${address.pathname}${address.search}` });
    await route.fulfill({ response });
  });
  await page.addInitScript(token => localStorage.setItem('creatorforge.token', token), account.token);
  await page.goto(`/project/${project._id}`);
  await page.getByLabel('Message CreatorForge').fill('Write a launch campaign.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('heading', { name: 'Generated campaign' })).toBeVisible();
  await page.getByRole('button', { name: 'Save response to library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Response saved to library', exact: true })).toBeDisabled();
  const asset = page.getByRole('button', { name: /^Saved AI response.md TEXT/ });
  await expect(asset).toBeVisible();
  await asset.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit content', exact: true }).click();
  const edited = '# Edited campaign\n\nReady to publish. ✨\n';
  await dialog.getByLabel('Edit saved content').fill(edited);
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog.getByText('Saved to project', { exact: true })).toBeVisible();
  for (const format of ['markdown', 'text']) {
    await dialog.getByLabel('Export format').selectOption(format);
    const pending = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download saved content' }).click();
    const download = await pending;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString('utf8')).toBe(edited);
  }
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Response saved to library', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Generated campaign' })).toBeVisible();
  await page.screenshot({ path: `${root}tmp/chat-save-${info.project.name}.png`, fullPage: true });
  await asset.click();
  await expect(dialog.getByRole('heading', { name: 'Edited campaign' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Remove Saved AI response.md', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save response to library', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save response to library', exact: true }).click();
  await expect(asset).toBeVisible();
});
