'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/charset-meta');
const { runRule } = require('../helpers');

test('charset-meta: detects missing and adds utf-8', async () => {
  const html = '<html><head><title>x</title></head><body>hi</body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'charset-meta'));
  assert.match(ctx.html, /<meta\s+charset="utf-8"/i);
});

test('charset-meta: no-op when already present', async () => {
  const html = '<html><head><meta charset="utf-8"><title>x</title></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'charset-meta').length, 0);
});
