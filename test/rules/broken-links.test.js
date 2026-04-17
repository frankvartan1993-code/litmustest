'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/broken-links');
const { runRule } = require('../helpers');

test('broken-links: flags empty and # hrefs, skips Creatio macros', async () => {
  const html = '<html><body><a href="">A</a><a href="#">B</a><a href="https://x">C</a><a href="[#Unsubscribe.URL#]">D</a></body></html>';
  const ctx = await runRule(rule, html);
  const issue = ctx.issues.find(i => i.id === 'broken-links');
  assert.ok(issue);
  assert.equal(issue.count, 2);
});
