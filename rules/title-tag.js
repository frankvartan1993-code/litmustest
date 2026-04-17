'use strict';

module.exports = {
  id: 'title-tag',
  category: 'polish',
  weight: 1,
  detect(ctx) {
    const titleText = (ctx.$('title').first().text() || '').trim();
    if (!titleText) {
      ctx.issues.push({
        id: 'title-tag',
        category: 'polish',
        weight: 1,
        severity: 'info',
        detail: 'Empty or missing <title>',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'title-tag' && !i.fixed);
    if (!issue) return;
    const h1 = (ctx.$('h1').first().text() || '').trim();
    if (h1) {
      ctx.html = ctx.html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${h1}</title>`);
      ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
      issue.fixed = true;
      ctx.fixesApplied.push({ id: 'title-tag', category: 'polish', summary: `Set <title> from first <h1>`, count: 1 });
    }
  }
};
