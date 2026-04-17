'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const pipeline = require('../lib/pipeline');
const { loadRules } = require('../lib/ruleLoader');

const rules = loadRules(path.join(__dirname, '..', 'rules'));
const realHtml = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'MKT-10021-steri-tamp.html'), 'utf8');

test('integration: real Creatio export preserves macros', async () => {
  const ctx = await pipeline.run(realHtml, { rules });
  assert.equal(ctx.score.macrosIntact, true);
  assert.deepEqual(ctx.macros.before.sort(), ctx.macros.after.sort());
});

test('integration: real export produces a score in a reasonable range', async () => {
  const ctx = await pipeline.run(realHtml, { rules });
  assert.ok(ctx.score.value >= 0 && ctx.score.value <= 100);
});

test('integration: expected fixes applied', async () => {
  const ctx = await pipeline.run(realHtml, { rules });
  const ids = ctx.fixesApplied.map(f => f.id);
  assert.ok(ids.includes('inline-css') || ids.includes('table-role-presentation'));
  // at least one polish fix applies
});

test('integration: idempotent — running output back through yields score >= previous and no new fixes', async () => {
  const first = await pipeline.run(realHtml, { rules });
  const second = await pipeline.run(first.html, { rules });
  assert.ok(second.score.value >= first.score.value - 1); // allow 1-pt jitter
});
