'use strict';

const MIN_PX = 14;

module.exports = {
  id: 'min-font-size',
  category: 'mobile',
  weight: 3,
  detect(ctx) {
    const offenders = [];
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      const m = s.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i);
      if (m && parseFloat(m[1]) < MIN_PX) offenders.push(m[1]);
    });
    if (offenders.length > 0) {
      ctx.issues.push({
        id: 'min-font-size',
        category: 'mobile',
        weight: 3,
        severity: 'warn',
        detail: `${offenders.length} element(s) with font-size <14px (hard to read on mobile)`,
        fixable: false,
        count: offenders.length
      });
    }
  },
  fix() {}
};
