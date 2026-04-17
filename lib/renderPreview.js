'use strict';

const PANELS = [
  { id: 'gmail-desktop',           label: 'Gmail Desktop',           width: 1024, layer: 'gmail.css' },
  { id: 'gmail-mobile',            label: 'Gmail Mobile',            width: 375,  layer: 'gmail.css' },
  { id: 'outlook-classic-desktop', label: 'Outlook Classic Desktop', width: 1024, layer: 'outlook-classic.css' },
  { id: 'outlook-classic-narrow',  label: 'Outlook Classic Narrow',  width: 375,  layer: 'outlook-classic.css' },
  { id: 'outlook-new-desktop',     label: 'Outlook New Desktop',     width: 1024, layer: 'outlook-new.css' },
  { id: 'outlook-new-mobile',      label: 'Outlook New Mobile',      width: 375,  layer: 'outlook-new.css' },
  { id: 'ipad-gmail',              label: 'iPad Gmail',              width: 768,  layer: 'gmail.css' },
  { id: 'ipad-outlook',            label: 'iPad Outlook',            width: 768,  layer: 'outlook-new.css' }
];

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildSrcdoc(html, layerFile) {
  const link = `<link rel="stylesheet" href="/public/previews/${layerFile}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${link}`);
  }
  return `<!DOCTYPE html><html><head>${link}</head><body>${html}</body></html>`;
}

function renderPreview(html) {
  return PANELS.map(panel => {
    const doc = buildSrcdoc(html, panel.layer);
    return {
      id: panel.id,
      label: panel.label,
      width: panel.width,
      srcdoc: escapeAttr(doc)
    };
  });
}

module.exports = renderPreview;
