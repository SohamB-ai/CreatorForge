import { z } from 'zod';
const text = z.string().trim().min(1).max(12000);
export const sceneSchema = z.object({
  id: z.string().max(80).optional(),
  spoken: text,
  visual: text,
  onScreen: z.string().max(2000).default(''),
  markers: z.array(z.enum(['Hook', 'Stakes', 'Mini-hook', 'Re-hook', 'Payoff', 'CTA', 'Loop open', 'Loop payoff'])).max(8).default([]),
  loopId: z.string().max(80).default('')
});
export const anglesSchema = z.object({
  angles: z.array(z.object({
    title: text,
    hook: text
  })).min(3).max(5)
});
export const outlineSchema = z.object({
  chapters: z.array(z.object({
    title: text,
    summary: text
  })).min(1).max(20)
});
export const scenesSchema = z.object({
  scenes: z.array(sceneSchema).min(1).max(80)
});
export const hooksSchema = z.object({
  hooks: z.array(z.object({
    category: text,
    text
  })).length(10),
  titles: z.array(z.object({
    title: text,
    thumbnail: text
  })).length(5)
});
export const outputSchema = z.object({
  content: text
});
export const auditSchema = z.object({
  findings: z.array(z.object({
    category: text,
    target: text,
    evidence: text,
    suggestion: text
  })).max(30)
});
export const agents = [{
  id: 'long-form-script',
  title: 'YouTube long-form',
  version: '1.0',
  stages: ['angles', 'outline', 'script'],
  tokens: 8192
}, {
  id: 'reels-script',
  title: 'Reels / Shorts',
  version: '1.0',
  stages: ['angles', 'script'],
  tokens: 4096
}, {
  id: 'hook-lab',
  title: 'Hook & Title Lab',
  version: '1.0',
  stages: ['hooks'],
  tokens: 4096
}, {
  id: 'repurpose-engine',
  title: 'Omnichannel Repurposer',
  version: '1.0',
  stages: ['x', 'linkedin', 'newsletter'],
  tokens: 4096
}];
export const stageSchemas = {
  angles: anglesSchema,
  outline: outlineSchema,
  script: scenesSchema,
  hooks: hooksSchema,
  x: outputSchema,
  linkedin: outputSchema,
  newsletter: outputSchema,
  audit: auditSchema
};
export const shapes = {
  angles: '{"angles":[{"title":"angle","hook":"opening line"}]} (3–5 angles; exactly 3 for Shorts)',
  outline: '{"chapters":[{"title":"chapter","summary":"content and open-loop plan"}]}',
  script: '{"scenes":[{"spoken":"exact dialogue","visual":"B-roll direction","onScreen":"text","markers":["Hook"],"loopId":""}]}',
  hooks: '{"hooks":[{"category":"archetype","text":"hook"}],"titles":[{"title":"title","thumbnail":"visual concept"}]} (exactly 10 hooks and 5 titles)',
  x: '{"content":"7–10 numbered posts, each at most 280 characters"}',
  linkedin: '{"content":"complete LinkedIn post"}',
  newsletter: '{"content":"approximately 500-word newsletter"}',
  audit: '{"findings":[{"category":"editorial","target":"scene ID or output","evidence":"specific quotation or observation","suggestion":"concrete edit"}]}'
};
