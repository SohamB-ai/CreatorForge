import { z } from 'zod';
import mongoose from 'mongoose';
import { Media, Message, Project } from './models.js';
import { ensureStorage, withProjectMutation } from './project-mutations.js';

export const MAX_EDIT_BYTES = 60000;
const route = (handler) => (request, response, next) => Promise.resolve(handler(request, response)).catch(next);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const safeAsset = (asset) => { const result = asset.toObject(); delete result.data; return result; };
const ensureText = (asset) => { if (asset.type !== 'text') fail(415, 'Only text assets can be edited or exported as Markdown/text.'); };

export function installContentRoutes(app, { ownedMedia, ownedProject }) {
  const mutationRoute = (handler) => route(async (request, response) => {
    const project = await ownedProject(request, request.params.id);
    return withProjectMutation(project._id, request.user._id, () => handler(request, response));
  });
  app.post('/api/projects/:id/messages/:messageId/save', mutationRoute(async (request, response) => {
    const project = await ownedProject(request, request.params.id);
    z.object({}).strict().parse(request.body || {});
    if (!mongoose.isValidObjectId(request.params.messageId)) fail(404, 'Message not found.');
    const message = await Message.findOne({ _id: request.params.messageId, projectId: project._id, userId: request.user._id });
    if (!message) fail(404, 'Message not found.');
    if (message.role !== 'model') fail(415, 'Only AI responses can be saved to the source library.');
    const savedQuery = { sourceMessageId: message._id, projectId: project._id, userId: request.user._id };
    const existing = await Media.findOne(savedQuery);
    if (existing) return response.json(safeAsset(existing));
    const size = Buffer.byteLength(message.content, 'utf8');
    if (!message.content.trim() || size > MAX_EDIT_BYTES || message.content.includes('\0')) fail(400, 'Save a nonempty AI response within the 60 KB editing limit.');
    await ensureStorage(project._id, size);
    await Media.init();
    let asset;
    try {
      asset = await Media.create({ ...savedQuery, name: 'Saved AI response.md', type: 'text', mimeType: 'text/markdown', size, data: Buffer.from(message.content, 'utf8').toString('base64') });
    } catch (failure) {
      if (failure.code !== 11000) throw failure;
      const saved = await Media.findOne(savedQuery);
      if (!saved) throw failure;
      return response.json(safeAsset(saved));
    }
    await Project.updateOne({ _id: project._id, userId: request.user._id }, { $set: { updatedAt: new Date() } });
    response.status(201).json(safeAsset(asset));
  }));
  app.get('/api/projects/:id/media/:mediaId/edit', route(async (request, response) => {
    const asset = await ownedMedia(request);
    ensureText(asset);
    response.set('Cache-Control', 'private, no-store');
    response.json({ asset: safeAsset(asset), content: Buffer.from(asset.data, 'base64').toString('utf8'), version: asset.__v || 0, maxEditBytes: MAX_EDIT_BYTES });
  }));
  app.patch('/api/projects/:id/media/:mediaId', mutationRoute(async (request, response) => {
    const asset = await ownedMedia(request);
    ensureText(asset);
    if (asset.studioRunId) fail(409, 'Edit this structured asset in the Studio.');
    const values = z.object({ content: z.string().min(1, 'Content cannot be empty.').max(MAX_EDIT_BYTES).refine((content) => Buffer.byteLength(content, 'utf8') <= MAX_EDIT_BYTES, 'Content exceeds the 60 KB editing limit.').refine((content) => !content.includes('\0'), 'Text cannot contain null bytes.'), version: z.number().int().nonnegative() }).strict().parse(request.body);
    const size = Buffer.byteLength(values.content, 'utf8');
    await ensureStorage(asset.projectId, size, asset.size);
    const updated = await Media.findOneAndUpdate({ _id: asset._id, projectId: asset.projectId, userId: request.user._id, __v: values.version }, { $set: { data: Buffer.from(values.content, 'utf8').toString('base64'), size }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!updated) fail(409, 'This asset changed in another session. Reload the saved version before trying again; your draft is still available.');
    await Project.updateOne({ _id: asset.projectId, userId: request.user._id }, { $set: { updatedAt: new Date() } });
    response.set('Cache-Control', 'private, no-store');
    response.json({ asset: safeAsset(updated), content: values.content, version: updated.__v });
  }));
  app.get('/api/projects/:id/media/:mediaId/export', route(async (request, response) => {
    const asset = await ownedMedia(request);
    ensureText(asset);
    const format = z.enum(['markdown', 'text']).default('markdown').parse(request.query.format);
    const extension = format === 'markdown' ? '.md' : '.txt';
    const stem = asset.name.replace(/[\x00-\x1f\x7f\\/]/g, '_').replace(/\.(?:md|txt|csv)$/i, '').slice(0, 150) || 'CreatorForge-content';
    response.set('Content-Type', format === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8');
    response.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${stem}${extension}`).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`);
    response.set('Cache-Control', 'private, no-store');
    response.send(Buffer.from(asset.data, 'base64'));
  }));
}

