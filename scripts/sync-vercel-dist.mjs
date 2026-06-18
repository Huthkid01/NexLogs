import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDist = resolve('dist');
const clientDist = resolve('client', 'dist');

if (!existsSync(clientDist)) {
  console.error('Expected client build output at client/dist, but it was not found.');
  process.exit(1);
}

rmSync(rootDist, { recursive: true, force: true });
mkdirSync(rootDist, { recursive: true });
cpSync(clientDist, rootDist, { recursive: true });
