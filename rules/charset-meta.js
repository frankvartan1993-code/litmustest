'use strict';

module.exports = {
  id: 'charset-meta',
  category: 'polish',
  weight: 1,
  detect(ctx) {
    const hasCharset = ctx.$('meta[charset], meta[http-equiv="Content-Type"]').length > 0;
    if (!hasCharset) {
      ctx.issues.push({
        id: 'charset-meta',
        category: 'polish',
        weight: 1,
        severity: 'warn',
        detail: 'Missing <meta charset>',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'charset-meta' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(/<head([^>]*)>/i, '<head$1><meta charset="utf-8">');
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'charset-meta', category: 'polish', summary: 'Added <meta charset="utf-8">', count: 1 });
  }
};
