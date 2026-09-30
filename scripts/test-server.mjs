import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createApp } from '../server/src/app.js';
import { User, Media, CreatorProfile } from '../server/src/models.js';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(`${root}tmp`, { recursive: true });
const database = await MongoMemoryServer.create({ binary: { downloadDir: `${root}tmp/mongodb-binaries` } });
await mongoose.connect(database.getUri());
await Promise.all([User.init(), Media.init(), CreatorProfile.init()]);
const server = createApp({ jwtSecret: 'isolated-browser-test-secret-at-least-thirty-two-characters', clientUrl: 'http://127.0.0.1:5273' }).listen(5101, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const frontend = spawn(process.execPath, [`${root}node_modules/vite/bin/vite.js`, '--host', '127.0.0.1', '--port', '5273', '--strictPort'], { cwd: `${root}client`, stdio: 'inherit', env: { ...process.env, E2E_START_SERVER: 'true', VITE_API_URL: '' } });
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  frontend.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  await database.stop();
  process.exit();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
frontend.on('exit', stop);
