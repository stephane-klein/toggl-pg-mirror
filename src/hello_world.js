#!/usr/bin/env node
import { sql, waitForDb } from './db.js';

await waitForDb();

const contacts = await sql`SELECT * FROM contacts`;

console.log('contacts:', contacts);

await sql.end();
