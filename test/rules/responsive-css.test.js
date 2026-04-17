'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/responsive-css');
const { runRule } = require('../helpers');

test('responsive-css: flags when no @media queries present', async () => {
  const html = '<html><head><style>body{margin:0}</style></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'responsive-css'));
});

test('responsive-css: quiet when @media present', async () => {
  const html = '<html><head><style>@media (max-width:480px){body{font-size:14px}}</style></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'responsive-css').length, 0);
});
