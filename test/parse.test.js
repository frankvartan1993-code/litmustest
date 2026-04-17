'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const parse = require('../lib/parse');

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf8');
}

test('parse returns a ctx with html and macros captured', () => {
  const html = loadFixture('synthetic-minimal.html');
  const ctx = parse(html);
  assert.equal(typeof ctx.html, 'string');
  assert.equal(ctx.htmlIn, html);
  assert.deepEqual(ctx.macros.before.sort(), ['[#Contact.FirstName#]', '[#Unsubscribe.URL#]'].sort());
  assert.ok(ctx.$); // cheerio instance
  assert.deepEqual(ctx.issues, []);
  assert.deepEqual(ctx.fixesApplied, []);
});

test('parse captures every macro even if repeated', () => {
  const html = '<p>[#A#] [#B#] [#A#]</p>';
  const ctx = parse(html);
  assert.deepEqual(ctx.macros.before, ['[#A#]', '[#B#]', '[#A#]']);
});

test('parse handles html fragments without <html> wrapper', () => {
  const html = '<p>[#X#]</p>';
  const ctx = parse(html);
  assert.ok(ctx.html.includes('[#X#]'));
});
