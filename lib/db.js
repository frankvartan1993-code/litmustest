'use strict';
const { Pool } = require('pg');

let pool = null;
function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  return pool;
}

async function recordSubmission(row) {
  const p = getPool();
  if (!p) return null;
  const q = `
    INSERT INTO submissions
      (campaign_name, score, grade, bytes_before, bytes_after,
       macros_before, macros_intact, issues_detected, fixes_applied, hard_fail, duration_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id`;
  const vals = [
    row.campaignName || null,
    row.score, row.grade,
    row.bytesBefore, row.bytesAfter,
    row.macrosBefore, row.macrosIntact,
    JSON.stringify(row.issuesDetected),
    JSON.stringify(row.fixesApplied),
    row.hardFail, row.durationMs
  ];
  try {
    const { rows } = await p.query(q, vals);
    return rows[0].id;
  } catch (err) {
    console.error('recordSubmission error:', err.message);
    return null;
  }
}

async function getStats() {
  const p = getPool();
  if (!p) return null;
  try {
    const [total, avg, firstPass, topIssues, topFixes, recent] = await Promise.all([
      p.query('SELECT COUNT(*)::int AS n FROM submissions'),
      p.query('SELECT COALESCE(ROUND(AVG(score))::int, 0) AS avg FROM submissions'),
      p.query(`SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE score >= 90) / NULLIF(COUNT(*),0))::int, 0) AS pct FROM submissions`),
      p.query(`SELECT issue->>'id' AS id, COUNT(*)::int AS n FROM submissions, jsonb_array_elements(issues_detected) AS issue GROUP BY 1 ORDER BY n DESC LIMIT 5`),
      p.query(`SELECT fix->>'id' AS id, COUNT(*)::int AS n FROM submissions, jsonb_array_elements(fixes_applied) AS fix GROUP BY 1 ORDER BY n DESC LIMIT 5`),
      p.query(`SELECT id, created_at, campaign_name, score, grade FROM submissions ORDER BY created_at DESC LIMIT 30`)
    ]);
    return {
      emailsQad: total.rows[0].n,
      avgScore: avg.rows[0].avg,
      firstPassPct: firstPass.rows[0].pct,
      topIssues: topIssues.rows,
      topFixes: topFixes.rows,
      recent: recent.rows
    };
  } catch (err) {
    console.error('getStats error:', err.message);
    return null;
  }
}

module.exports = { recordSubmission, getStats, getPool };
