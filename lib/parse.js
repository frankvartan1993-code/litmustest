'use strict';
const cheerio = require('cheerio');

const MACRO_RE = /\[#[^#\]]+#\]/g;

function captureMacros(html) {
  const m = html.match(MACRO_RE);
  return m ? Array.from(m) : [];
}

function parse(html) {
  const $ = cheerio.load(html, { decodeEntities: false, xmlMode: false });
  return {
    htmlIn: html,
    html,
    $,
    macros: { before: captureMacros(html), after: [] },
    issues: [],
    fixesApplied: [],
    score: null,
    previews: []
  };
}

module.exports = parse;
module.exports.captureMacros = captureMacros;
