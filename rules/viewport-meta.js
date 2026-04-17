'use strict';

module.exports = {
  id: 'viewport-meta',
  category: 'mobile',
  weight: 6,
  detect(ctx) {
    const has = ctx.$('meta[name="viewport" i]').length > 0;
    if (!has) {
      ctx.issues.push({
        id: 'viewport-meta',
        category: 'mobile',
        weight: 6,
        severity: 'error',
        detail: 'Missing <meta name="viewport">',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'viewport-meta' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(
      /<head([^>]*)>/i,
      '<head$1><meta name="viewport" content="width=device-width,initial-scale=1">'
    );
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'viewport-meta', category: 'mobile', summary: 'Added viewport meta for mobile', count: 1 });
  }
};
