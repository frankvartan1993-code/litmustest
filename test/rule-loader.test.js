'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const { loadRules } = require('../lib/ruleLoader');

test('loadRules returns an array', () => {
  const rules = loadRules(path.join(__dirname, '..', 'rules'));
  assert.ok(Array.isArray(rules));
});

test('loadRules rejects a rule missing required fields', () => {
  const tmp = path.join(__dirname, 'tmp-rules');
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'bad.js'), "module.exports = { id: 'bad' };");
  assert.throws(() => loadRules(tmp), /missing/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});
