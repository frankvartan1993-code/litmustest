'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/table-role-presentation');
const { runRule } = require('../helpers');

test('table-role-presentation: adds role="presentation" to layout tables', async () => {
  const html = '<html><body><table><tr><td>hi</td></tr></table></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'table-role-presentation'));
  assert.match(ctx.html, /<table[^>]*role="presentation"/);
});

test('table-role-presentation: idempotent', async () => {
  const html = '<html><body><table role="presentation"><tr><td>hi</td></tr></table></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'table-role-presentation').length, 0);
});
