'use strict';

const MIN = 44;

function pxOf(style, prop) {
  const m = (style || '').match(new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`, 'i'));
  return m ? parseFloat(m[1]) : null;
}

module.exports = {
  id: 'tap-target-size',
  category: 'mobile',
  weight: 3,
  detect(ctx) {
    let count = 0;
    ctx.$('a, button').each((_, el) => {
      const s = el.attribs.style || '';
      const w = pxOf(s, 'width');
      const h = pxOf(s, 'height');
      if ((w !== null && w < MIN) || (h !== null && h < MIN)) count++;
    });
    if (count > 0) {
      ctx.issues.push({
        id: 'tap-target-size',
        category: 'mobile',
        weight: 3,
        severity: 'warn',
        detail: `${count} link(s)/button(s) under 44×44px — hard to tap on mobile`,
        fixable: false,
        count
      });
    }
  },
  fix() {}
};
