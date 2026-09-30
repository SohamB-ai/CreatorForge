import mongoose from 'mongoose';
import { once } from 'node:events';
import { z } from 'zod';
import { BrandKit, Media, Message, Project } from './models.js';
import { resolveProjectSkill } from './project-skills.js';

export function installChatStream(app, { aiLimiter, asyncRoute, ownedProject, withProjectLock, generate, streamTimeoutMs = 65000 }) {
  app.post('/api/chat/stream', aiLimiter, asyncRoute(async (request, response) => {
    const values = z.object({ projectId: z.string(), message: z.string().trim().min(1).max(10000), skillId: z.string().min(1).max(80).optional() }).strict().parse(request.body);
    const project = await ownedProject(request, values.projectId);
    const controller = new AbortController();
    const disconnect = () => controller.abort(new DOMException('Generation cancelled.', 'AbortError'));
    request.once('aborted', disconnect);
    response.once('close', disconnect);
    let heartbeat;
    const deadline = setTimeout(() => controller.abort(Object.assign(new Error('Generation timed out. Please try again.'), { status: 504, code: 'AI_TIMEOUT' })), streamTimeoutMs);
    const send = async (event, data) => {
      controller.signal.throwIfAborted();
      if (!response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) && event !== 'done') await once(response, 'drain', { signal: controller.signal });
    };
    try {
      await withProjectLock(project._id, async () => {
        const [media, history, brand] = await Promise.all([
          Media.find({ projectId: project._id }).select('+data'),
          Message.find({ projectId: project._id }).sort({ createdAt: -1, _id: -1 }).limit(30),
          BrandKit.findOne({ userId: request.user._id }).select('-userId -_id -__v').lean(),
        ]);
        const skill = resolveProjectSkill(project, values.skillId, media);
        const prepared = generate.prepare({ project, media, history: history.reverse(), brand, prompt: values.message, skill });
        controller.signal.throwIfAborted();
        response.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
        response.flushHeaders();
        heartbeat = setInterval(() => {
          if (!response.destroyed && !response.writableNeedDrain) response.write(': heartbeat\n\n');
        }, 15000);
        let content = '';
        for await (const text of generate.stream(prepared, controller.signal)) {
          content += text;
          await send('delta', { text });
        }
        controller.signal.throwIfAborted();
        if (!await Project.exists({ _id: project._id, userId: request.user._id })) throw Object.assign(new Error('Project no longer exists.'), { status: 404 });
        const identifiers = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        try {
          const [userMessage, assistantMessage] = await Message.insertMany([
            { _id: identifiers[0], projectId: project._id, userId: request.user._id, role: 'user', content: values.message },
            { _id: identifiers[1], projectId: project._id, userId: request.user._id, role: 'model', content },
          ]);
          await send('done', { userMessage, assistantMessage });
        } catch (failure) {
          await Message.deleteMany({ _id: { $in: identifiers }, projectId: project._id, userId: request.user._id });
          throw failure;
        }
      });
    } catch (failure) {
      if (!response.headersSent) throw failure;
      if (!response.destroyed) response.write(`event: error\ndata: ${JSON.stringify({ error: failure.status ? failure.message : 'Generation could not complete. Please try again.', ...(failure.code?.startsWith('AI_') ? { code: failure.code } : {}) })}\n\n`);
    } finally {
      clearTimeout(deadline);
      clearInterval(heartbeat);
      request.removeListener('aborted', disconnect);
      response.removeListener('close', disconnect);
      if (response.headersSent && !response.destroyed) response.end();
    }
  }));
}
