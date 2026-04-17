'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/inline-css');
const { runRule } = require('../helpers');

test('inline-css: inlines <style> into element style attributes', async () => {
  const html = '<html><head><style>p { color: red; }</style></head><body><p>hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'inline-css'));
  assert.match(ctx.html, /<p[^>]*style="[^"]*color:\s*red/);
});

test('inline-css: preserves @media queries in <style>', async () => {
  const html = '<html><head><style>p{color:red}@media (max-width:480px){p{color:blue}}</style></head><body><p>hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /@media/);
});
