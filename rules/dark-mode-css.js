'use strict';

const BLOCK = `
<style type="text/css">
@media (prefers-color-scheme: dark) {
  body, table, td { background: #1a1a1a !important; color: #eaeaea !important; }
  a { color: #9dd4ff !important; }
}
[data-ogsc] body, [data-ogsc] table, [data-ogsc] td { background: #1a1a1a !important; color: #eaeaea !important; }
[data-ogsc] a { color: #9dd4ff !important; }
</style>`.trim();

module.exports = {
  id: 'dark-mode-css',
  category: 'polish',
  weight: 3,
  detect(ctx) {
    const already = /prefers-color-scheme:\s*dark/i.test(ctx.html) && /\[data-ogsc\]/i.test(ctx.html);
    if (!already) {
      ctx.issues.push({
        id: 'dark-mode-css',
        category: 'polish',
        weight: 3,
        severity: 'info',
        detail: 'No dark-mode CSS detected',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'dark-mode-css' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(/<\/head>/i, `${BLOCK}\n</head>`);
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'dark-mode-css', category: 'polish', summary: 'Added dark-mode CSS (prefers-color-scheme + [data-ogsc])', count: 1 });
  }
};
