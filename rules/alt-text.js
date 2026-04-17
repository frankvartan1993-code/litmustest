'use strict';

module.exports = {
  id: 'alt-text',
  category: 'compliance',
  weight: 3,
  detect(ctx) {
    const imgsMissing = ctx.$('img').filter((_, el) => !('alt' in el.attribs));
    if (imgsMissing.length > 0) {
      ctx.issues.push({
        id: 'alt-text',
        category: 'compliance',
        weight: 3,
        severity: 'warn',
        detail: `${imgsMissing.length} image(s) missing alt attribute`,
        fixable: true,
        count: imgsMissing.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'alt-text' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.html = ctx.html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
      if (/\balt\s*=/i.test(attrs)) return match;
      count++;
      return `<img${attrs} alt="">`;
    });
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'alt-text', category: 'compliance', summary: `Added alt="" to ${count} image(s)`, count });
  }
};
