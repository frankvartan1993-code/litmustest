'use strict';
const cheerio = require('cheerio');

module.exports = {
  id: 'image-max-width',
  category: 'mobile',
  weight: 3,
  detect(ctx) {
    const needFix = ctx.$('img').filter((_, el) => {
      const style = el.attribs.style || '';
      return !/max-width\s*:/.test(style) || !/height\s*:\s*auto/.test(style);
    });
    if (needFix.length > 0) {
      ctx.issues.push({
        id: 'image-max-width',
        category: 'mobile',
        weight: 3,
        severity: 'warn',
        detail: `${needFix.length} image(s) missing max-width:100% for mobile`,
        fixable: true,
        count: needFix.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'image-max-width' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('img').each((_, el) => {
      const style = (el.attribs.style || '').trim().replace(/;?\s*$/, '');
      const parts = style.length ? style.split(';').map(s => s.trim()).filter(Boolean) : [];
      const hasMaxWidth = parts.some(p => /^max-width\s*:/i.test(p));
      const hasHeight = parts.some(p => /^height\s*:\s*auto/i.test(p));
      if (!hasMaxWidth) parts.push('max-width: 100%');
      if (!hasHeight) parts.push('height: auto');
      el.attribs.style = parts.join('; ');
      count++;
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'image-max-width', category: 'mobile', summary: `Added max-width:100%;height:auto to ${count} image(s)`, count });
  }
};
