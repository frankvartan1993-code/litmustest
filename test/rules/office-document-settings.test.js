'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/office-document-settings');
const { runRule } = require('../helpers');

test('office-document-settings: detects missing PixelsPerInch', async () => {
  const html = '<html><head><!--[if mso]><style></style><![endif]--></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'office-document-settings'));
});

test('office-document-settings: no-op when present', async () => {
  const html = '<html><head><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'office-document-settings').length, 0);
});
