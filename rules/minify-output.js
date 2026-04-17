'use strict';
const { minify } = require('html-minifier-terser');

module.exports = {
  id: 'minify-output',
  category: 'polish',
  weight: 1,
  order: 9999, // runs last; pipeline honors this in Task 42
  detect(ctx) {
    // Always offer the opportunity — the fix always runs if ctx.html isn't already minified
    ctx.issues.push({
      id: 'minify-output',
      category: 'polish',
      weight: 1,
      severity: 'info',
      detail: 'Output can be minified',
      fixable: true
    });
  },
  async fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'minify-output' && !i.fixed);
    if (!issue) return;
    try {
      const before = ctx.html.length;
      ctx.html = await minify(ctx.html, {
        collapseWhitespace: true,
        conservativeCollapse: true,
        preserveLineBreaks: false,
        removeComments: false, // keep <!--[if mso]> blocks
        minifyCSS: true,
        minifyJS: false,
        keepClosingSlash: true,
        html5: false
      });
      const saved = before - ctx.html.length;
      issue.fixed = true;
      ctx.fixesApplied.push({ id: 'minify-output', category: 'polish', summary: `Minified output (saved ${(saved/1024).toFixed(1)} KB)`, count: 1 });
    } catch (err) {
      issue.error = err.message;
    }
  }
};
