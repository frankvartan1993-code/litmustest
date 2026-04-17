'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/creatio-macros');
const pipeline = require('../../lib/pipeline');
const { loadFixture } = require('../helpers');

test('creatio-macros: passes when macros unchanged after pipeline', async () => {
  const ctx = await pipeline.run(loadFixture('synthetic-minimal.html'), { rules: [rule] });
  assert.equal(ctx.issues.filter(i => i.id === 'creatio-macros').length, 0);
  assert.equal(ctx.score.macrosIntact, true);
});

test('creatio-macros: detects drift when other rule mutates a macro', async () => {
  const breaker = {
    id: 'breaker', category: 'polish', weight: 0,
    detect() {}, fix(ctx) { ctx.html = ctx.html.replace('[#Unsubscribe.URL#]', '#'); }
  };
  const ctx = await pipeline.run(loadFixture('synthetic-minimal.html'), { rules: [rule, breaker] });
  assert.equal(ctx.score.macrosIntact, false);
  assert.ok(ctx.score.value <= 50);
});
