import { skillById } from '../../shared/skills.js';

export function resolveProjectSkill(project, identifier, media) {
  if (!identifier) return undefined;
  const skill = skillById(identifier);
  if (!skill || !project.skillIds?.includes(identifier)) {
    throw Object.assign(new Error('Add this skill to your project before running its agent.'), { status: 400 });
  }
  if (skill.sourceTypes.length && !media.some(asset => skill.sourceTypes.includes(asset.type))) {
    throw Object.assign(new Error(`Upload a source for ${skill.title} first: ${skill.inputs}.`), { status: 400 });
  }
  return skill;
}
