import { execSync } from 'node:child_process';

const isLinuxX64 = process.platform === 'linux' && process.arch === 'x64';

if (!isLinuxX64) {
  process.exit(0);
}

const command = [
  'npm install',
  '--prefix client',
  '--no-save',
  '--include=optional',
  '@rolldown/binding-linux-x64-gnu@1.0.3',
  'lightningcss-linux-x64-gnu@1.32.0',
].join(' ');

execSync(command, { stdio: 'inherit' });
