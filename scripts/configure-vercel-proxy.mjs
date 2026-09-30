import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const value = process.env.RENDER_API_ORIGIN;
let origin;
try {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash || ['localhost', '127.0.0.1'].includes(parsed.hostname)) throw new Error();
  origin = parsed.origin;
} catch { throw new Error('Set RENDER_API_ORIGIN to the exact HTTPS Render service origin before configuring Vercel.'); }
const target = fileURLToPath(new URL('../client/vercel.json', import.meta.url));
await writeFile(target, `${JSON.stringify({ rewrites: [
  { source: '/api/:path*', destination: `${origin}/api/:path*` },
  { source: '/(.*)', destination: '/index.html' },
] }, null, 2)}\n`);
console.log('Vercel /api proxy configured before the SPA fallback.');
