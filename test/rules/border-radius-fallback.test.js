'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/border-radius-fallback');
const { runRule } = require('../helpers');

test('border-radius-fallback: adds mso-border-radius override where border-radius present', async () => {
  const html = '<html><body><div style="border-radius: 8px;">hi</div></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /mso-border-radius\s*:/);
});
