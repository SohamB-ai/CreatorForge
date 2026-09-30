import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { GoogleChallenge, User } from './models.js';

const cookieName = 'creatorforge_google_challenge';
const cookiePath = '/api/auth/google';
const challengeLifetime = 5 * 60 * 1000;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const reject = (status, message) => { throw Object.assign(new Error(message), { status }); };
const route = (handler) => (request, response, next) => Promise.resolve(handler(request, response)).catch(next);

export function installGoogleAuth(app, { jwtSecret, googleClientId, verifyGoogleCredential, clientUrl, authLimiter, tokenFor, safeUser }) {
  const configured = /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(googleClientId || '');
  const verifier = configured ? new OAuth2Client(googleClientId) : null;
  const secure = process.env.NODE_ENV === 'production' || new URL(clientUrl).protocol === 'https:';
  const cookieOptions = { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: cookiePath };
  const ensureRequest = (request) => {
    if (!configured) reject(503, 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the server.');
    if (request.get('X-CreatorForge-Google') !== '1') reject(403, 'Google sign-in must start from the CreatorForge sign-in page.');
    if (request.get('Origin') && request.get('Origin') !== new URL(clientUrl).origin) reject(403, 'This sign-in origin is not allowed.');
  };
  const verify = verifyGoogleCredential || (async (credential) => {
    const ticket = await verifier.verifyIdToken({ idToken: credential, audience: googleClientId });
    return ticket.getPayload();
  });
  app.get('/api/auth/google/config', (request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ configured, clientId: configured ? googleClientId : null });
  });
  app.post('/api/auth/google/challenge', authLimiter, route(async (request, response) => {
    ensureRequest(request);
    const nonce = randomBytes(32).toString('base64url');
    await GoogleChallenge.create({ nonceHash: hash(nonce), expiresAt: new Date(Date.now() + challengeLifetime) });
    const cookie = jwt.sign({ nonce }, jwtSecret, { algorithm: 'HS256', expiresIn: '5m', issuer: 'creatorforge-google', audience: 'creatorforge-google-login' });
    response.cookie(cookieName, cookie, { ...cookieOptions, maxAge: challengeLifetime });
    response.set('Cache-Control', 'no-store');
    response.json({ nonce });
  }));
  app.post('/api/auth/google', authLimiter, route(async (request, response) => {
    ensureRequest(request);
    const values = z.object({ credential: z.string().min(1).max(10000), password: z.string().min(1).max(200).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes.').optional() }).parse(request.body);
    const cookie = request.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    let session;
    try { session = jwt.verify(cookie || '', jwtSecret, { algorithms: ['HS256'], issuer: 'creatorforge-google', audience: 'creatorforge-google-login' }); } catch { reject(401, 'Your Google sign-in session expired. Start Google sign-in again.'); }
    if (typeof session.nonce !== 'string' || !await GoogleChallenge.exists({ nonceHash: hash(session.nonce), expiresAt: { $gt: new Date() } })) reject(401, 'This Google sign-in session has expired or already been used.');
    let payload;
    try { payload = await verify(values.credential); } catch { reject(401, 'Google could not verify this sign-in. Please try again.'); }
    if (!payload || !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)
      || payload.aud !== googleClientId || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000
      || payload.email_verified !== true || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255
      || payload.nonce !== session.nonce || !z.string().email().max(254).safeParse(payload.email).success) reject(401, 'Google sign-in could not be verified. Start again with a verified Google account.');
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ googleSub: payload.sub }).select('+googleSub');
    let linkUser;
    if (!user) {
      linkUser = await User.findOne({ email }).select('+password +googleSub');
      if (linkUser?.googleSub) reject(409, 'This email is already associated with a different Google identity.');
      if (linkUser && !values.password) return response.status(409).json({ error: 'An email/password account already exists. Confirm its password to connect Google without losing your projects.', code: 'ACCOUNT_LINK_REQUIRED' });
      if (linkUser && (!linkUser.password || !await bcrypt.compare(values.password, linkUser.password))) reject(401, 'The existing account password is incorrect. Google has not been linked.');
    }
    const consumed = await GoogleChallenge.findOneAndDelete({ nonceHash: hash(session.nonce), expiresAt: { $gt: new Date() } });
    if (!consumed) reject(401, 'This Google sign-in session has already been used.');
    response.clearCookie(cookieName, cookieOptions);
    if (!user && linkUser) {
      user = await User.findOneAndUpdate({ _id: linkUser._id, googleSub: { $exists: false } }, { $set: { googleSub: payload.sub } }, { new: true, runValidators: true });
      if (!user) reject(409, 'This account changed during sign-in. Please start Google sign-in again.');
    }
    if (!user) user = await User.create({ email, name: (typeof payload.name === 'string' ? payload.name : email.split('@')[0]).trim().slice(0, 50) || 'Creator', googleSub: payload.sub });
    response.set('Cache-Control', 'no-store');
    response.json({ token: tokenFor(user), user: safeUser(user) });
  }));
}
