'use strict';

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');

const requireAuth = require('./lib/auth');
const pipeline = require('./lib/pipeline');
const { loadRules } = require('./lib/ruleLoader');
const renderPreview = require('./lib/renderPreview');
const db = require('./lib/db');
const rules = loadRules(path.join(__dirname, 'rules'));

const HEAVY_RULE_IDS = new Set(['inline-css', 'minify-output']);
const rulesLight = rules.filter(r => !HEAVY_RULE_IDS.has(r.id));

const PREVIEW_MAX_BYTES = 500 * 1024;

function buildChangelog(fixesApplied) {
  const byId = new Map();
  for (const f of fixesApplied) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }
  return Array.from(byId.values()).slice(0, 6).map(f => f.summary);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || 'change-me';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));
app.use(express.json({ limit: '20mb' }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' },
  store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 })
}));

app.get('/health', (req, res) => res.status(200).send('ok'));

app.use(requireAuth);

function render(res, view, locals = {}) {
  res.render(view, { ...locals }, (err, html) => {
    if (err) return res.status(500).send(err.message);
    res.render('layout', {
      title: locals.title || 'Email QA Agent',
      showHeader: locals.showHeader !== false,
      body: html
    });
  });
}

app.get('/login', (req, res) => render(res, 'login', { title: 'Sign in', showHeader: false, error: null }));

app.post('/login', (req, res) => {
  if (require('./lib/auth').check(APP_PASSWORD, req.body.password)) {
    req.session.authed = true;
    return res.redirect('/');
  }
  render(res, 'login', { title: 'Sign in', showHeader: false, error: 'Incorrect password.' });
});

app.get('/', (req, res) => render(res, 'landing', { title: 'Run QA' }));

app.post('/qa', async (req, res, next) => {
  try {
    const html = String(req.body.html || '');
    if (html.length === 0 || !html.includes('<')) {
      return res.status(400).send("Doesn't look like HTML — try pasting again.");
    }
    const bytesBefore = Buffer.byteLength(html, 'utf8');
    const oversized = bytesBefore > PREVIEW_MAX_BYTES;
    const activeRules = oversized ? rulesLight : rules;
    const startedAt = Date.now();
    const ctx = await pipeline.run(html, { rules: activeRules });
    const durationMs = Date.now() - startedAt;
    const bytesAfter = Buffer.byteLength(ctx.html, 'utf8');
    const previewSkipped = oversized || bytesAfter > PREVIEW_MAX_BYTES;
    const previews = previewSkipped ? [] : renderPreview(ctx.html);
    const changelog = buildChangelog(ctx.fixesApplied);
    db.recordSubmission({
      campaignName: String(req.body.campaign || '').slice(0, 200) || null,
      score: ctx.score.value,
      grade: ctx.score.grade,
      bytesBefore,
      bytesAfter,
      macrosBefore: ctx.macros.before,
      macrosIntact: ctx.score.macrosIntact,
      issuesDetected: ctx.issues,
      fixesApplied: ctx.fixesApplied,
      hardFail: ctx.score.hardFail,
      durationMs
    }).catch(() => {/* fire-and-forget; never block on DB */});
    render(res, 'results', {
      title: 'QA Results',
      score: ctx.score,
      changelog,
      previews,
      previewSkipped,
      bytesAfter,
      output: ctx.html
    });
  } catch (err) {
    next(err);
  }
});

app.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.getStats();
    render(res, 'stats', { title: 'Dashboard', stats });
  } catch (err) { next(err); }
});

app.listen(PORT, () => console.log(`Email QA Agent on :${PORT}`));
