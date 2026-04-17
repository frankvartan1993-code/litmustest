'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pipeline = require('../lib/pipeline');

test('pipeline with no rules returns a ctx with empty issues/fixes and score 100', async () => {
  const ctx = await pipeline.run('<html><body>hi</body></html>', { rules: [] });
  assert.deepEqual(ctx.issues, []);
  assert.deepEqual(ctx.fixesApplied, []);
  assert.equal(ctx.score.value, 100);
  assert.equal(ctx.score.grade, 'ready');
});

test('pipeline runs a simple detect+fix rule end to end', async () => {
  const stubRule = {
    id: 'stub',
    category: 'polish',
    weight: 5,
    detect(ctx) {
      if (!ctx.html.includes('<!-- stubbed -->')) {
        ctx.issues.push({ id: 'stub', category: 'polish', weight: 5, severity: 'warn', detail: 'missing stub', fixable: true });
      }
    },
    fix(ctx) {
      if (ctx.issues.find(i => i.id === 'stub' && !i.fixed)) {
        ctx.html = ctx.html.replace('<body>', '<body><!-- stubbed -->');
        const issue = ctx.issues.find(i => i.id === 'stub');
        issue.fixed = true;
        ctx.fixesApplied.push({ id: 'stub', category: 'polish', summary: 'Added stub comment', count: 1 });
      }
    }
  };
  const ctx = await pipeline.run('<html><body>hi</body></html>', { rules: [stubRule] });
  assert.ok(ctx.html.includes('<!-- stubbed -->'));
  assert.equal(ctx.fixesApplied.length, 1);
  assert.equal(ctx.score.value, 100);
});

test('pipeline catches rule errors and continues', async () => {
  const badRule = {
    id: 'bad',
    category: 'polish',
    weight: 1,
    detect() { throw new Error('boom'); },
    fix() {}
  };
  const ctx = await pipeline.run('<html></html>', { rules: [badRule] });
  assert.ok(ctx.ruleErrors.some(e => e.id === 'bad'));
});
