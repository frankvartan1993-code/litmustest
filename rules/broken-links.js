'use strict';

function isMacro(href) { return /\[#[^#\]]+#\]/.test(href); }

module.exports = {
  id: 'broken-links',
  category: 'deliverability',
  weight: 2,
  detect(ctx) {
    const broken = [];
    ctx.$('a[href]').each((_, el) => {
      const href = (el.attribs.href || '').trim();
      if (!href || href === '#') { broken.push(href); return; }
      if (isMacro(href)) return;
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(href)) broken.push(href);
    });
    if (broken.length > 0) {
      ctx.issues.push({
        id: 'broken-links',
        category: 'deliverability',
        weight: 2,
        severity: 'warn',
        detail: `${broken.length} broken or placeholder href(s): ${broken.slice(0, 3).join(', ')}`,
        fixable: false,
        count: broken.length
      });
    }
  },
  fix() {}
};
