import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(scriptDir, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const expectedRange = packageJson.engines?.node ?? '>=20 <23';
const actual = process.versions.node;
const major = Number.parseInt(actual.split('.')[0] ?? '', 10);

if (!Number.isFinite(major) || major < 20 || major >= 23) {
  console.error(
    `Unsupported Node.js version ${actual}. Cate requires ${expectedRange}. ` +
      'Run `nvm use` or put `/usr/local/opt/node@20/bin` first in PATH.'
  );
  process.exit(1);
}
