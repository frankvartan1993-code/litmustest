'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/mso-line-height');
const { runRule } = require('../helpers');

test('mso-line-height: appends mso-line-height-rule to styles containing line-height', async () => {
  const html = '<html><body><p style="line-height: 1.5;">hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /mso-line-height-rule:\s*exactly/);
});

test('mso-line-height: ignores styles without line-height', async () => {
  const html = '<html><body><p style="color: red">hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.doesNotMatch(ctx.html, /mso-line-height-rule/);
});
