'use strict';

const LOW = 50 * 1024;
const HIGH = 102 * 1024;

module.exports = {
  id: 'oversize-warning',
  category: 'deliverability',
  weight: 5,
  detect(ctx) {
    const bytes = Buffer.byteLength(ctx.html, 'utf8');
    if (bytes >= LOW && bytes < HIGH) {
      ctx.issues.push({
        id: 'oversize-warning',
        category: 'deliverability',
        weight: 5,
        severity: 'warn',
        detail: `Email is ${(bytes / 1024).toFixed(0)} KB; approaching Gmail's 102 KB clipping threshold`,
        fixable: false,
        bytes
      });
    }
  },
  fix() {}
};
