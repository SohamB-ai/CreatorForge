import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${root}server/.env`, quiet: true });
dotenv.config({ path: `${root}client/.env`, quiet: true });
const failures = [];
function check(label, valid) { console.log(`${valid ? 'PASS' : 'NEEDS SETUP'}: ${label}`); if (!valid) failures.push(label); }
function secureOrigin(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password; } catch { return false; }
}
const database = process.env.MONGODB_URI || '';
check('Hosted MongoDB connection configured', /^mongodb(?:\+srv)?:\/\//.test(database) && !/localhost|127\.0\.0\.1|\[::1\]/i.test(database));
const secret = process.env.JWT_SECRET || '';
check('Production session secret configured', secret.length >= 32 && !secret.startsWith('replace_with'));
check('HTTPS frontend CLIENT_URL configured', secureOrigin(process.env.CLIENT_URL));
if (process.env.AI_GENERATION_ENABLED === 'true') {
  check('Explicit Gemini model configured', /^gemini-[a-zA-Z0-9.-]+$/.test(process.env.GEMINI_MODEL || ''));
  check('Gemini API key configured', Boolean(process.env.GEMINI_API_KEY?.trim()));
  console.log('NOTE: Configuration presence is not proof of live model access; run a real provider test before release.');
} else console.log('NOTE: AI generation intentionally disabled; no live provider requests made.');
const frontendApi = process.env.VITE_API_URL;
const routing = JSON.parse(await readFile(`${root}client/vercel.json`, 'utf8'));
const proxy = routing.rewrites?.some((rule) => rule.source.startsWith('/api') && secureOrigin(rule.destination));
check('Production frontend API destination/proxy configured', frontendApi ? secureOrigin(frontendApi) : Boolean(proxy));
console.log('NOTE: Authentication/Firebase setup is user-managed; this check does not modify it.');
console.log('NOTE: Offline configuration check only; no deployment, billing, database writes or credentials printed.');
console.log(failures.length ? `${failures.length} deployment setup item(s) remain.` : 'Configuration checks pass; live connectivity, security audit and browser verification still required.');
process.exitCode = failures.length ? 1 : 0;
