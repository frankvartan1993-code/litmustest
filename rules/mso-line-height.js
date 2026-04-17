'use strict';

module.exports = {
  id: 'mso-line-height',
  category: 'outlook',
  weight: 2,
  detect(ctx) {
    const needs = ctx.$('[style]').filter((_, el) => {
      const s = el.attribs.style || '';
      return /line-height\s*:/i.test(s) && !/mso-line-height-rule/i.test(s);
    });
    if (needs.length > 0) {
      ctx.issues.push({
        id: 'mso-line-height',
        category: 'outlook',
        weight: 2,
        severity: 'info',
        detail: `${needs.length} element(s) with line-height missing mso-line-height-rule`,
        fixable: true,
        count: needs.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'mso-line-height' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      if (/line-height\s*:/i.test(s) && !/mso-line-height-rule/i.test(s)) {
        el.attribs.style = s.replace(/;?\s*$/, '') + '; mso-line-height-rule: exactly';
        count++;
      }
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'mso-line-height', category: 'outlook', summary: `Added mso-line-height-rule to ${count} element(s)`, count });
  }
};
