'use strict';
const test = require('node:test');
const assert = require('node:assert');
const renderPreview = require('../lib/renderPreview');

test('renderPreview: returns 8 panel configs', () => {
  const panels = renderPreview('<html><body>hi</body></html>');
  assert.equal(panels.length, 8);
  const ids = panels.map(p => p.id);
  assert.deepEqual(ids, [
    'gmail-desktop', 'gmail-mobile',
    'outlook-classic-desktop', 'outlook-classic-narrow',
    'outlook-new-desktop', 'outlook-new-mobile',
    'ipad-gmail', 'ipad-outlook'
  ]);
});

test('renderPreview: srcdoc escapes double quotes and includes layer link', () => {
  const panels = renderPreview('<p>"quoted"</p>');
  const gmail = panels.find(p => p.id === 'gmail-desktop');
  assert.ok(gmail.srcdoc.includes('&quot;quoted&quot;'));
  assert.ok(gmail.srcdoc.includes('/public/previews/gmail.css'));
});
