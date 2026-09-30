import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { CreatorProfile, GoogleChallenge, GoogleTokenExchange, Media, User } from './models.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in server/.env, or use npm run dev from the project root for local MongoDB.');
const app = createApp({ jwtSecret: process.env.JWT_SECRET, geminiApiKey: process.env.GEMINI_API_KEY, geminiModel: process.env.GEMINI_MODEL, aiEnabled: process.env.AI_GENERATION_ENABLED === 'true', firebaseGoogleEnabled: process.env.FIREBASE_GOOGLE_SIGN_IN_ENABLED === 'true', firebaseConfig: { projectId: process.env.FIREBASE_PROJECT_ID, apiKey: process.env.FIREBASE_WEB_API_KEY, authDomain: process.env.FIREBASE_AUTH_DOMAIN, appId: process.env.FIREBASE_APP_ID }, clientUrl: process.env.CLIENT_URL });
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
await Promise.all([User.init(), GoogleChallenge.init(), GoogleTokenExchange.init(), Media.init(), CreatorProfile.init()]);
const server = app.listen(Number(process.env.PORT || 5001), process.env.HOST || '127.0.0.1', () => console.log(`CreatorForge API ready on port ${process.env.PORT || 5001}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await mongoose.disconnect(); process.exit(0); }));
