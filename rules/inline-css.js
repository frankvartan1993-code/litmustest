'use strict';
const juice = require('juice');
const cheerio = require('cheerio');

module.exports = {
  id: 'inline-css',
  category: 'polish',
  weight: 3,
  detect(ctx) {
    const hasStyleBlocks = ctx.$('style').length > 0;
    if (hasStyleBlocks) {
      ctx.issues.push({
        id: 'inline-css',
        category: 'polish',
        weight: 3,
        severity: 'info',
        detail: `${ctx.$('style').length} <style> block(s) to inline`,
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'inline-css' && !i.fixed);
    if (!issue) return;
    try {
      ctx.html = juice(ctx.html, {
        preserveMediaQueries: true,
        preserveFontFaces: true,
        preserveImportant: true,
        applyAttributesTableElements: true,
        removeStyleTags: false
      });
      ctx.$ = cheerio.load(ctx.html, { decodeEntities: false });
      issue.fixed = true;
      ctx.fixesApplied.push({ id: 'inline-css', category: 'polish', summary: 'Inlined <style> blocks (media queries preserved)', count: 1 });
    } catch (err) {
      issue.error = err.message;
    }
  }
};
