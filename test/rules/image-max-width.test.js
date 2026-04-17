'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/image-max-width');
const { runRule } = require('../helpers');

test('image-max-width: adds max-width:100%;height:auto to <img>', async () => {
  const html = '<html><body><img src="a.png" width="600"></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /max-width:\s*100%/);
  assert.match(ctx.html, /height:\s*auto/);
});

test('image-max-width: merges into existing style', async () => {
  const html = '<html><body><img src="a.png" style="border:0"></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /border:0/);
  assert.match(ctx.html, /max-width:\s*100%/);
});
