'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/mso-conditionals');
const { runRule } = require('../helpers');

test('mso-conditionals: adds MSO block when missing', async () => {
  const html = '<html><head></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'mso-conditionals'));
  assert.match(ctx.html, /<!--\[if mso\]>/);
});

test('mso-conditionals: no-op when present', async () => {
  const html = '<html><head><!--[if mso]><xml></xml><![endif]--></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'mso-conditionals').length, 0);
});
