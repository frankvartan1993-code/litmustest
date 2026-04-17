'use strict';
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED = ['id', 'category', 'weight'];
const FUNCTIONS = ['detect', 'fix'];

function loadRules(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_'));
  return files.map(f => {
    const mod = require(path.join(dir, f));
    for (const key of REQUIRED) {
      if (mod[key] === undefined) throw new Error(`rule ${f}: missing ${key}`);
    }
    for (const fn of FUNCTIONS) {
      if (mod[fn] && typeof mod[fn] !== 'function') throw new Error(`rule ${f}: ${fn} is not a function`);
    }
    return mod;
  });
}

module.exports = { loadRules };
