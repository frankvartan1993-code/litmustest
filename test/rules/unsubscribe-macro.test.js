'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/unsubscribe-macro');
const { runRule, loadFixture } = require('../helpers');

test('unsubscribe-macro: present in minimal fixture', async () => {
  const ctx = await runRule(rule, loadFixture('synthetic-minimal.html'));
  assert.equal(ctx.issues.filter(i => i.id === 'unsubscribe-macro').length, 0);
});

test('unsubscribe-macro: missing in no-unsubscribe fixture triggers cap74', async () => {
  const ctx = await runRule(rule, loadFixture('no-unsubscribe.html'));
  const issue = ctx.issues.find(i => i.id === 'unsubscribe-macro');
  assert.ok(issue);
  assert.equal(issue.cap74, true);
  assert.equal(issue.severity, 'critical');
});
