'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/tap-target-size');
const { runRule } = require('../helpers');

test('tap-target-size: flags <a> whose explicit width OR height is <44px', async () => {
  const html = '<html><body><a href="#" style="display:inline-block;width:30px;height:30px">x</a></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'tap-target-size'));
});
