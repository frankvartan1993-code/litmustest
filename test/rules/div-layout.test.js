'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/div-layout');
const { runRule, loadFixture } = require('../helpers');

test('div-layout: flags when <div> count exceeds <table> count', async () => {
  const html = '<html><body><div><div><div>x</div></div></div></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'div-layout'));
});

test('div-layout: quiet when tables dominate', async () => {
  const ctx = await runRule(rule, loadFixture('synthetic-minimal.html'));
  assert.equal(ctx.issues.filter(i => i.id === 'div-layout').length, 0);
});
