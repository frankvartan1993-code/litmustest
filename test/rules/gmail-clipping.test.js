'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/gmail-clipping');
const { runRule } = require('../helpers');

test('gmail-clipping: no issue under 102KB', async () => {
  const ctx = await runRule(rule, '<html><body>tiny</body></html>');
  assert.equal(ctx.issues.filter(i => i.id === 'gmail-clipping').length, 0);
});

test('gmail-clipping: warns between 102KB and 500KB', async () => {
  const padding = 'x'.repeat(150 * 1024);
  const ctx = await runRule(rule, `<html><body>${padding}</body></html>`);
  const issue = ctx.issues.find(i => i.id === 'gmail-clipping');
  assert.ok(issue);
  assert.equal(issue.cap74, undefined);
});

test('gmail-clipping: cap74 when over 500KB', async () => {
  const padding = 'x'.repeat(600 * 1024);
  const ctx = await runRule(rule, `<html><body>${padding}</body></html>`);
  const issue = ctx.issues.find(i => i.id === 'gmail-clipping');
  assert.ok(issue);
  assert.equal(issue.cap74, true);
});
