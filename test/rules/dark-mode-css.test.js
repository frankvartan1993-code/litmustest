'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/dark-mode-css');
const { runRule } = require('../helpers');

test('dark-mode-css: adds baseline dark-mode rules to <head>', async () => {
  const html = '<html><head></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'dark-mode-css'));
  assert.match(ctx.html, /prefers-color-scheme:\s*dark/);
  assert.match(ctx.html, /\[data-ogsc\]/);
});

test('dark-mode-css: no-op when rule already present', async () => {
  const html = '<html><head><style>@media (prefers-color-scheme: dark){body{color:#fff}}[data-ogsc] body{color:#fff}</style></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'dark-mode-css').length, 0);
});
