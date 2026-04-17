'use strict';

const UNSUBSCRIBE_MACRO_RE = /\[#\s*Unsubscribe\.URL\s*#\]/i;

module.exports = {
  id: 'unsubscribe-macro',
  category: 'compliance',
  weight: 6,
  detect(ctx) {
    if (!UNSUBSCRIBE_MACRO_RE.test(ctx.html)) {
      ctx.issues.push({
        id: 'unsubscribe-macro',
        category: 'compliance',
        weight: 6,
        severity: 'critical',
        detail: 'Missing [#Unsubscribe.URL#] — CASL/Law 25 risk',
        fixable: false,
        cap74: true
      });
    }
  },
  fix() { /* not fixable — designer must add in Creatio */ }
};
