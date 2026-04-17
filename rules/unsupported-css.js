'use strict';

const UNSUPPORTED = [
  { property: 'display', value: /\b(flex|grid|inline-flex|inline-grid)\b/i, label: 'display: flex/grid' },
  { property: 'position', value: /\b(absolute|fixed|sticky)\b/i, label: 'position: absolute/fixed/sticky' },
  { property: 'transform', value: /./, label: 'transform' },
  { property: 'object-fit', value: /./, label: 'object-fit' },
  { property: 'gap', value: /./, label: 'gap' }
];

function scan(css) {
  const offenders = [];
  for (const rule of UNSUPPORTED) {
    const re = new RegExp(`${rule.property}\\s*:\\s*([^;}"'\\n]+)`, 'gi');
    let m;
    while ((m = re.exec(css))) {
      if (rule.value.test(m[1])) offenders.push({ property: rule.label, value: m[1].trim() });
    }
  }
  return offenders;
}

module.exports = {
  id: 'unsupported-css',
  category: 'outlook',
  weight: 5,
  detect(ctx) {
    const offenders = [];
    ctx.$('style').each((_, el) => {
      const css = ctx.$(el).html() || '';
      offenders.push(...scan(css));
    });
    ctx.$('[style]').each((_, el) => {
      offenders.push(...scan(el.attribs.style || ''));
    });
    if (offenders.length > 0) {
      ctx.issues.push({
        id: 'unsupported-css',
        category: 'outlook',
        weight: 5,
        severity: 'warn',
        detail: `${offenders.length} unsupported-in-Outlook CSS declaration(s) detected`,
        fixable: false,
        offenders
      });
    }
  },
  fix() { /* flags only — rewriting flex/grid into tables requires design intent */ }
};
