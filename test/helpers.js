'use strict';
const fs = require('node:fs');
const path = require('node:path');
const parse = require('../lib/parse');

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf8');
}

async function runRule(rule, html) {
  const ctx = parse(html);
  if (rule.detect) rule.detect(ctx);
  if (rule.fix) await rule.fix(ctx);
  ctx.macros.after = require('../lib/parse').captureMacros(ctx.html);
  return ctx;
}

module.exports = { loadFixture, runRule };
