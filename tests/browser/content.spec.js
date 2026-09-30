import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function prepare(page, request, label) {
  const registration = await request.post('/api/auth/register', { data: { name: 'Content Creator', email: `content-${label}-${Date.now()}@example.com`, password: 'ContentPass123!' } });
  expect(registration.status()).toBe(201);
  const account = await registration.json();
  const headers = { Authorization: `Bearer ${account.token}` };
  const response = await request.post('/api/projects', { headers, data: { name: 'Saved content test' } });
  expect(response.status()).toBe(201);
  const project = await response.json();
  const uploaded = await request.post(`/api/projects/${project._id}/media`, { headers, multipart: { file: { name: 'draft.md', mimeType: 'text/markdown', buffer: Buffer.from('# Original draft\nReady to revise.') } } });
  expect(uploaded.status()).toBe(201);
  const asset = await uploaded.json();
  await page.addInitScript((token) => localStorage.setItem('creatorforge.token', token), account.token);
  await page.goto(`/project/${project._id}`);
  return { account, project, asset, headers };
}

test('a configured but paused AI connection gives an actionable setup message', async ({ page, request }, info) => {
  await page.route('**/api/health', (route) => route.fulfill({ json: { database: 'connected', aiConfigured: false, aiConfiguration: { enabled: false, keyPresent: true, modelPresent: true, model: 'gemini-test-model' } } }));
  const fixture = await prepare(page, request, `paused-${info.project.name}`);
  await expect(page.getByText('AI generation is paused.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Key and model configured/)).toBeVisible();
  await expect(page.getByText(/Produces editorial copy and outlines/)).toBeVisible();
  await request.delete(`/api/projects/${fixture.project._id}`, { headers: fixture.headers });
});

test('saved content edits survive reload and export exact Markdown and text bytes', async ({ page, request }, info) => {
  const fixture = await prepare(page, request, `persist-${info.project.name}`);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('button', { name: /draft.md TEXT/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Original draft' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Edit content', exact: true }).click();
  const edited = '# Saved creative direction\n\nA creator’s voice ✨\n';
  await dialog.getByLabel('Edit saved content').fill(edited);
  await expect(dialog.getByRole('button', { name: 'Download saved content' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByText('Saved to project', { exact: true })).toBeVisible();
  for (const format of ['markdown', 'text']) {
    await dialog.getByLabel('Export format').selectOption(format);
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download saved content' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(format === 'markdown' ? 'draft.md' : 'draft.txt');
    const path = resolve(`tmp/content-export-${info.project.name}-${format}.${format === 'markdown' ? 'md' : 'txt'}`);
    await file.saveAs(path);
    expect(await readFile(path, 'utf8')).toBe(edited);
  }
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: /draft.md TEXT/ }).click();
  await expect(page.getByRole('heading', { name: 'Saved creative direction' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(`tmp/content-editor-${info.project.name}.png`), fullPage: true });
  expect(errors).toEqual([]);
  await request.delete(`/api/projects/${fixture.project._id}`, { headers: fixture.headers });
});

test('concurrent edit conflict preserves the draft and lets the user reload saved content', async ({ page, request }, info) => {
  const fixture = await prepare(page, request, `conflict-${info.project.name}`);
  await page.getByRole('button', { name: /draft.md TEXT/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit content', exact: true }).click();
  await dialog.getByLabel('Edit saved content').fill('My unsaved draft');
  const changed = await request.patch(`/api/projects/${fixture.project._id}/media/${fixture.asset._id}`, { headers: fixture.headers, data: { content: '# Updated elsewhere', version: 0 } });
  expect(changed.status()).toBe(200);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByRole('alert')).toContainText('another session');
  await expect(dialog.getByLabel('Edit saved content')).toHaveValue('My unsaved draft');
  page.once('dialog', (confirmation) => confirmation.dismiss());
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await expect(dialog).toBeVisible();
  page.once('dialog', (confirmation) => confirmation.accept());
  await dialog.getByRole('button', { name: 'Reload saved version' }).click();
  await expect(dialog.getByRole('heading', { name: 'Updated elsewhere' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Download saved content' })).toBeEnabled();
  await request.delete(`/api/projects/${fixture.project._id}`, { headers: fixture.headers });
});

test('Studio drafts retain selected sources and notes after reload', async ({ page, request }, info) => {
  const fixture = await prepare(page, request, `studio-draft-${info.project.name}`);
  await page.getByRole('tab', { name: 'Agent Studio' }).click();
  await page.getByRole('button', { name: 'Omnichannel Repurposer', exact: true }).click();
  await page.getByLabel('Idea / source notes').fill('Adapt this source into clear, grounded posts.');
  await page.getByText('Reference sources (0)', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'draft.md', exact: true }).check();
  await page.getByRole('button', { name: 'Create draft', exact: true }).click();
  await expect(page.getByText('Saved · revision 0', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Agent Studio' }).click();
  await expect(page.getByLabel('Idea / source notes')).toHaveValue('Adapt this source into clear, grounded posts.');
  await page.getByText('Reference sources (1)', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'draft.md', exact: true })).toBeChecked();
  await request.delete(`/api/projects/${fixture.project._id}`, { headers: fixture.headers });
});

