'use strict';

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');

const requireAuth = require('./lib/auth');
const pipeline = require('./lib/pipeline');
const { loadRules } = require('./lib/ruleLoader');
const rules = loadRules(path.join(__dirname, 'rules'));

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
    const ctx = await pipeline.run(html, { rules });
    // Results template added in Task 44
    res.type('application/json').send(JSON.stringify({
      score: ctx.score,
      issues: ctx.issues,
      fixesApplied: ctx.fixesApplied,
      ruleErrors: ctx.ruleErrors
    }, null, 2));
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => console.log(`Email QA Agent on :${PORT}`));
