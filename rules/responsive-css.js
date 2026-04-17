'use strict';

module.exports = {
  id: 'responsive-css',
  category: 'mobile',
  weight: 5,
  detect(ctx) {
    const hasMedia = /@media[^{]*\{/i.test(ctx.html);
    if (!hasMedia) {
      ctx.issues.push({
        id: 'responsive-css',
        category: 'mobile',
        weight: 5,
        severity: 'warn',
        detail: 'No @media queries detected — email may not adapt to mobile',
        fixable: false
      });
    }
  },
  fix() {}
};
