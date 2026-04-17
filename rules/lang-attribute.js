'use strict';

module.exports = {
  id: 'lang-attribute',
  category: 'compliance',
  weight: 2,
  detect(ctx) {
    if (!ctx.$('html').attr('lang')) {
      ctx.issues.push({
        id: 'lang-attribute',
        category: 'compliance',
        weight: 2,
        severity: 'warn',
        detail: 'Missing lang attribute on <html>',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'lang-attribute' && !i.fixed);
    if (!issue) return;
    if (/<html(?![^>]*\blang=)/i.test(ctx.html)) {
      ctx.html = ctx.html.replace(/<html\b([^>]*)>/i, '<html lang="en"$1>');
    }
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'lang-attribute', category: 'compliance', summary: 'Added lang="en" to <html>', count: 1 });
  }
};
