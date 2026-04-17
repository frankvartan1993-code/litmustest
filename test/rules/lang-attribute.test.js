'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/lang-attribute');
const { runRule } = require('../helpers');

test('lang-attribute: adds lang="en" when missing', async () => {
  const ctx = await runRule(rule, '<html><head></head><body></body></html>');
  assert.ok(ctx.issues.find(i => i.id === 'lang-attribute'));
  assert.match(ctx.html, /<html\s+lang="en"/i);
});

test('lang-attribute: no-op when present', async () => {
  const ctx = await runRule(rule, '<html lang="fr"><body></body></html>');
  assert.equal(ctx.issues.filter(i => i.id === 'lang-attribute').length, 0);
});
