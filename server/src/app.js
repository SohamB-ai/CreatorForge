import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { z } from 'zod';
import { User, Project, Media, Message, BrandKit } from './models.js';
import { createGenerator } from './ai.js';
import { installGoogleAuth, isAllowedOrigin } from './google-auth.js';
import { installContentRoutes } from './content.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const string = (maximum) => z.string().trim().max(maximum);
const password = z.string().min(8).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes.');
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const projectSchema = z.object({ name: string(100).min(1), description: string(500).default('') });
const brandSchema = z.object({
  name: string(100).default(''), tone: string(200).default('Professional and conversational'),
  audience: string(500).default(''), keywords: z.array(string(60)).max(30).default([]),
  colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(12).default([]), guidelines: string(10000).default(''),
});
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const safeUser = (user) => ({ _id: user._id, name: user.name, email: user.email });
const acceptedTypes = new Map([
  ['image/jpeg', 'image'], ['image/png', 'image'], ['image/webp', 'image'],
  ['audio/mpeg', 'audio'], ['audio/wav', 'audio'], ['audio/x-wav', 'audio'], ['audio/mp4', 'audio'],
  ['video/mp4', 'video'], ['video/webm', 'video'], ['application/pdf', 'document'],
  ['text/plain', 'text'], ['text/markdown', 'text'], ['text/csv', 'text'],
]);

function validateFile(file) {
  if (!file) fail(400, 'Choose a file to upload.');
  if (!file.size) fail(400, 'Empty files cannot be uploaded.');
  const mime = file.mimetype;
  const data = file.buffer;
  const signature = data.subarray(0, 12);
  const matches = {
    'image/png': data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/jpeg': data[0] === 255 && data[1] === 216 && data[2] === 255,
    'image/webp': signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WEBP',
    'application/pdf': signature.toString('ascii', 0, 5) === '%PDF-',
    'video/mp4': signature.toString('ascii', 4, 8) === 'ftyp',
    'audio/mp4': signature.toString('ascii', 4, 8) === 'ftyp',
    'video/webm': data.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])),
    'audio/wav': signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WAVE',
    'audio/x-wav': signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WAVE',
    'audio/mpeg': signature.toString('ascii', 0, 3) === 'ID3' || (data[0] === 255 && (data[1] & 224) === 224),
  };
  if (mime.startsWith('text/')) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { fail(415, 'Text files must use UTF-8 encoding.'); }
    if (data.includes(0)) fail(415, 'This does not appear to be a text file.');
  } else if (!matches[mime]) fail(415, 'The file contents do not match the declared file type.');
}

export function createApp({ jwtSecret, geminiApiKey, geminiModel, aiEnabled = false, generateContent, firebaseConfig, firebaseGoogleEnabled = false, verifyFirebaseCredential, clientUrl = 'http://127.0.0.1:5173' } = {}) {
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('replace_with')) throw new Error('JWT_SECRET must contain at least 32 characters and must not be the example placeholder.');
  const app = express();
  const generate = createGenerator({ geminiApiKey, geminiModel, aiEnabled, generateContent });
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin, clientUrl));
    },
    credentials: true,
  }));
  const editJson = express.json({ limit: '400kb' });
  app.use('/api/projects/:id/media/:mediaId', (request, response, next) => request.method === 'PATCH' ? editJson(request, response, next) : next());
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (request, response) => response.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    aiConfigured: generate.configured,
    aiConfiguration: generate.configuration,
  }));
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.RATE_LIMIT_AUTH ? Number(process.env.RATE_LIMIT_AUTH) : 500, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' } });
  const tokenFor = (user) => jwt.sign({ id: user._id.toString() }, jwtSecret, { algorithm: 'HS256', expiresIn: '7d', issuer: 'creatorforge', audience: 'creatorforge-client' });
  installGoogleAuth(app, { jwtSecret, firebaseConfig, firebaseGoogleEnabled, verifyFirebaseCredential, clientUrl, authLimiter, tokenFor, safeUser });
  app.post('/api/auth/register', authLimiter, asyncRoute(async (request, response) => {
    const values = z.object({ name: string(50).min(1), email, password }).parse(request.body);
    if (await User.exists({ email: values.email })) fail(409, 'An account with this email already exists.');
    const user = await User.create({ ...values, password: await bcrypt.hash(values.password, 12) });
    response.status(201).json({ token: tokenFor(user), user: safeUser(user) });
  }));
  app.post('/api/auth/login', authLimiter, asyncRoute(async (request, response) => {
    const values = z.object({ email, password: z.string().max(200) }).parse(request.body);
    const user = await User.findOne({ email: values.email }).select('+password');
    if (!user?.password || !await bcrypt.compare(values.password, user.password)) fail(401, 'Incorrect email or password.');
    response.json({ token: tokenFor(user), user: safeUser(user) });
  }));
  app.use('/api', asyncRoute(async (request, response, next) => {
    const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) fail(401, 'Please sign in to continue.');
    let decoded;
    try { decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: 'creatorforge', audience: 'creatorforge-client' }); } catch { fail(401, 'Your session has expired. Please sign in again.'); }
    if (!mongoose.isValidObjectId(decoded.id)) fail(401, 'Invalid session.');
    request.user = await User.findById(decoded.id);
    if (!request.user) fail(401, 'Your account is no longer available.');
    next();
  }));
  const ownedProject = async (request, projectId) => {
    if (!mongoose.isValidObjectId(projectId)) fail(404, 'Project not found.');
    const found = await Project.findOne({ _id: projectId, userId: request.user._id });
    if (!found) fail(404, 'Project not found.');
    return found;
  };
  const ownedMedia = async (request) => {
    await ownedProject(request, request.params.id);
    if (!mongoose.isValidObjectId(request.params.mediaId)) fail(404, 'Media not found.');
    const found = await Media.findOne({ _id: request.params.mediaId, projectId: request.params.id, userId: request.user._id }).select('+data');
    if (!found) fail(404, 'Media not found.');
    return found;
  };
  installContentRoutes(app, { ownedMedia });
  app.get('/api/auth/me', (request, response) => response.json(safeUser(request.user)));
  app.get('/api/projects', asyncRoute(async (request, response) => {
    const projects = await Project.find({ userId: request.user._id }).sort({ updatedAt: -1 }).lean();
    response.json(await Promise.all(projects.map(async (projectItem) => ({
      ...projectItem, mediaCount: await Media.countDocuments({ projectId: projectItem._id }),
      messageCount: await Message.countDocuments({ projectId: projectItem._id }),
    }))));
  }));
  app.post('/api/projects', asyncRoute(async (request, response) => {
    response.status(201).json(await Project.create({ ...projectSchema.parse(request.body), userId: request.user._id }));
  }));
  app.get('/api/projects/:id', asyncRoute(async (request, response) => response.json(await ownedProject(request, request.params.id))));
  app.patch('/api/projects/:id', asyncRoute(async (request, response) => {
    const found = await ownedProject(request, request.params.id);
    Object.assign(found, projectSchema.partial().parse(request.body));
    response.json(await found.save());
  }));
  app.delete('/api/projects/:id', asyncRoute(async (request, response) => {
    const found = await ownedProject(request, request.params.id);
    await Promise.all([Media.deleteMany({ projectId: found._id }), Message.deleteMany({ projectId: found._id })]);
    await found.deleteOne();
    response.status(204).end();
  }));
  app.get('/api/projects/:id/media', asyncRoute(async (request, response) => {
    const found = await ownedProject(request, request.params.id);
    response.json(await Media.find({ projectId: found._id }).sort({ createdAt: -1 }));
  }));
  const upload = multer({
    storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 0, parts: 1 },
    fileFilter: (request, file, callback) => acceptedTypes.has(file.mimetype)
      ? callback(null, true) : callback(Object.assign(new Error('Unsupported file type. Use JPEG, PNG, WebP, MP3, WAV, MP4, WebM, PDF, or UTF-8 text.'), { status: 415 })),
  });
  app.post('/api/projects/:id/media', asyncRoute(async (request, response, next) => {
    request.project = await ownedProject(request, request.params.id);
    next();
  }), upload.single('file'), asyncRoute(async (request, response) => {
    validateFile(request.file);
    const existingBytes = await Media.aggregate([{ $match: { projectId: request.project._id } }, { $group: { _id: null, total: { $sum: '$size' } } }]);
    if ((existingBytes[0]?.total || 0) + request.file.size > 50 * 1024 * 1024) fail(413, 'This project has reached its 50 MB storage limit. Remove an asset first.');
    const asset = await Media.create({
      projectId: request.project._id, userId: request.user._id,
      name: request.file.originalname.replace(/[\x00-\x1f\\/]/g, '_').slice(0, 200),
      type: acceptedTypes.get(request.file.mimetype), mimeType: request.file.mimetype,
      size: request.file.size, data: request.file.buffer.toString('base64'),
    });
    await Project.updateOne({ _id: request.project._id }, { $set: { updatedAt: new Date() } });
    const result = asset.toObject();
    delete result.data;
    response.status(201).json(result);
  }));
  app.get('/api/projects/:id/media/:mediaId/content', asyncRoute(async (request, response) => {
    const asset = await ownedMedia(request);
    response.set('Content-Type', asset.mimeType);
    response.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`);
    response.set('Cache-Control', 'private, no-store');
    response.send(Buffer.from(asset.data, 'base64'));
  }));
  app.delete('/api/projects/:id/media/:mediaId', asyncRoute(async (request, response) => {
    const asset = await ownedMedia(request);
    await asset.deleteOne();
    response.status(204).end();
  }));
  app.get('/api/projects/:id/messages', asyncRoute(async (request, response) => {
    const found = await ownedProject(request, request.params.id);
    response.json(await Message.find({ projectId: found._id }).sort({ createdAt: 1, _id: 1 }));
  }));
  app.get('/api/brand-kit', asyncRoute(async (request, response) => {
    response.json(await BrandKit.findOne({ userId: request.user._id }) || brandSchema.parse({}));
  }));
  app.put('/api/brand-kit', asyncRoute(async (request, response) => {
    response.json(await BrandKit.findOneAndUpdate({ userId: request.user._id }, { $set: brandSchema.parse(request.body) }, { new: true, upsert: true, runValidators: true }));
  }));
  const aiLimiter = rateLimit({ windowMs: 60000, limit: 10, keyGenerator: (request) => request.user._id.toString(), standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'You have reached the generation limit. Try again in a minute.' } });
  const inFlight = new Set();
  const withProjectLock = async (projectId, operation) => {
    const key = projectId.toString();
    if (inFlight.has(key)) fail(409, 'A generation is already running in this project.');
    inFlight.add(key);
    try { return await operation(); } finally { inFlight.delete(key); }
  };
  app.post('/api/chat', aiLimiter, asyncRoute(async (request, response) => {
    const values = z.object({ projectId: z.string(), message: string(10000).min(1) }).parse(request.body);
    const found = await ownedProject(request, values.projectId);
    const result = await withProjectLock(found._id, async () => {
      const [media, history, brand] = await Promise.all([
        Media.find({ projectId: found._id }).select('+data'), Message.find({ projectId: found._id }).sort({ createdAt: -1, _id: -1 }).limit(30),
        BrandKit.findOne({ userId: request.user._id }).select('-userId -_id -__v').lean(),
      ]);
      const content = await generate({ project: found, media, history: history.reverse(), brand, prompt: values.message });
      const userMessage = await Message.create({ projectId: found._id, userId: request.user._id, role: 'user', content: values.message });
      const assistantMessage = await Message.create({ projectId: found._id, userId: request.user._id, role: 'model', content });
      return { userMessage, assistantMessage };
    });
    response.json(result);
  }));
  app.post('/api/remix', aiLimiter, asyncRoute(async (request, response) => {
    const values = z.object({ projectId: z.string(), mediaId: z.string(), format: z.enum(['Instagram caption', 'Blog post', 'Video script', 'Tweet thread', 'LinkedIn post', 'Image prompt', 'Summary']), instructions: string(3000).default('') }).parse(request.body);
    const found = await ownedProject(request, values.projectId);
    if (!mongoose.isValidObjectId(values.mediaId)) fail(404, 'Media not found.');
    const source = await Media.findOne({ _id: values.mediaId, projectId: found._id, userId: request.user._id }).select('+data');
    if (!source) fail(404, 'Media not found.');
    const result = await withProjectLock(found._id, async () => {
      const brand = await BrandKit.findOne({ userId: request.user._id }).select('-userId -_id -__v').lean();
      const content = await generate({ project: found, media: [source], history: [], brand, prompt: `Transform this source into a ${values.format}. ${values.instructions}` });
      const asset = await Media.create({ projectId: found._id, userId: request.user._id, name: `${values.format} — ${source.name}`.slice(0, 200), type: 'text', mimeType: 'text/markdown', size: Buffer.byteLength(content), data: Buffer.from(content).toString('base64') });
      return { content, mediaId: asset._id };
    });
    response.json(result);
  }));
  app.use((request, response) => response.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error instanceof z.ZodError) return response.status(400).json({ error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
    if (error instanceof multer.MulterError) return response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 5 MB limit.' : 'Upload exactly one file at a time.' });
    if (error.code === 11000) return response.status(409).json({ error: 'This account already exists.' });
    if (error.type === 'entity.parse.failed') return response.status(400).json({ error: 'Invalid JSON request.' });
    if (error.type === 'entity.too.large') return response.status(413).json({ error: 'Request is too large.' });
    response.status(error.status || 500).json({ error: error.status ? error.message : 'An unexpected server error occurred. Please try again.', ...(typeof error.code === 'string' && error.code.startsWith('AI_') ? { code: error.code } : {}) });
  });
  return app;
}
