'use strict';

module.exports = {
  id: 'div-layout',
  category: 'outlook',
  weight: 5,
  detect(ctx) {
    const divs = ctx.$('div').length;
    const tables = ctx.$('table').length;
    if (divs > 0 && divs > tables * 2) {
      ctx.issues.push({
        id: 'div-layout',
        category: 'outlook',
        weight: 5,
        severity: 'warn',
        detail: `${divs} <div> vs ${tables} <table> — Outlook renders divs unreliably`,
        fixable: false
      });
    }
  },
  fix() { /* not fixable — requires design rework */ }
};
