'use strict';

const FALLBACK = ', Arial, sans-serif';

module.exports = {
  id: 'web-fonts-fallback',
  category: 'outlook',
  weight: 3,
  detect(ctx) {
    const needs = ctx.$('[style]').filter((_, el) => {
      const s = el.attribs.style || '';
      if (!/font-family\s*:/i.test(s)) return false;
      const match = s.match(/font-family\s*:\s*([^;]+)/i);
      if (!match) return false;
      return !/\b(arial|helvetica|sans-serif|serif|monospace|system-ui)\b/i.test(match[1]);
    });
    if (needs.length > 0) {
      ctx.issues.push({
        id: 'web-fonts-fallback',
        category: 'outlook',
        weight: 3,
        severity: 'warn',
        detail: `${needs.length} element(s) have font-family without safe fallback`,
        fixable: true,
        count: needs.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'web-fonts-fallback' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      const match = s.match(/font-family\s*:\s*([^;]+)/i);
      if (!match) return;
      const value = match[1];
      if (/\b(arial|helvetica|sans-serif|serif|monospace|system-ui)\b/i.test(value)) return;
      el.attribs.style = s.replace(match[0], `font-family: ${value.trim()}${FALLBACK}`);
      count++;
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'web-fonts-fallback', category: 'outlook', summary: `Added Arial fallback to ${count} font-family declaration(s)`, count });
  }
};
