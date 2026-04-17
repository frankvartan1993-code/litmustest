#!/usr/bin/env node
'use strict';
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL — skipping migrations.');
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`Running ${f}...`);
    await pool.query(sql);
  }
  await pool.end();
  console.log('Migrations complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
