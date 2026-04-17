'use strict';

module.exports = {
  id: 'border-radius-fallback',
  category: 'outlook',
  weight: 2,
  detect(ctx) {
    const needs = ctx.$('[style]').filter((_, el) => {
      const s = el.attribs.style || '';
      return /border-radius\s*:/i.test(s) && !/mso-border-radius/i.test(s);
    });
    if (needs.length > 0) {
      ctx.issues.push({
        id: 'border-radius-fallback',
        category: 'outlook',
        weight: 2,
        severity: 'info',
        detail: `${needs.length} element(s) with border-radius need Outlook fallback`,
        fixable: true,
        count: needs.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'border-radius-fallback' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      if (/border-radius\s*:/i.test(s) && !/mso-border-radius/i.test(s)) {
        el.attribs.style = s.replace(/;?\s*$/, '') + '; mso-border-radius: 0';
        count++;
      }
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'border-radius-fallback', category: 'outlook', summary: `Added mso-border-radius:0 to ${count} element(s)`, count });
  }
};
