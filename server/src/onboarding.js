import { z } from 'zod';
import { CreatorProfile } from './models.js';
import { creatorRoles } from '../../shared/onboarding.js';
import { skillCatalog, skillsForProfessions } from '../../shared/skills.js';

export const skillIdsSchema = z.array(z.enum(skillCatalog.map(skill => skill.id))).max(skillCatalog.length)
  .refine(identifiers => new Set(identifiers).size === identifiers.length, 'Choose each skill only once.');
const profileSchema = z.object({
  professions: z.array(z.enum(creatorRoles.map(role => role.id))).min(1).max(creatorRoles.length)
    .refine(professions => new Set(professions).size === professions.length, 'Choose each profession only once.'),
  roleDetail: z.string().trim().max(120).default(''),
  skillIds: skillIdsSchema.default([]),
  workflow: z.string().trim().max(1000).default(''),
}).strict().refine(profile => !profile.professions.includes('other') || profile.roleDetail.length > 0, {
  message: 'Tell us a little about what you do.', path: ['roleDetail'],
}).refine(profile => profile.skillIds.every(identifier => skillsForProfessions(profile.professions).some(skill => skill.id === identifier)), {
  message: 'Choose skills from your selected professions.', path: ['skillIds'],
});

export const publicProfile = profile => ({
  professions: profile.professions?.length ? profile.professions : profile.role ? [profile.role] : [],
  roleDetail: profile.roleDetail || '', skillIds: profile.skillIds || [], workflow: profile.workflow || '',
});

export async function validateProjectSkills(userId, skillIds) {
  if (!skillIds?.length) return;
  const stored = await CreatorProfile.findOne({ userId });
  const available = stored ? skillsForProfessions(publicProfile(stored).professions) : [];
  if (!skillIds.every(identifier => available.some(skill => skill.id === identifier))) {
    throw Object.assign(new Error('Choose your professions before adding their skills to a project.'), { status: 400 });
  }
}

export function installOnboarding(app, { asyncRoute }) {
  app.get('/api/onboarding', asyncRoute(async (request, response) => {
    const profile = await CreatorProfile.findOne({ userId: request.user._id });
    response.set('Cache-Control', 'private, no-store').json({ profile: profile ? publicProfile(profile) : null });
  }));
  app.put('/api/onboarding', asyncRoute(async (request, response) => {
    const values = profileSchema.parse(request.body);
    const filter = { userId: request.user._id };
    const update = { $set: values, $unset: { role: '', goals: '' } };
    let profile;
    try {
      profile = await CreatorProfile.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true });
    } catch (failure) {
      if (failure.code !== 11000) throw failure;
      profile = await CreatorProfile.findOneAndUpdate(filter, update, { new: true, runValidators: true });
      if (!profile) throw failure;
    }
    response.set('Cache-Control', 'private, no-store').json({ profile: publicProfile(profile) });
  }));
}
