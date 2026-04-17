'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/min-font-size');
const { runRule } = require('../helpers');

test('min-font-size: flags font-size below 14px', async () => {
  const html = '<html><body><p style="font-size: 11px;">hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'min-font-size'));
});

test('min-font-size: quiet when >=14px or not set', async () => {
  const ok = await runRule(rule, '<html><body><p style="font-size: 16px">hi</p></body></html>');
  assert.equal(ok.issues.filter(i => i.id === 'min-font-size').length, 0);
});
