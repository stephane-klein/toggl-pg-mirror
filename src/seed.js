#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

import { logger } from './logger.js';
import { sql, waitForDb } from './db.js';

await waitForDb();

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'sqls/fixtures');

const files = readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  logger.info({ file }, 'Loading fixture');
  const content = readFileSync(join(fixturesDir, file), 'utf8');
  await sql.unsafe(content);
}

await sql.end();
