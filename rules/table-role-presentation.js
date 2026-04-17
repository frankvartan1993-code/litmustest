'use strict';
const cheerio = require('cheerio');

module.exports = {
  id: 'table-role-presentation',
  category: 'polish',
  weight: 1,
  detect(ctx) {
    const missing = ctx.$('table').filter((_, el) => !el.attribs.role);
    if (missing.length > 0) {
      ctx.issues.push({
        id: 'table-role-presentation',
        category: 'polish',
        weight: 1,
        severity: 'info',
        detail: `${missing.length} table(s) missing role="presentation"`,
        fixable: true,
        count: missing.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'table-role-presentation' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('table').each((_, el) => {
      if (!el.attribs.role) { el.attribs.role = 'presentation'; count++; }
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'table-role-presentation', category: 'polish', summary: `Added role="presentation" to ${count} layout table(s)`, count });
  }
};
