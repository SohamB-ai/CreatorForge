import { test, expect } from '@playwright/test';
const agents = [{
  id: 'long-form-script',
  title: 'YouTube long-form',
  stages: ['angles', 'outline', 'script']
}, {
  id: 'reels-script',
  title: 'Reels / Shorts',
  stages: ['angles', 'script']
}, {
  id: 'hook-lab',
  title: 'Hook & Title Lab',
  stages: ['hooks']
}, {
  id: 'repurpose-engine',
  title: 'Omnichannel Repurposer',
  stages: ['x', 'linkedin', 'newsletter']
}];
for (const agent of agents) test(`Studio ${agent.title} supports editing and reload recovery`, async ({
  page,
  request
}, info) => {
  const account = await (await request.post('/api/auth/register', {
    data: {
      name: 'Studio Creator',
      email: `studio-${agent.id}-${info.project.name}-${Date.now()}@example.com`,
      password: 'StudioPass123!'
    }
  })).json();
  const headers = {
    Authorization: `Bearer ${account.token}`
  };
  const project = await (await request.post('/api/projects', {
    headers,
    data: {
      name: 'Studio browser test'
    }
  })).json();
  let saved = null;
  let sequence = 0;
  await page.route('**/api/projects/*/studio/**', async route => {
    const req = route.request(),
      url = new URL(req.url()),
      body = req.postDataJSON();
    let data;
    if (url.pathname.endsWith('/catalog')) data = agents;else if (url.pathname.endsWith('/revisions')) data = [];else if (url.pathname.endsWith('/runs') && req.method() === 'GET') data = saved ? [saved] : [];else if (url.pathname.endsWith('/runs')) {
      saved = {
        ...body,
        _id: 'browser-run',
        revision: 0,
        artifacts: {},
        assets: {},
        stale: [],
        selectedAngle: -1,
        outlineApproved: false,
        brand: {}
      };
      data = saved;
    } else if (url.pathname.endsWith('/generate')) {
      const stage = body.stage;
      const a = saved.artifacts;
      if (stage === 'angles') a.angles = {
        angles: Array.from({
          length: 3
        }, (_, i) => ({
          title: `Angle ${i}`,
          hook: `Opening ${i}`
        }))
      };
      if (stage === 'outline') a.outline = {
        chapters: [{
          title: 'Premise',
          summary: 'Explain the premise.'
        }]
      };
      if (stage === 'script') a.script = {
        completedChapters: 1,
        scenes: [{
          id: 'scene-one',
          spoken: 'A concrete opening.',
          visual: 'Show the evidence.',
          onScreen: 'Evidence',
          markers: ['Hook'],
          loopId: '',
          start: 0,
          end: 2
        }]
      };
      if (stage === 'hooks') a.hooks = {
        hooks: Array.from({
          length: 10
        }, (_, i) => ({
          category: 'Curiosity',
          text: `Hook ${i}`
        })),
        titles: Array.from({
          length: 5
        }, (_, i) => ({
          title: `Title ${i}`,
          thumbnail: 'Visual concept'
        }))
      };
      if (['x', 'linkedin', 'newsletter'].includes(stage)) a[stage] = {
        content: `Generated ${stage} copy.`
      };
      saved.revision++;
      if (stage === 'audit') saved.audit = {
        revision: saved.revision,
        checks: [],
        findings: [{
          category: 'clarity',
          target: 'scene-one',
          evidence: 'Opening is vague.',
          suggestion: 'Add a specific example.'
        }]
      };
      data = saved;
    } else if (req.method() === 'PATCH') {
      if (body.draft) Object.assign(saved, body.draft);
      if (body.selectedAngle !== undefined) saved.selectedAngle = body.selectedAngle;
      if (body.outline) saved.artifacts.outline = body.outline;
      if (body.approveOutline) saved.outlineApproved = true;
      if (body.scenes) saved.artifacts.script.scenes = body.scenes;
      if (body.hooks) saved.artifacts.hooks = body.hooks;
      if (body.outputs) Object.assign(saved.artifacts, body.outputs);
      saved.revision++;
      data = saved;
    } else data = saved;
    sequence++;
    await route.fulfill({
      json: JSON.parse(JSON.stringify(data))
    });
  });
  await page.addInitScript(token => localStorage.setItem('creatorforge.token', token), account.token);
  await page.goto(`/project/${project._id}`);
  await page.getByRole('tab', {
    name: 'Agent Studio'
  }).click();
  await page.getByRole('button', {
    name: agent.title,
    exact: true
  }).click();
  await page.getByLabel('Idea / source notes').fill('Explain useful creative workflows.');
  await page.getByRole('button', {
    name: 'Create draft',
    exact: true
  }).click();
  await expect(page.getByText('Saved · revision 0', {
    exact: true
  })).toBeVisible();
  if (agent.id === 'long-form-script' || agent.id === 'reels-script') {
    await page.getByRole('button', {
      name: 'Generate angles / hooks',
      exact: true
    }).click();
    await page.getByRole('radio').first().click();
    await expect(page.getByRole('radio').first()).toBeChecked();
    if (agent.id === 'long-form-script') {
      await page.getByRole('button', {
        name: 'Generate outline',
        exact: true
      }).click();
      await page.getByRole('button', {
        name: 'Approve outline',
        exact: true
      }).click();
    }
    await page.getByRole('button', {
      name: 'Generate / resume script',
      exact: true
    }).click();
    await page.getByRole('textbox', {
      name: 'spoken',
      exact: true
    }).fill('Edited precise narration.');
  } else if (agent.id === 'hook-lab') {
    await page.getByRole('button', {
      name: 'Generate hooks & titles',
      exact: true
    }).click();
    await page.getByRole('textbox', {
      name: 'Curiosity',
      exact: true
    }).first().fill('Edited specific hook.');
  } else {
    await page.getByRole('button', {
      name: 'Generate x',
      exact: true
    }).click();
    await page.getByRole('button', {
      name: 'Generate linkedin',
      exact: true
    }).click();
    await page.getByRole('button', {
      name: 'Generate newsletter',
      exact: true
    }).click();
    await page.getByRole('textbox', {
      name: 'Edit x',
      exact: true
    }).fill('Edited grounded thread.');
  }
  await page.getByRole('button', {
    name: 'Save changes',
    exact: true
  }).click();
  await expect(page.getByText(/Saved · revision/)).toBeVisible();
  await page.getByRole('button', {
    name: 'Run audit again',
    exact: true
  }).click();
  await expect(page.getByText('Add a specific example.', {
    exact: true
  })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', {
    name: 'Agent Studio'
  }).click();
  await expect(page.getByLabel('Idea / source notes')).toHaveValue('Explain useful creative workflows.');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `tmp/studio-${agent.id}-${info.project.name}.png`,
    fullPage: true
  });
  expect(sequence).toBeGreaterThan(5);
  await request.delete(`/api/projects/${project._id}`, {
    headers
  });
});
