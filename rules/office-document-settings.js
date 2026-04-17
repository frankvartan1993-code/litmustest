'use strict';

module.exports = {
  id: 'office-document-settings',
  category: 'outlook',
  weight: 3,
  detect(ctx) {
    if (!/OfficeDocumentSettings|PixelsPerInch/i.test(ctx.html)) {
      ctx.issues.push({
        id: 'office-document-settings',
        category: 'outlook',
        weight: 3,
        severity: 'info',
        detail: 'Missing PixelsPerInch=96 (Outlook DPI fix)',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'office-document-settings' && !i.fixed);
    if (!issue) return;
    const inject = `<!--[if mso]><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->`;
    ctx.html = ctx.html.replace(/<\/head>/i, `${inject}\n</head>`);
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'office-document-settings', category: 'outlook', summary: 'Added PixelsPerInch=96 for Outlook DPI', count: 1 });
  }
};
