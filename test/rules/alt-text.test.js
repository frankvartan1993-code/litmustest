'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/alt-text');
const { runRule } = require('../helpers');

test('alt-text: adds alt="" to images missing alt', async () => {
  const html = '<html><body><img src="a.png"><img src="b.png" alt="logo"></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'alt-text'));
  const imgs = (ctx.html.match(/<img[^>]*>/g) || []);
  assert.ok(imgs.every(tag => /alt=/.test(tag)));
});

test('alt-text: no issue when all images have alt', async () => {
  const html = '<html><body><img src="a.png" alt=""><img src="b.png" alt="x"></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'alt-text').length, 0);
});
