'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/viewport-meta');
const { runRule, loadFixture } = require('../helpers');

test('viewport-meta: detects missing and adds viewport meta', async () => {
  const ctx = await runRule(rule, loadFixture('no-viewport.html'));
  assert.ok(ctx.issues.find(i => i.id === 'viewport-meta'));
  assert.match(ctx.html, /<meta\s+name="viewport"/i);
  assert.match(ctx.html, /width=device-width/);
});

test('viewport-meta: idempotent', async () => {
  const html = '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'viewport-meta').length, 0);
});
