'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/oversize-warning');
const { runRule } = require('../helpers');

test('oversize-warning: flags emails between 50KB and 102KB', async () => {
  const padding = 'x'.repeat(70 * 1024);
  const ctx = await runRule(rule, `<html><body>${padding}</body></html>`);
  assert.ok(ctx.issues.find(i => i.id === 'oversize-warning'));
});

test('oversize-warning: quiet when under 50KB or over 102KB', async () => {
  const small = await runRule(rule, '<html><body>small</body></html>');
  assert.equal(small.issues.filter(i => i.id === 'oversize-warning').length, 0);
  const huge = 'x'.repeat(200 * 1024);
  const large = await runRule(rule, `<html><body>${huge}</body></html>`);
  assert.equal(large.issues.filter(i => i.id === 'oversize-warning').length, 0);
});
