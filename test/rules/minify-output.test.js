'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/minify-output');
const { runRule } = require('../helpers');

test('minify-output: shrinks whitespace while preserving macros and MSO blocks', async () => {
  const html = '<html>\n  <head>\n    <title>t</title>\n  </head>\n  <body>\n    <!--[if mso]><xml></xml><![endif]-->\n    <p>  Hello [#Contact.FirstName#]  </p>\n  </body>\n</html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.html.length < html.length);
  assert.match(ctx.html, /\[#Contact\.FirstName#\]/);
  assert.match(ctx.html, /<!--\[if mso\]>/);
});
