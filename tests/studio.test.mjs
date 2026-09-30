import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../server/src/app.js';
import { Media, Project } from '../server/src/models.js';
import { StudioRun, StudioRevision, StudioRequest } from '../server/src/studio-models.js';
import { timeScenes, checks } from '../server/src/studio-artifacts.js';
process.env.RATE_LIMIT_AI = '1000';
let db, server, base, token, other, project, run;
let mode = '',
  calls = 0,
  gate,
  scriptCalls = 0;
const scene = {
  spoken: 'A clear opening with evidence.',
  visual: 'Show the source document.',
  onScreen: 'Evidence',
  markers: ['Hook'],
  loopId: ''
};
async function req(path, method = 'GET', body, auth = token) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return {
    status: r.status,
    data: r.status === 204 ? null : r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text()
  };
}
const root = () => `/projects/${project._id}/studio`;
const path = () => `${root()}/runs/${run._id}`;
async function create(agentId = 'long-form-script') {
  const r = await req(`${root()}/runs`, 'POST', {
    agentId,
    brief: 'Explain sustainable creative workflows.',
    duration: agentId === 'reels-script' ? 30 : 480,
    sourceIds: [],
    overrides: {
      tone: '',
      hook: '',
      pacing: '',
      cta: ''
    }
  });
  assert.equal(r.status, 201);
  run = r.data;
  return run;
}
async function generate(stage, extra = {}) {
  const r = await req(`${path()}/generate`, 'POST', {
    revision: run.revision,
    requestId: randomUUID(),
    stage,
    ...extra
  });
  if (r.status === 200) run = r.data;
  return r;
}
async function patch(body) {
  const r = await req(path(), 'PATCH', {
    revision: run.revision,
    ...body
  });
  if (r.status === 200) run = r.data;
  return r;
}
before(async () => {
  db = await MongoMemoryServer.create({
    binary: {
      downloadDir: new URL('../tmp/mongodb-binaries', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
    }
  });
  await mongoose.connect(db.getUri());
  await Promise.all([Media.init(), StudioRequest.init()]);
  server = createApp({
    jwtSecret: 'studio-test-secret-with-at-least-thirty-two-characters',
    aiEnabled: true,
    geminiModel: 'gemini-test',
    generateContent: async request => {
      calls++;
      if (gate) await gate;
      if (mode === 'quota') throw {
        status: 429
      };
      if (mode === 'invalid') return 'invalid';
      if (mode === 'repair' && calls % 2 === 1) return '{}';
      if (mode === 'truncated') return {
        text: '{}',
        candidates: [{
          finishReason: 'MAX_TOKENS'
        }]
      };
      const stage = request.contents.at(-1).parts[0].text.match(/Stage: (\w+)/)?.[1];
      if (stage === 'angles') return JSON.stringify({
        angles: Array.from({
          length: 3
        }, (_, i) => ({
          title: `Angle ${i}`,
          hook: `Hook ${i}`
        }))
      });
      if (stage === 'outline') return JSON.stringify({
        chapters: [{
          title: 'Chapter one',
          summary: 'Explain the premise.'
        }, {
          title: 'Chapter two',
          summary: 'Show the payoff.'
        }]
      });
      if (stage === 'script' && mode === 'chapter' && ++scriptCalls === 2) throw {
        status: 429
      };
      if (stage === 'script') return JSON.stringify({
        scenes: [scene]
      });
      if (stage === 'hooks') return JSON.stringify({
        hooks: Array.from({
          length: 10
        }, (_, i) => ({
          category: 'curiosity',
          text: `Hook ${i}`
        })),
        titles: Array.from({
          length: 5
        }, (_, i) => ({
          title: `Title ${i}`,
          thumbnail: 'Show the result.'
        }))
      });
      if (stage === 'audit') return JSON.stringify({
        findings: [{
          category: 'clarity',
          target: 'script',
          evidence: 'Opening needs a concrete example.',
          suggestion: 'Name one example.'
        }]
      });
      return JSON.stringify({
        content: `# ${stage}\nGrounded source adaptation.`
      });
    }
  }).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  token = (await req('/auth/register', 'POST', {
    name: 'Creator',
    email: 'studio@example.com',
    password: 'Password123!'
  }, '')).data.token;
  other = (await req('/auth/register', 'POST', {
    name: 'Other',
    email: 'other-studio@example.com',
    password: 'Password123!'
  }, '')).data.token;
  project = (await req('/projects', 'POST', {
    name: 'Studio project'
  })).data;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise(r => server.close(r));
  await mongoose.disconnect();
  await db?.stop();
});
test('catalog is available without assigning a profession and private to project owner', async () => {
  assert.equal((await req(`${root()}/catalog`)).data.length, 4);
  assert.equal((await req(`${root()}/catalog`, 'GET', undefined, other)).status, 404);
});
test('long-form enforces approval order and saves chapter output plus export', async () => {
  await create();
  assert.equal((await generate('script')).status, 400);
  assert.equal((await generate('angles')).status, 200);
  await patch({
    selectedAngle: 1
  });
  await generate('outline');
  assert.equal((await generate('script')).status, 400);
  await patch({
    approveOutline: true
  });
  assert.equal((await generate('script')).status, 200);
  assert.equal(run.artifacts.script.scenes.length, 2);
  assert.equal(new Set(run.artifacts.script.scenes.map(s => s.id)).size, 2);
  const asset = await Media.findById(run.assets.script);
  assert.equal(String(asset.studioRunId), run._id);
  assert.equal((await req(`/projects/${project._id}/media/${asset._id}/export?format=markdown`)).status, 200);
  assert.equal((await req(`/projects/${project._id}/media/${asset._id}`, 'PATCH', {
    version: 0,
    content: 'Overwrite'
  })).status, 409);
});
test('audit is attached to exact revision and scene editing invalidates it', async () => {
  await generate('audit');
  assert.equal(run.audit.revision, run.revision);
  const before = run.artifacts.script.scenes[1];
  await patch({
    scenes: run.artifacts.script.scenes.map((s, i) => i ? s : {
      ...s,
      spoken: 'A better opening.'
    })
  });
  assert.notEqual(run.audit.revision, run.revision);
  assert.equal(run.artifacts.script.scenes[1].id, before.id);
  assert.equal(run.artifacts.script.scenes[1].spoken, before.spoken);
});
test('one-scene regeneration preserves neighboring scenes and identity', async () => {
  const first = run.artifacts.script.scenes[0],
    second = run.artifacts.script.scenes[1];
  assert.equal((await generate('script', {
    sceneId: first.id
  })).status, 200);
  assert.equal(run.artifacts.script.scenes[0].id, first.id);
  assert.equal(run.artifacts.script.scenes[1].spoken, second.spoken);
});
test('successful generation retries deduplicate and stale drafts are rejected', async () => {
  const body = {
    revision: run.revision,
    requestId: randomUUID(),
    stage: 'audit'
  };
  const first = await req(`${path()}/generate`, 'POST', body);
  const count = calls;
  const second = await req(`${path()}/generate`, 'POST', body);
  assert.equal(first.data.revision, second.data.revision);
  assert.equal(calls, count);
  assert.equal((await req(path(), 'PATCH', {
    revision: body.revision,
    approveOutline: true
  })).status, 409);
  run = first.data;
});
test('concurrent retries share a single generation', async () => {
  let release;
  gate = new Promise(r => {
    release = r;
  });
  const body = {
    revision: run.revision,
    requestId: randomUUID(),
    stage: 'audit'
  };
  const first = req(`${path()}/generate`, 'POST', body);
  const second = req(`${path()}/generate`, 'POST', body);
  await new Promise(r => setTimeout(r, 50));
  release();
  const responses = await Promise.all([first, second]);
  gate = null;
  assert(responses.every(r => r.status === 200));
  assert.equal(responses[0].data.revision, responses[1].data.revision);
  run = responses[0].data;
});
test('revision restoration keeps ownership and updates exports', async () => {
  const previous = run.revision;
  await patch({
    scenes: run.artifacts.script.scenes.map(s => ({
      ...s,
      spoken: 'Changed narration.'
    }))
  });
  const r = await req(`${path()}/restore`, 'POST', {
    revision: run.revision,
    restoreRevision: previous
  });
  assert.equal(r.status, 200);
  run = r.data;
  assert.notEqual(run.artifacts.script.scenes[0].spoken, 'Changed narration.');
  assert.equal((await req(path(), 'GET', undefined, other)).status, 404);
});
test('upstream changes preserve downstream output and mark it outdated', async () => {
  const script = run.artifacts.script;
  await patch({
    selectedAngle: 0
  });
  assert.deepEqual(run.artifacts.script, script);
  assert(run.stale.includes('script'));
  assert.equal((await generate('audit')).status, 400);
});
test('shorts follows hook selection and generates scenes without outline', async () => {
  await create('reels-script');
  await generate('angles');
  await patch({
    selectedAngle: 0
  });
  assert.equal((await generate('script')).status, 200);
  assert.equal((await generate('outline')).status, 400);
});
test('hook lab validates exact deliverables and recovers after one malformed response', async () => {
  await create('hook-lab');
  mode = 'repair';
  calls = 0;
  assert.equal((await generate('hooks')).status, 200);
  mode = '';
  assert.equal(run.artifacts.hooks.hooks.length, 10);
  assert.equal(run.artifacts.hooks.titles.length, 5);
});
test('repurposed output failures preserve earlier output and retry independently', async () => {
  await create('repurpose-engine');
  assert.equal((await generate('x')).status, 200);
  const x = run.artifacts.x;
  mode = 'quota';
  assert.equal((await generate('newsletter')).status, 503);
  mode = '';
  assert.equal((await generate('linkedin')).status, 200);
  assert.deepEqual(run.artifacts.x, x);
  assert.equal(Object.keys(run.assets).length, 2);
});
test('invalid or truncated generations never replace saved artifacts', async () => {
  const previous = run.revision;
  mode = 'invalid';
  assert.equal((await generate('newsletter')).status, 503);
  mode = 'truncated';
  assert.equal((await generate('newsletter')).status, 503);
  mode = '';
  assert.equal((await req(path())).data.revision, previous);
});
test('invalid durations and foreign source IDs are rejected', async () => {
  const foreign = (await req('/projects', 'POST', {
    name: 'Other'
  }, other)).data;
  const media = await Media.create({
    projectId: foreign._id,
    userId: (await Project.findById(foreign._id)).userId,
    name: 'Private',
    type: 'text',
    mimeType: 'text/plain',
    size: 1,
    data: 'YQ=='
  });
  const body = {
    agentId: 'reels-script',
    brief: 'Brief',
    duration: 70,
    sourceIds: [],
    overrides: {}
  };
  assert.equal((await req(`${root()}/runs`, 'POST', body)).status, 400);
  body.duration = 30;
  body.sourceIds = [String(media._id)];
  assert.equal((await req(`${root()}/runs`, 'POST', body)).status, 404);
});
test('quota failure leaves no phantom script asset', async () => {
  await create('hook-lab');
  await Media.create({
    projectId: project._id,
    userId: run.userId,
    name: 'Full project',
    type: 'text',
    mimeType: 'text/plain',
    size: 50 * 1024 * 1024,
    data: 'YQ=='
  });
  assert.equal((await generate('hooks')).status, 413);
  assert.deepEqual((await req(path())).data.assets, {});
  await Media.deleteOne({
    name: 'Full project'
  });
});
test('long-form chapter failures preserve progress and resume without duplicating scenes', async () => {
  await create();
  await generate('angles');
  await patch({
    selectedAngle: 0
  });
  await generate('outline');
  await patch({
    approveOutline: true
  });
  mode = 'chapter';
  scriptCalls = 0;
  assert.equal((await generate('script')).status, 503);
  mode = '';
  run = (await req(path())).data;
  assert.equal(run.artifacts.script.completedChapters, 1);
  assert.equal(run.artifacts.script.scenes.length, 1);
  assert.equal((await generate('script')).status, 200);
  assert.equal(run.artifacts.script.completedChapters, 2);
  assert.equal(run.artifacts.script.scenes.length, 2);
});
test('project deletion during generation prevents orphan persistence', async () => {
  const mainProject = project;
  project = (await req('/projects', 'POST', {
    name: 'Delete during Studio'
  })).data;
  await create('hook-lab');
  let release;
  gate = new Promise(r => {
    release = r;
  });
  const pending = generate('hooks');
  await new Promise(r => setTimeout(r, 40));
  assert.equal((await req(`/projects/${project._id}`, 'DELETE')).status, 204);
  release();
  assert.equal((await pending).status, 404);
  gate = null;
  assert.equal(await StudioRun.countDocuments({
    projectId: project._id
  }), 0);
  assert.equal(await Media.countDocuments({
    projectId: project._id
  }), 0);
  project = mainProject;
});
test('project deletion removes runs, revisions and deduplication records', async () => {
  await req(`/projects/${project._id}`, 'DELETE');
  assert.equal(await StudioRun.countDocuments({
    projectId: project._id
  }), 0);
  assert.equal(await StudioRevision.countDocuments({
    projectId: project._id
  }), 0);
  assert.equal(await StudioRequest.countDocuments(), 0);
});
test('timing and audit checks identify pacing, unresolved loops and duplicate hooks', () => {
  const scenes = timeScenes([{
    ...scene,
    spoken: Array(250).fill('word').join(' '),
    markers: ['Loop open'],
    loopId: 'promise'
  }]);
  assert.equal(scenes[0].end, 100);
  assert(checks({
    duration: 30,
    artifacts: {
      script: {
        scenes
      }
    }
  }).some(f => f.category === 'loops'));
});
