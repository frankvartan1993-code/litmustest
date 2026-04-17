'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/base64-images');
const { runRule, loadFixture } = require('../helpers');

test('base64-images: reports count and bytes', async () => {
  const ctx = await runRule(rule, loadFixture('base64-heavy.html'));
  const issue = ctx.issues.find(i => i.id === 'base64-images');
  assert.ok(issue);
  assert.equal(issue.count, 1);
  assert.ok(issue.totalBytes > 0);
});

test('base64-images: quiet when no base64 present', async () => {
  const ctx = await runRule(rule, loadFixture('synthetic-minimal.html'));
  assert.equal(ctx.issues.filter(i => i.id === 'base64-images').length, 0);
});
