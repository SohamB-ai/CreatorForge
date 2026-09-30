import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${root}server/.env`, quiet: true });
await mkdir(`${root}tmp/mongodb-data`, { recursive: true });
process.env.MONGOMS_DOWNLOAD_DIR = `${root}tmp/mongodb-binaries`;
let database;
if (!process.env.MONGODB_URI) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  database = await MongoMemoryServer.create({ instance: { dbName: 'creatorforge', dbPath: `${root}tmp/mongodb-data`, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  process.env.MONGODB_URI = database.getUri();
  console.log('Local development MongoDB is ready; data stays in tmp/mongodb-data.');
}
if (!process.env.JWT_SECRET) {
  const secretPath = `${root}tmp/local-jwt-secret`;
  try { process.env.JWT_SECRET = await readFile(secretPath, 'utf8'); } catch {
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    await writeFile(secretPath, process.env.JWT_SECRET, { mode: 0o600 });
  }
}
process.env.PORT ||= '5001';
const children = [
  spawn(process.execPath, ['server/src/index.js'], { cwd: root, env: process.env, stdio: 'inherit' }),
  spawn(process.execPath, [`${root}node_modules/vite/bin/vite.js`, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: `${root}client`, env: process.env, stdio: 'inherit' }),
];
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill('SIGTERM'));
  if (database) await database.stop({ doCleanup: false, force: false });
  process.exit(code);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
children.forEach((child) => child.on('exit', (code) => stop(code || 0)));
