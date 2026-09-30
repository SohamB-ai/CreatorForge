import { randomUUID } from 'node:crypto';
export function timeScenes(scenes) {
  let elapsed = 0;
  return scenes.map(scene => {
    const seconds = Math.max(1, Math.round(scene.spoken.trim().split(/\s+/u).length / 150 * 60));
    const result = {
      ...scene,
      id: scene.id || randomUUID(),
      start: elapsed,
      end: elapsed + seconds
    };
    elapsed += seconds;
    return result;
  });
}
export function markdown(run, key) {
  const a = run.artifacts;
  if (key === 'script') return `# ${run.brief.slice(0, 100)}\n\nTiming estimates at 150 words/minute.\n\n` + (a.script?.scenes || []).map(s => `## ${s.id} · ${s.start}–${s.end}s · ${s.markers.join(' / ')}\n\n${s.spoken}\n\n**Visual:** ${s.visual}\n\n**On screen:** ${s.onScreen}\n`).join('\n');
  if (key === 'hooks') return '# Hook & Title Lab\n\n' + a.hooks.hooks.map(h => `## ${h.category}\n${h.text}`).join('\n\n') + '\n\n' + a.hooks.titles.map(t => `## ${t.title}\nThumbnail: ${t.thumbnail}`).join('\n\n');
  return a[key]?.content || '';
}
export function checks(run) {
  const findings = [];
  const add = (category, target, evidence, suggestion) => findings.push({
    category,
    target,
    evidence,
    suggestion
  });
  const scenes = run.artifacts.script?.scenes || [];
  const seconds = scenes.at(-1)?.end || 0;
  if (scenes.length && Math.abs(seconds - run.duration) / run.duration > .2) add('duration', 'script', `Estimated ${seconds}s; target ${run.duration}s.`, 'Adjust spoken length or target duration.');
  let last = 0;
  const loops = new Map();
  for (const s of scenes) {
    if (s.markers.some(m => ['Hook', 'Re-hook', 'Mini-hook'].includes(m))) {
      if (s.start - last > 90) add('pacing', s.id, `${s.start - last}s between hooks.`, 'Consider a relevant re-engagement beat.');
      last = s.start;
    }
    if (s.markers.includes('Loop open')) {
      if (!s.loopId) add('loops', s.id, 'Loop opening has no identifier.', 'Assign a loop identifier.');else loops.set(s.loopId, s.id);
    }
    if (s.markers.includes('Loop payoff')) loops.delete(s.loopId);
  }
  if (seconds - last > 90) add('pacing', 'script', `${seconds - last}s after the last hook.`, 'Review the closing section’s pacing.');
  for (const [id, target] of loops) add('loops', target, `Loop ${id} remains open.`, 'Add a tagged payoff or remove the promise.');
  const hooks = run.artifacts.hooks?.hooks || [];
  const seen = new Set();
  for (const h of hooks) {
    if (seen.has(h.text.toLowerCase())) add('repetition', 'hooks', h.text, 'Replace the repeated hook.');
    seen.add(h.text.toLowerCase());
  }
  return findings;
}
