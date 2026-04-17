'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/unsupported-css');
const { runRule, loadFixture } = require('../helpers');

test('unsupported-css: flags flex, grid, position', async () => {
  const ctx = await runRule(rule, loadFixture('bad-css-flex.html'));
  const issue = ctx.issues.find(i => i.id === 'unsupported-css');
  assert.ok(issue);
  assert.ok(Array.isArray(issue.offenders));
  assert.ok(issue.offenders.some(o => /flex/i.test(o.property)));
  assert.ok(issue.offenders.some(o => /position/i.test(o.property)));
});
