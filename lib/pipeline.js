'use strict';
const parse = require('./parse');
const { captureMacros } = parse;

const GRADES = { ready: 90, review: 75 };

function gradeFor(score) {
  if (score >= GRADES.ready) return 'ready';
  if (score >= GRADES.review) return 'review';
  return 'blocked';
}

async function run(html, { rules }) {
  const ctx = parse(html);
  ctx.ruleErrors = [];
  const safeCall = (rule, stage) => {
    try {
      rule[stage] && rule[stage](ctx);
    } catch (err) {
      ctx.ruleErrors.push({ id: rule.id, stage, message: err.message });
    }
  };

  const ordered = [...rules].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const rule of ordered) safeCall(rule, 'detect');

  async function safeFix(rule) {
    try {
      const res = rule.fix && rule.fix(ctx);
      if (res && typeof res.then === 'function') await res;
    } catch (err) {
      ctx.ruleErrors.push({ id: rule.id, stage: 'fix', message: err.message });
    }
  }
  for (const rule of ordered) await safeFix(rule);

  ctx.macros.after = captureMacros(ctx.html);
  const macrosIntact =
    ctx.macros.before.length === ctx.macros.after.length &&
    ctx.macros.before.every((m, i) => m === ctx.macros.after[i]);

  let score = 100;
  let capped = false;
  let hardFail = false;
  const breakdown = { deliverability: 0, outlook: 0, mobile: 0, compliance: 0, polish: 0 };
  for (const issue of ctx.issues) {
    if (issue.fixed) continue;
    score -= issue.weight;
    if (breakdown[issue.category] !== undefined) breakdown[issue.category] += issue.weight;
  }
  if (!macrosIntact) { score = Math.min(score, 50); hardFail = true; capped = true; }
  if (ctx.issues.find(i => i.cap74 && !i.fixed)) { score = Math.min(score, 74); capped = true; }
  if (score < 0) score = 0;

  ctx.score = {
    value: score,
    grade: gradeFor(score),
    hardFail,
    capped,
    macrosIntact,
    breakdown
  };
  return ctx;
}

module.exports = { run, gradeFor };
