'use strict';

const CLIP_BYTES = 102 * 1024;
const CAP_BYTES = 500 * 1024;

module.exports = {
  id: 'gmail-clipping',
  category: 'deliverability',
  weight: 15,
  detect(ctx) {
    const bytes = Buffer.byteLength(ctx.html, 'utf8');
    if (bytes <= CLIP_BYTES) return;
    const over = bytes > CAP_BYTES;
    ctx.issues.push({
      id: 'gmail-clipping',
      category: 'deliverability',
      weight: 15,
      severity: over ? 'critical' : 'error',
      detail: `Email is ${(bytes / 1024).toFixed(0)} KB; Gmail clips at 102 KB. ${over ? 'Exceeds 500 KB cap.' : ''}`.trim(),
      fixable: false,
      bytes,
      cap74: over || undefined
    });
  },
  fix() { /* not fixable — requires image externalization or content reduction */ }
};
