'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/title-tag');
const { runRule } = require('../helpers');

test('title-tag: flags empty title and backfills from h1', async () => {
  const html = '<html><head><title></title></head><body><h1>Steri-Tamp Seals</h1></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'title-tag'));
  assert.match(ctx.html, /<title>Steri-Tamp Seals<\/title>/);
});

test('title-tag: flags but does not fill when no h1', async () => {
  const html = '<html><head><title></title></head><body>Hi</body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'title-tag'));
});
