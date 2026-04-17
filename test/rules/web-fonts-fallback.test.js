'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/web-fonts-fallback');
const { runRule } = require('../helpers');

test('web-fonts-fallback: flags font-family without Arial/sans-serif fallback', async () => {
  const html = `<html><body><p style='font-family: "Aktiv Grotesk"'>hi</p></body></html>`;
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'web-fonts-fallback'));
  assert.match(ctx.html, /Arial|sans-serif/);
});

test('web-fonts-fallback: no-op when Arial already present', async () => {
  const html = `<html><body><p style='font-family: "Aktiv Grotesk", Arial, sans-serif'>hi</p></body></html>`;
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'web-fonts-fallback').length, 0);
});
