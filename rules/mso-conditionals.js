'use strict';

const MSO_BLOCK = `
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->`.trim();

module.exports = {
  id: 'mso-conditionals',
  category: 'outlook',
  weight: 5,
  detect(ctx) {
    if (!/<!--\[if\s+mso\]>/i.test(ctx.html)) {
      ctx.issues.push({
        id: 'mso-conditionals',
        category: 'outlook',
        weight: 5,
        severity: 'warn',
        detail: 'Missing <!--[if mso]> Outlook conditional block',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'mso-conditionals' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(/<\/head>/i, `${MSO_BLOCK}\n</head>`);
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'mso-conditionals', category: 'outlook', summary: 'Added Outlook MSO conditional block', count: 1 });
  }
};
