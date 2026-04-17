'use strict';

const DATA_URI_RE = /src\s*=\s*["']data:image\/[a-z]+;base64,([^"']+)["']/gi;

module.exports = {
  id: 'base64-images',
  category: 'deliverability',
  weight: 8,
  detect(ctx) {
    let match, count = 0, totalBytes = 0;
    while ((match = DATA_URI_RE.exec(ctx.html))) {
      count++;
      totalBytes += match[1].length;
    }
    if (count > 0) {
      ctx.issues.push({
        id: 'base64-images',
        category: 'deliverability',
        weight: 8,
        severity: 'error',
        detail: `${count} base64-inline image(s), ~${(totalBytes / 1024).toFixed(0)} KB. Outlook Classic strips these; Gmail clips long messages.`,
        fixable: false,
        count,
        totalBytes
      });
    }
  },
  fix() {}
};
