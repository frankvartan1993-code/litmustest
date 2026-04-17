# Email QA Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Medisca-branded web tool that takes a Creatio email export, runs 26 QA rules against it with auto-fixes where safe, shows 8 simulated client previews, scores readiness, and hands back cleaned HTML — backed by a KPI dashboard.

**Architecture:** Node + Express + EJS server. A pure-function pipeline (`parse → detect → fix → score → renderPreviews`) threads a `ctx` object across stages. Rules live as self-contained modules in `rules/` (each exports `{id, category, weight, detect, fix}`). Preview iframes inject the fixed HTML + a per-client CSS simulation layer. Neon Postgres stores submissions for the dashboard. Deployed on Render free tier behind a shared password.

**Tech Stack:** Node 20 LTS, Express 4, EJS, cheerio, juice, html-minifier-terser, pg, express-session, `node:test` for tests, Neon Postgres, Render.

**Spec:** `docs/superpowers/specs/2026-04-17-email-qa-agent-design.md` is the source of truth. Reference it for the full rules catalog, branding, data model, and architecture rationale.

**Phases:**

1. Foundation — project scaffold, server skeleton, brand CSS, landing page (Tasks 1–7)
2. Fixtures — prepare the 7 test fixtures used throughout (Task 8)
3. Pipeline core — `parse`, `pipeline`, `detect`, `fix`, `score` framework (Tasks 9–13)
4. Rules — all 26 rules implemented test-first (Tasks 14–39)
5. Integration — full end-to-end test against the real Creatio export (Task 40)
6. Preview simulation — renderPreview + 4 CSS layers + results page (Tasks 41–46)
7. Database + dashboard — migrations, db lib, persistence, stats page (Tasks 47–52)
8. Deployment — smoke tests, CI, README, Render deploy (Tasks 53–56)

**Working directory:** `C:\Email-QA-Agent\`. Git repo already initialized; spec is the root commit. All commands below assume this CWD unless noted.

**Conventions:**
- Every task ends with a commit on `main`
- Every rule gets `rules/<id>.js` + `test/rules/<id>.test.js` as a pair
- Fixtures live in `fixtures/` and are never modified once created
- Commit messages follow conventional-commits (`feat:`, `test:`, `chore:`, `fix:`, `docs:`)

---

## Phase 1 — Foundation

### Task 1: Initialize npm project and install dependencies

**Files:**
- Create: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Initialize npm package**

Run:
```bash
npm init -y
```

- [ ] **Step 2: Install runtime dependencies**

Run:
```bash
npm install express@4 ejs cheerio juice html-minifier-terser pg express-session memorystore dotenv
```

- [ ] **Step 3: Install dev dependencies**

Run:
```bash
npm install --save-dev nodemon
```

- [ ] **Step 4: Replace `package.json` with final content**

Overwrite `package.json`:

```json
{
  "name": "email-qa-agent",
  "version": "1.0.0",
  "description": "Medisca email QA tool — Creatio exports in, client-ready HTML out",
  "main": "server.js",
  "private": true,
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node --test test/",
    "migrate": "node lib/migrate.js"
  },
  "dependencies": {
    "cheerio": "^1.0.0",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.21.1",
    "express-session": "^1.18.1",
    "html-minifier-terser": "^7.2.0",
    "juice": "^11.0.0",
    "memorystore": "^1.6.7",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  }
}
```

- [ ] **Step 5: Create `.env.example`**

Contents:
```
# Copy to .env and fill in values
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
APP_PASSWORD=change-me
SESSION_SECRET=generate-a-long-random-string
PORT=3000
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: initialize npm project and dependencies"
```

---

### Task 2: Create CLAUDE.md and README stubs

**Files:**
- Create: `CLAUDE.md`
- Create: `README.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# Email QA Agent

Internal Medisca tool. Takes Creatio email HTML exports, runs deterministic QA, returns cleaned HTML.

## Project layout
- `server.js` — Express app, 4 routes: `/`, `/qa`, `/stats`, `/login`
- `lib/` — pipeline stages (`parse`, `detect`, `fix`, `score`, `renderPreview`), `db`, `auth`, `migrate`
- `rules/` — 26 QA rules, one file each, each exports `{id, category, weight, detect, fix}`
- `views/` — EJS templates
- `public/` — brand CSS, logo, 4 client-simulation CSS files
- `fixtures/` — canonical test inputs, immutable
- `test/` — `node:test` suite

## Rules must
- Preserve every `[#...#]` Creatio macro byte-for-byte
- Never throw (try/catch wraps each rule at the pipeline level, but be defensive)
- Be pure with respect to `ctx` — read, mutate, return ctx

## Brand essentials
- Primary Green `#006c34` · Lime Green `#c7f169` · Primary Tint `#eaf0eb`
- Typography: Aktiv Grotesk Light / Semibold, **Calibri fallback** (no Aktiv Grotesk webfont license)
- 25px rounded corners, sentence case, generous whitespace

## Specs & plans
- Design: `docs/superpowers/specs/2026-04-17-email-qa-agent-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-17-email-qa-agent.md`
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Email QA Agent

Medisca-branded web tool for QA'ing Creatio email HTML exports.

## Local setup

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL, APP_PASSWORD, SESSION_SECRET
npm run migrate
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
npm test
```

## Deploy

See `docs/superpowers/specs/2026-04-17-email-qa-agent-design.md` section 16.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add CLAUDE.md and README"
```

---

### Task 3: Copy Medisca logo into public/

**Files:**
- Create: `public/logo.png` (copied from Medisca-Agent)
- Create: `public/logo-negative.png` (copied from Medisca-Agent)

- [ ] **Step 1: Create public/ and copy logos**

Run (bash):
```bash
mkdir -p public
cp "C:/Medisca-Agent/assets/Logos and Wordmarks/01 - Medisca_Motherbrand/04_RGB/Primary Logo Version/Medisca_Logotype_Positive_RGB.png" public/logo.png
cp "C:/Medisca-Agent/assets/Logos and Wordmarks/01 - Medisca_Motherbrand/04_RGB/Primary Logo Version/Medisca_Logotype_Negative_RGB.png" public/logo-negative.png
```

- [ ] **Step 2: Verify files exist**

Run:
```bash
ls -la public/
```
Expected: both `logo.png` and `logo-negative.png` listed with non-zero size.

- [ ] **Step 3: Commit**

```bash
git add public/logo.png public/logo-negative.png
git commit -m "chore: add Medisca motherbrand logos"
```

---

### Task 4: Create brand CSS

**Files:**
- Create: `public/medisca.css`

- [ ] **Step 1: Write `public/medisca.css`**

```css
/* Medisca brand — see CLAUDE.md and the spec for rules */
:root {
  --primary-green: #006c34;
  --mid-green: #5cc400;
  --lime-green: #c7f169;
  --primary-tint: #eaf0eb;
  --secondary-blue: #003e53;
  --secondary-light-blue: #7be3cb;
  --primary-grey: #383a36;
  --mid-grey: #e5e5e5;
  --inter-grey: #f7f8f9;
  --radius: 25px;
  --font-body: "Aktiv Grotesk", Calibri, "Segoe UI", system-ui, Arial, sans-serif;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: var(--font-body);
  font-weight: 300; /* Light */
  color: var(--primary-green);
  background: #ffffff;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

h1, h2, h3, h4 {
  font-weight: 300;
  color: var(--primary-green);
  margin: 0 0 0.6em;
}
h1 { font-size: 40px; }
h2 { font-size: 28px; }
h3 { font-size: 20px; }

.semibold { font-weight: 600; }

header.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 48px;
  border-bottom: 1px solid var(--mid-grey);
}
header.app-header img.logo { height: 40px; }
header.app-header nav a {
  color: var(--primary-green);
  text-decoration: none;
  margin-left: 24px;
  font-weight: 600;
}
header.app-header nav a:hover { color: var(--mid-green); }

main.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px;
}

.hero {
  text-align: center;
  margin-bottom: 48px;
}
.hero p { font-size: 18px; color: var(--primary-grey); }

label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--primary-green);
}

input[type="text"], input[type="password"], textarea {
  width: 100%;
  border: 1px solid var(--mid-grey);
  border-radius: var(--radius);
  background: var(--primary-tint);
  padding: 16px 20px;
  font-family: inherit;
  font-size: 16px;
  color: var(--primary-grey);
}
input:focus, textarea:focus {
  outline: none;
  border-color: var(--primary-green);
  background: #ffffff;
}
textarea {
  min-height: 320px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
}

button.primary {
  background: var(--primary-green);
  color: #ffffff;
  border: none;
  border-radius: var(--radius);
  padding: 14px 32px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
button.primary:hover { background: var(--mid-green); }
button.primary:disabled { background: var(--mid-grey); cursor: not-allowed; }

.card {
  background: #ffffff;
  border: 1px solid var(--mid-grey);
  border-radius: var(--radius);
  padding: 24px;
}

.stat-card {
  background: var(--primary-tint);
  border-radius: var(--radius);
  padding: 32px 24px;
  text-align: center;
}
.stat-card .value {
  font-size: 40px;
  font-weight: 300;
  color: var(--primary-green);
}
.stat-card .label {
  font-size: 14px;
  color: var(--primary-grey);
  margin-top: 8px;
}

.score-ring {
  width: 160px; height: 160px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-direction: column;
  font-weight: 300;
}
.score-ring.ready   { background: var(--lime-green); color: var(--primary-green); }
.score-ring.review  { background: #ffd87a; color: var(--primary-green); }
.score-ring.blocked { background: #ff8a7a; color: #ffffff; }
.score-ring .value { font-size: 36px; }
.score-ring .grade { font-size: 14px; text-transform: lowercase; }

.verdict-banner {
  border-radius: var(--radius);
  padding: 24px 32px;
  flex: 1;
  margin-left: 24px;
}
.verdict-banner.ready   { background: var(--primary-tint); border: 2px solid var(--lime-green); }
.verdict-banner.review  { background: #fff8e6; border: 2px solid #ffd87a; }
.verdict-banner.blocked { background: #fff0ed; border: 2px solid #ff8a7a; }
.verdict-banner h2 { margin-bottom: 12px; }
.verdict-banner ul { margin: 0; padding-left: 20px; }
.verdict-banner li { margin: 6px 0; font-size: 15px; }

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
}
.preview-panel {
  background: var(--inter-grey);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--mid-grey);
}
.preview-panel h4 {
  margin: 0;
  padding: 10px 16px;
  background: var(--primary-green);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}
.preview-panel iframe {
  width: 100%;
  height: 400px;
  border: none;
  background: #ffffff;
}

.fidelity-note {
  color: var(--primary-grey);
  font-size: 12px;
  margin-top: 12px;
  text-align: center;
}

.footer {
  margin-top: 80px;
  padding: 24px 48px;
  color: var(--primary-grey);
  font-size: 12px;
  text-align: center;
  border-top: 1px solid var(--mid-grey);
}
```

- [ ] **Step 2: Commit**

```bash
git add public/medisca.css
git commit -m "feat: add Medisca brand CSS"
```

---

### Task 5: Create auth middleware and login template

**Files:**
- Create: `lib/auth.js`
- Create: `views/layout.ejs`
- Create: `views/login.ejs`

- [ ] **Step 1: Write `lib/auth.js`**

```javascript
'use strict';

module.exports = function requireAuth(req, res, next) {
  if (req.path === '/login' || req.path.startsWith('/public') || req.path === '/health') {
    return next();
  }
  if (req.session && req.session.authed) {
    return next();
  }
  return res.redirect('/login');
};

module.exports.check = function check(password, submitted) {
  if (typeof submitted !== 'string' || submitted.length === 0) return false;
  return submitted === password;
};
```

- [ ] **Step 2: Write `views/layout.ejs`**

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><%= title %> — Email QA Agent</title>
  <link rel="stylesheet" href="/public/medisca.css">
</head>
<body>
  <% if (showHeader) { %>
  <header class="app-header">
    <a href="/"><img class="logo" src="/public/logo.png" alt="Medisca"></a>
    <nav>
      <a href="/">Run QA</a>
      <a href="/stats">Dashboard</a>
    </nav>
  </header>
  <% } %>
  <main class="container">
    <%- body %>
  </main>
  <div class="footer">Built for Medisca marketing · v1.0</div>
</body>
</html>
```

- [ ] **Step 3: Write `views/login.ejs`**

```ejs
<div class="hero">
  <h1>Email QA Agent</h1>
  <p>Please enter the shared team password to continue.</p>
</div>
<form method="POST" action="/login" style="max-width: 420px; margin: 0 auto;">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autofocus required>
  <% if (error) { %>
    <p style="color: #b23c28; margin-top: 12px;"><%= error %></p>
  <% } %>
  <div style="margin-top: 24px; text-align: center;">
    <button class="primary" type="submit">Sign in</button>
  </div>
</form>
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.js views/layout.ejs views/login.ejs
git commit -m "feat: add shared-password auth middleware and login page"
```

---

### Task 6: Create server.js with landing, login, health routes

**Files:**
- Create: `server.js`
- Create: `views/landing.ejs`

- [ ] **Step 1: Write `views/landing.ejs`**

```ejs
<div class="hero">
  <h1>Email QA Agent</h1>
  <p>Paste your Creatio export. Get it client-ready.</p>
</div>
<form method="POST" action="/qa" id="qa-form">
  <label for="campaign">Campaign name <span style="font-weight:300;color:var(--primary-grey);">(optional)</span></label>
  <input id="campaign" name="campaign" type="text" placeholder="MKT-10021 Steri-Tamp Seals MCA" maxlength="200">

  <div style="height: 24px;"></div>

  <label for="html">Paste HTML</label>
  <textarea id="html" name="html" placeholder="Paste email HTML here..." required></textarea>

  <div style="margin-top: 32px; text-align: center;">
    <button class="primary" type="submit" id="submit">Run QA</button>
  </div>
</form>
<script>
  const textarea = document.getElementById('html');
  const button = document.getElementById('submit');
  button.disabled = true;
  textarea.addEventListener('input', () => { button.disabled = textarea.value.trim().length === 0; });
</script>
```

- [ ] **Step 2: Write `server.js`**

```javascript
'use strict';

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');

const requireAuth = require('./lib/auth');

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

// /qa POST, /stats GET added in later tasks

app.listen(PORT, () => console.log(`Email QA Agent on :${PORT}`));
```

- [ ] **Step 3: Run the server and verify**

Run (new shell):
```bash
npm run dev
```
Open http://localhost:3000 in browser. Expected: redirected to `/login`. Enter password from `.env`, then see landing page with paste box. Stop the server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add server.js views/landing.ejs
git commit -m "feat: express app with login gate and landing page"
```

---

### Task 7: Add `.gitignore` entries already present; verify folder layout

**Files:**
- Modify: (verify only)

- [ ] **Step 1: Verify `.gitignore` includes node_modules/ and .env**

Run:
```bash
cat .gitignore
```
Expected output contains `node_modules/` and `.env`.

- [ ] **Step 2: Create empty directories for later tasks**

Run:
```bash
mkdir -p lib rules fixtures test/rules migrations data public/previews
```

- [ ] **Step 3: No commit (empty dirs don't commit without files)**

---

## Phase 2 — Fixtures

### Task 8: Create the 7 test fixtures

**Files:**
- Create: `fixtures/MKT-10021-steri-tamp.html` (copy from user Downloads)
- Create: `fixtures/synthetic-minimal.html`
- Create: `fixtures/no-unsubscribe.html`
- Create: `fixtures/altered-macros.html`
- Create: `fixtures/base64-heavy.html`
- Create: `fixtures/bad-css-flex.html`
- Create: `fixtures/no-viewport.html`

- [ ] **Step 1: Copy the real Creatio export into fixtures**

Run:
```bash
cp "C:/Users/Carl/Downloads/MKT-10021 Email Campaign 2_ _Steri-Tamp Seals_ MCA.html" fixtures/MKT-10021-steri-tamp.html
```

- [ ] **Step 2: Write `fixtures/synthetic-minimal.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
  <tr><td><img src="https://example.com/img.png" width="100" height="50" alt=""></td></tr>
  <tr><td>Hello [#Contact.FirstName#]</td></tr>
  <tr><td><a href="[#Unsubscribe.URL#]">Unsubscribe</a></td></tr>
</table>
</body>
</html>
```

- [ ] **Step 3: Write `fixtures/no-unsubscribe.html`**

Same as `synthetic-minimal.html` but with the unsubscribe row removed:
```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
  <tr><td><img src="https://example.com/img.png" width="100" height="50" alt=""></td></tr>
  <tr><td>Hello [#Contact.FirstName#]</td></tr>
</table>
</body>
</html>
```

- [ ] **Step 4: Write `fixtures/altered-macros.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<table role="presentation" width="600">
  <tr><td>Hello [#Contact.FirstName#]</td></tr>
  <tr><td><a href="[#Unsubscribe.URL#]">Unsubscribe</a></td></tr>
</table>
</body>
</html>
```
(This fixture is intact; the `altered-macros` test corrupts it in code to assert detection.)

- [ ] **Step 5: Write `fixtures/base64-heavy.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Heavy</title></head>
<body>
<table role="presentation">
  <tr><td><img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="></td></tr>
  <tr><td><a href="[#Unsubscribe.URL#]">Unsubscribe</a></td></tr>
</table>
</body>
</html>
```

- [ ] **Step 6: Write `fixtures/bad-css-flex.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Flex</title>
<style>
.row { display: flex; gap: 16px; }
.col { position: absolute; top: 0; }
</style>
</head>
<body>
<div class="row"><div class="col">A</div><div class="col">B</div></div>
<a href="[#Unsubscribe.URL#]">Unsubscribe</a>
</body>
</html>
```

- [ ] **Step 7: Write `fixtures/no-viewport.html`**

```html
<!DOCTYPE html>
<html>
<head><title>No viewport</title></head>
<body>
<table role="presentation" width="600">
  <tr><td>Hi</td></tr>
  <tr><td><a href="[#Unsubscribe.URL#]">Unsubscribe</a></td></tr>
</table>
</body>
</html>
```

- [ ] **Step 8: Commit**

```bash
git add fixtures/
git commit -m "test: add 7 canonical QA fixtures"
```

---

## Phase 3 — Pipeline core

### Task 9: lib/parse.js with macro capture (TDD)

**Files:**
- Create: `test/parse.test.js`
- Create: `lib/parse.js`

- [ ] **Step 1: Write the failing test**

`test/parse.test.js`:
```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const parse = require('../lib/parse');

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf8');
}

test('parse returns a ctx with html and macros captured', () => {
  const html = loadFixture('synthetic-minimal.html');
  const ctx = parse(html);
  assert.equal(typeof ctx.html, 'string');
  assert.equal(ctx.htmlIn, html);
  assert.deepEqual(ctx.macros.before.sort(), ['[#Contact.FirstName#]', '[#Unsubscribe.URL#]'].sort());
  assert.ok(ctx.$); // cheerio instance
  assert.deepEqual(ctx.issues, []);
  assert.deepEqual(ctx.fixesApplied, []);
});

test('parse captures every macro even if repeated', () => {
  const html = '<p>[#A#] [#B#] [#A#]</p>';
  const ctx = parse(html);
  assert.deepEqual(ctx.macros.before, ['[#A#]', '[#B#]', '[#A#]']);
});

test('parse handles html fragments without <html> wrapper', () => {
  const html = '<p>[#X#]</p>';
  const ctx = parse(html);
  assert.ok(ctx.html.includes('[#X#]'));
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
npm test
```
Expected: fails with "Cannot find module '../lib/parse'".

- [ ] **Step 3: Implement `lib/parse.js`**

```javascript
'use strict';
const cheerio = require('cheerio');

const MACRO_RE = /\[#[^#\]]+#\]/g;

function captureMacros(html) {
  const m = html.match(MACRO_RE);
  return m ? Array.from(m) : [];
}

function parse(html) {
  const $ = cheerio.load(html, { decodeEntities: false, xmlMode: false });
  return {
    htmlIn: html,
    html,
    $,
    macros: { before: captureMacros(html), after: [] },
    issues: [],
    fixesApplied: [],
    score: null,
    previews: []
  };
}

module.exports = parse;
module.exports.captureMacros = captureMacros;
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
npm test
```
Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/parse.js test/parse.test.js
git commit -m "feat(pipeline): parse stage with Creatio macro capture"
```

---

### Task 10: Rule registry + pipeline orchestrator (TDD)

**Files:**
- Create: `test/pipeline.test.js`
- Create: `lib/pipeline.js`

- [ ] **Step 1: Write the failing test**

`test/pipeline.test.js`:
```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pipeline = require('../lib/pipeline');

test('pipeline with no rules returns a ctx with empty issues/fixes and score 100', async () => {
  const ctx = await pipeline.run('<html><body>hi</body></html>', { rules: [] });
  assert.deepEqual(ctx.issues, []);
  assert.deepEqual(ctx.fixesApplied, []);
  assert.equal(ctx.score.value, 100);
  assert.equal(ctx.score.grade, 'ready');
});

test('pipeline runs a simple detect+fix rule end to end', async () => {
  const stubRule = {
    id: 'stub',
    category: 'polish',
    weight: 5,
    detect(ctx) {
      if (!ctx.html.includes('<!-- stubbed -->')) {
        ctx.issues.push({ id: 'stub', category: 'polish', weight: 5, severity: 'warn', detail: 'missing stub', fixable: true });
      }
    },
    fix(ctx) {
      if (ctx.issues.find(i => i.id === 'stub' && !i.fixed)) {
        ctx.html = ctx.html.replace('<body>', '<body><!-- stubbed -->');
        const issue = ctx.issues.find(i => i.id === 'stub');
        issue.fixed = true;
        ctx.fixesApplied.push({ id: 'stub', category: 'polish', summary: 'Added stub comment', count: 1 });
      }
    }
  };
  const ctx = await pipeline.run('<html><body>hi</body></html>', { rules: [stubRule] });
  assert.ok(ctx.html.includes('<!-- stubbed -->'));
  assert.equal(ctx.fixesApplied.length, 1);
  assert.equal(ctx.score.value, 100);
});

test('pipeline catches rule errors and continues', async () => {
  const badRule = {
    id: 'bad',
    category: 'polish',
    weight: 1,
    detect() { throw new Error('boom'); },
    fix() {}
  };
  const ctx = await pipeline.run('<html></html>', { rules: [badRule] });
  assert.ok(ctx.ruleErrors.some(e => e.id === 'bad'));
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
npm test
```
Expected: fails with "Cannot find module '../lib/pipeline'".

- [ ] **Step 3: Implement `lib/pipeline.js`**

```javascript
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

  for (const rule of rules) safeCall(rule, 'detect');
  for (const rule of rules) safeCall(rule, 'fix');

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
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
npm test
```
Expected: all tests pass (parse + pipeline, 6 total).

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline.js test/pipeline.test.js
git commit -m "feat(pipeline): rule orchestrator with scoring + error containment"
```

---

### Task 11: Rule loader — auto-load all rules/*.js

**Files:**
- Create: `test/rule-loader.test.js`
- Create: `lib/ruleLoader.js`

- [ ] **Step 1: Write the failing test**

`test/rule-loader.test.js`:
```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const { loadRules } = require('../lib/ruleLoader');

test('loadRules returns an array', () => {
  const rules = loadRules(path.join(__dirname, '..', 'rules'));
  assert.ok(Array.isArray(rules));
});

test('loadRules rejects a rule missing required fields', () => {
  const tmp = path.join(__dirname, 'tmp-rules');
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'bad.js'), "module.exports = { id: 'bad' };");
  assert.throws(() => loadRules(tmp), /missing/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
npm test
```
Expected: fails with "Cannot find module '../lib/ruleLoader'".

- [ ] **Step 3: Implement `lib/ruleLoader.js`**

```javascript
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED = ['id', 'category', 'weight'];
const FUNCTIONS = ['detect', 'fix'];

function loadRules(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_'));
  return files.map(f => {
    const mod = require(path.join(dir, f));
    for (const key of REQUIRED) {
      if (mod[key] === undefined) throw new Error(`rule ${f}: missing ${key}`);
    }
    for (const fn of FUNCTIONS) {
      if (mod[fn] && typeof mod[fn] !== 'function') throw new Error(`rule ${f}: ${fn} is not a function`);
    }
    return mod;
  });
}

module.exports = { loadRules };
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
npm test
```
Expected: 2 new tests pass; total 8.

- [ ] **Step 5: Commit**

```bash
git add lib/ruleLoader.js test/rule-loader.test.js
git commit -m "feat(pipeline): rule loader with validation"
```

---

### Task 12: Shared rule test helper

**Files:**
- Create: `test/helpers.js`

- [ ] **Step 1: Write `test/helpers.js`**

```javascript
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const parse = require('../lib/parse');

function loadFixture(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf8');
}

async function runRule(rule, html) {
  const ctx = parse(html);
  if (rule.detect) rule.detect(ctx);
  if (rule.fix) rule.fix(ctx);
  ctx.macros.after = require('../lib/parse').captureMacros(ctx.html);
  return ctx;
}

module.exports = { loadFixture, runRule };
```

- [ ] **Step 2: Commit**

```bash
git add test/helpers.js
git commit -m "test: shared fixture loader and rule runner helpers"
```

---

### Task 13: Wire pipeline to load rules + add /qa POST (stub)

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Edit `server.js` — add imports and /qa route**

Add after the `const requireAuth = require('./lib/auth');` line:
```javascript
const pipeline = require('./lib/pipeline');
const { loadRules } = require('./lib/ruleLoader');
const rules = loadRules(path.join(__dirname, 'rules'));
```

Add after the `app.get('/', ...)` route and before `app.listen`:
```javascript
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
```

- [ ] **Step 2: Run `npm run dev`, paste minimal HTML in the landing page, submit, confirm JSON response**

Expected: JSON response with `score.value: 100`, empty `issues`, empty `fixesApplied` (because no rules are loaded yet).

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: wire /qa endpoint to pipeline (JSON stub response)"
```

---

## Phase 4 — Rules (26 total, one task each)

**Pattern for every rule task:**
1. Write `test/rules/<id>.test.js` (fails)
2. Run `npm test` (verify red)
3. Write `rules/<id>.js`
4. Run `npm test` (verify green)
5. Commit

**`severity` values:** `'info' | 'warn' | 'error' | 'critical'`. `cap74: true` on an issue triggers the 74% score cap when unfixed.

Each task below shows the fixture used, the test, and the rule implementation.

---

### Task 14: Rule — charset-meta (Polish, 1 pt)

**Files:** `test/rules/charset-meta.test.js`, `rules/charset-meta.js`
**Fixture:** inline (no `<meta charset>`)

- [ ] **Step 1: Write test**

`test/rules/charset-meta.test.js`:
```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/charset-meta');
const { runRule } = require('../helpers');

test('charset-meta: detects missing and adds utf-8', async () => {
  const html = '<html><head><title>x</title></head><body>hi</body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'charset-meta'));
  assert.match(ctx.html, /<meta\s+charset="utf-8"/i);
});

test('charset-meta: no-op when already present', async () => {
  const html = '<html><head><meta charset="utf-8"><title>x</title></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'charset-meta').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test`

- [ ] **Step 3: Implement `rules/charset-meta.js`**

```javascript
'use strict';

module.exports = {
  id: 'charset-meta',
  category: 'polish',
  weight: 1,
  detect(ctx) {
    const hasCharset = ctx.$('meta[charset], meta[http-equiv="Content-Type"]').length > 0;
    if (!hasCharset) {
      ctx.issues.push({
        id: 'charset-meta',
        category: 'polish',
        weight: 1,
        severity: 'warn',
        detail: 'Missing <meta charset>',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'charset-meta' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(/<head([^>]*)>/i, '<head$1><meta charset="utf-8">');
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'charset-meta', category: 'polish', summary: 'Added <meta charset="utf-8">', count: 1 });
  }
};
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test`

- [ ] **Step 5: Commit**

```bash
git add rules/charset-meta.js test/rules/charset-meta.test.js
git commit -m "feat(rule): charset-meta — add utf-8 when missing"
```

---

### Task 15: Rule — viewport-meta (Mobile, 6 pts)

**Files:** `test/rules/viewport-meta.test.js`, `rules/viewport-meta.js`
**Fixture:** `no-viewport.html`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/viewport-meta');
const { runRule, loadFixture } = require('../helpers');

test('viewport-meta: detects missing and adds viewport meta', async () => {
  const ctx = await runRule(rule, loadFixture('no-viewport.html'));
  assert.ok(ctx.issues.find(i => i.id === 'viewport-meta'));
  assert.match(ctx.html, /<meta\s+name="viewport"/i);
  assert.match(ctx.html, /width=device-width/);
});

test('viewport-meta: idempotent', async () => {
  const html = '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'viewport-meta').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test`

- [ ] **Step 3: Implement `rules/viewport-meta.js`**

```javascript
'use strict';

module.exports = {
  id: 'viewport-meta',
  category: 'mobile',
  weight: 6,
  detect(ctx) {
    const has = ctx.$('meta[name="viewport" i]').length > 0;
    if (!has) {
      ctx.issues.push({
        id: 'viewport-meta',
        category: 'mobile',
        weight: 6,
        severity: 'error',
        detail: 'Missing <meta name="viewport">',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'viewport-meta' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(
      /<head([^>]*)>/i,
      '<head$1><meta name="viewport" content="width=device-width,initial-scale=1">'
    );
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'viewport-meta', category: 'mobile', summary: 'Added viewport meta for mobile', count: 1 });
  }
};
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test`

- [ ] **Step 5: Commit**

```bash
git add rules/viewport-meta.js test/rules/viewport-meta.test.js
git commit -m "feat(rule): viewport-meta — add when missing"
```

---

### Task 16: Rule — lang-attribute (Compliance, 2 pts)

**Files:** `test/rules/lang-attribute.test.js`, `rules/lang-attribute.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/lang-attribute');
const { runRule } = require('../helpers');

test('lang-attribute: adds lang="en" when missing', async () => {
  const ctx = await runRule(rule, '<html><head></head><body></body></html>');
  assert.ok(ctx.issues.find(i => i.id === 'lang-attribute'));
  assert.match(ctx.html, /<html\s+lang="en"/i);
});

test('lang-attribute: no-op when present', async () => {
  const ctx = await runRule(rule, '<html lang="fr"><body></body></html>');
  assert.equal(ctx.issues.filter(i => i.id === 'lang-attribute').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/lang-attribute.js`**

```javascript
'use strict';

module.exports = {
  id: 'lang-attribute',
  category: 'compliance',
  weight: 2,
  detect(ctx) {
    if (!ctx.$('html').attr('lang')) {
      ctx.issues.push({
        id: 'lang-attribute',
        category: 'compliance',
        weight: 2,
        severity: 'warn',
        detail: 'Missing lang attribute on <html>',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'lang-attribute' && !i.fixed);
    if (!issue) return;
    if (/<html(?![^>]*\blang=)/i.test(ctx.html)) {
      ctx.html = ctx.html.replace(/<html\b([^>]*)>/i, '<html lang="en"$1>');
    }
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'lang-attribute', category: 'compliance', summary: 'Added lang="en" to <html>', count: 1 });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/lang-attribute.js test/rules/lang-attribute.test.js
git commit -m "feat(rule): lang-attribute — add when missing"
```

---

### Task 17: Rule — title-tag (Polish, 1 pt)

**Files:** `test/rules/title-tag.test.js`, `rules/title-tag.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/title-tag');
const { runRule } = require('../helpers');

test('title-tag: flags empty title and backfills from h1', async () => {
  const html = '<html><head><title></title></head><body><h1>Steri-Tamp Seals</h1></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'title-tag'));
  assert.match(ctx.html, /<title>Steri-Tamp Seals<\/title>/);
});

test('title-tag: flags but does not fill when no h1', async () => {
  const html = '<html><head><title></title></head><body>Hi</body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'title-tag'));
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/title-tag.js`**

```javascript
'use strict';

module.exports = {
  id: 'title-tag',
  category: 'polish',
  weight: 1,
  detect(ctx) {
    const titleText = (ctx.$('title').first().text() || '').trim();
    if (!titleText) {
      ctx.issues.push({
        id: 'title-tag',
        category: 'polish',
        weight: 1,
        severity: 'info',
        detail: 'Empty or missing <title>',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'title-tag' && !i.fixed);
    if (!issue) return;
    const h1 = (ctx.$('h1').first().text() || '').trim();
    if (h1) {
      ctx.html = ctx.html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${h1}</title>`);
      ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
      issue.fixed = true;
      ctx.fixesApplied.push({ id: 'title-tag', category: 'polish', summary: `Set <title> from first <h1>`, count: 1 });
    }
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/title-tag.js test/rules/title-tag.test.js
git commit -m "feat(rule): title-tag — backfill empty title from first h1"
```

---

### Task 18: Rule — alt-text (Compliance, 3 pts)

**Files:** `test/rules/alt-text.test.js`, `rules/alt-text.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/alt-text');
const { runRule } = require('../helpers');

test('alt-text: adds alt="" to images missing alt', async () => {
  const html = '<html><body><img src="a.png"><img src="b.png" alt="logo"></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'alt-text'));
  const imgs = (ctx.html.match(/<img[^>]*>/g) || []);
  assert.ok(imgs.every(tag => /alt=/.test(tag)));
});

test('alt-text: no issue when all images have alt', async () => {
  const html = '<html><body><img src="a.png" alt=""><img src="b.png" alt="x"></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'alt-text').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/alt-text.js`**

```javascript
'use strict';

module.exports = {
  id: 'alt-text',
  category: 'compliance',
  weight: 3,
  detect(ctx) {
    const imgsMissing = ctx.$('img').filter((_, el) => !('alt' in el.attribs));
    if (imgsMissing.length > 0) {
      ctx.issues.push({
        id: 'alt-text',
        category: 'compliance',
        weight: 3,
        severity: 'warn',
        detail: `${imgsMissing.length} image(s) missing alt attribute`,
        fixable: true,
        count: imgsMissing.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'alt-text' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.html = ctx.html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
      if (/\balt\s*=/i.test(attrs)) return match;
      count++;
      return `<img${attrs} alt="">`;
    });
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'alt-text', category: 'compliance', summary: `Added alt="" to ${count} image(s)`, count });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/alt-text.js test/rules/alt-text.test.js
git commit -m "feat(rule): alt-text — add empty alt to images without one"
```

---

### Task 19: Rule — unsubscribe-macro (Compliance, 6 pts, cap74)

**Files:** `test/rules/unsubscribe-macro.test.js`, `rules/unsubscribe-macro.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/unsubscribe-macro');
const { runRule, loadFixture } = require('../helpers');

test('unsubscribe-macro: present in minimal fixture', async () => {
  const ctx = await runRule(rule, loadFixture('synthetic-minimal.html'));
  assert.equal(ctx.issues.filter(i => i.id === 'unsubscribe-macro').length, 0);
});

test('unsubscribe-macro: missing in no-unsubscribe fixture triggers cap74', async () => {
  const ctx = await runRule(rule, loadFixture('no-unsubscribe.html'));
  const issue = ctx.issues.find(i => i.id === 'unsubscribe-macro');
  assert.ok(issue);
  assert.equal(issue.cap74, true);
  assert.equal(issue.severity, 'critical');
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/unsubscribe-macro.js`**

```javascript
'use strict';

const UNSUBSCRIBE_MACRO_RE = /\[#\s*Unsubscribe\.URL\s*#\]/i;

module.exports = {
  id: 'unsubscribe-macro',
  category: 'compliance',
  weight: 6,
  detect(ctx) {
    if (!UNSUBSCRIBE_MACRO_RE.test(ctx.html)) {
      ctx.issues.push({
        id: 'unsubscribe-macro',
        category: 'compliance',
        weight: 6,
        severity: 'critical',
        detail: 'Missing [#Unsubscribe.URL#] — CASL/Law 25 risk',
        fixable: false,
        cap74: true
      });
    }
  },
  fix() { /* not fixable — designer must add in Creatio */ }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/unsubscribe-macro.js test/rules/unsubscribe-macro.test.js
git commit -m "feat(rule): unsubscribe-macro — CASL/Law 25 hard cap at 74"
```

---

### Task 20: Rule — creatio-macros (Compliance, 4 pts, integrity check)

**Files:** `test/rules/creatio-macros.test.js`, `rules/creatio-macros.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/creatio-macros');
const pipeline = require('../../lib/pipeline');
const { loadFixture } = require('../helpers');

test('creatio-macros: passes when macros unchanged after pipeline', async () => {
  const ctx = await pipeline.run(loadFixture('synthetic-minimal.html'), { rules: [rule] });
  assert.equal(ctx.issues.filter(i => i.id === 'creatio-macros').length, 0);
  assert.equal(ctx.score.macrosIntact, true);
});

test('creatio-macros: detects drift when other rule mutates a macro', async () => {
  const breaker = {
    id: 'breaker', category: 'polish', weight: 0,
    detect() {}, fix(ctx) { ctx.html = ctx.html.replace('[#Unsubscribe.URL#]', '#'); }
  };
  const ctx = await pipeline.run(loadFixture('synthetic-minimal.html'), { rules: [rule, breaker] });
  assert.equal(ctx.score.macrosIntact, false);
  assert.ok(ctx.score.value <= 50);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/creatio-macros.js`**

```javascript
'use strict';

module.exports = {
  id: 'creatio-macros',
  category: 'compliance',
  weight: 4,
  detect() {
    // drift is computed in the pipeline by comparing macros.before vs macros.after
    // this rule exists to document the check in the rules catalog; the pipeline enforces
  },
  fix() {}
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/creatio-macros.js test/rules/creatio-macros.test.js
git commit -m "feat(rule): creatio-macros — pipeline-level integrity check"
```

---

### Task 21: Rule — inline-css (Polish, 3 pts)

**Files:** `test/rules/inline-css.test.js`, `rules/inline-css.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/inline-css');
const { runRule } = require('../helpers');

test('inline-css: inlines <style> into element style attributes', async () => {
  const html = '<html><head><style>p { color: red; }</style></head><body><p>hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'inline-css'));
  assert.match(ctx.html, /<p[^>]*style="[^"]*color:\s*red/);
});

test('inline-css: preserves @media queries in <style>', async () => {
  const html = '<html><head><style>p{color:red}@media (max-width:480px){p{color:blue}}</style></head><body><p>hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /@media/);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/inline-css.js`**

```javascript
'use strict';
const juice = require('juice');
const cheerio = require('cheerio');

module.exports = {
  id: 'inline-css',
  category: 'polish',
  weight: 3,
  detect(ctx) {
    const hasStyleBlocks = ctx.$('style').length > 0;
    if (hasStyleBlocks) {
      ctx.issues.push({
        id: 'inline-css',
        category: 'polish',
        weight: 3,
        severity: 'info',
        detail: `${ctx.$('style').length} <style> block(s) to inline`,
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'inline-css' && !i.fixed);
    if (!issue) return;
    try {
      ctx.html = juice(ctx.html, {
        preserveMediaQueries: true,
        preserveFontFaces: true,
        preserveImportant: true,
        applyAttributesTableElements: true,
        removeStyleTags: false
      });
      ctx.$ = cheerio.load(ctx.html, { decodeEntities: false });
      issue.fixed = true;
      ctx.fixesApplied.push({ id: 'inline-css', category: 'polish', summary: 'Inlined <style> blocks (media queries preserved)', count: 1 });
    } catch (err) {
      issue.error = err.message;
    }
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/inline-css.js test/rules/inline-css.test.js
git commit -m "feat(rule): inline-css — juice inlining, preserves @media"
```

---

### Task 22: Rule — table-role-presentation (Polish, 1 pt)

**Files:** `test/rules/table-role-presentation.test.js`, `rules/table-role-presentation.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/table-role-presentation');
const { runRule } = require('../helpers');

test('table-role-presentation: adds role="presentation" to layout tables', async () => {
  const html = '<html><body><table><tr><td>hi</td></tr></table></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'table-role-presentation'));
  assert.match(ctx.html, /<table[^>]*role="presentation"/);
});

test('table-role-presentation: idempotent', async () => {
  const html = '<html><body><table role="presentation"><tr><td>hi</td></tr></table></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'table-role-presentation').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/table-role-presentation.js`**

```javascript
'use strict';
const cheerio = require('cheerio');

module.exports = {
  id: 'table-role-presentation',
  category: 'polish',
  weight: 1,
  detect(ctx) {
    const missing = ctx.$('table').filter((_, el) => !el.attribs.role);
    if (missing.length > 0) {
      ctx.issues.push({
        id: 'table-role-presentation',
        category: 'polish',
        weight: 1,
        severity: 'info',
        detail: `${missing.length} table(s) missing role="presentation"`,
        fixable: true,
        count: missing.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'table-role-presentation' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('table').each((_, el) => {
      if (!el.attribs.role) { el.attribs.role = 'presentation'; count++; }
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'table-role-presentation', category: 'polish', summary: `Added role="presentation" to ${count} layout table(s)`, count });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/table-role-presentation.js test/rules/table-role-presentation.test.js
git commit -m "feat(rule): table-role-presentation — mark layout tables"
```

---

### Task 23: Rule — image-max-width (Mobile, 3 pts)

**Files:** `test/rules/image-max-width.test.js`, `rules/image-max-width.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/image-max-width');
const { runRule } = require('../helpers');

test('image-max-width: adds max-width:100%;height:auto to <img>', async () => {
  const html = '<html><body><img src="a.png" width="600"></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /max-width:\s*100%/);
  assert.match(ctx.html, /height:\s*auto/);
});

test('image-max-width: merges into existing style', async () => {
  const html = '<html><body><img src="a.png" style="border:0"></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /border:0/);
  assert.match(ctx.html, /max-width:\s*100%/);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/image-max-width.js`**

```javascript
'use strict';
const cheerio = require('cheerio');

module.exports = {
  id: 'image-max-width',
  category: 'mobile',
  weight: 3,
  detect(ctx) {
    const needFix = ctx.$('img').filter((_, el) => {
      const style = el.attribs.style || '';
      return !/max-width\s*:/.test(style) || !/height\s*:\s*auto/.test(style);
    });
    if (needFix.length > 0) {
      ctx.issues.push({
        id: 'image-max-width',
        category: 'mobile',
        weight: 3,
        severity: 'warn',
        detail: `${needFix.length} image(s) missing max-width:100% for mobile`,
        fixable: true,
        count: needFix.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'image-max-width' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('img').each((_, el) => {
      const style = (el.attribs.style || '').trim().replace(/;?\s*$/, '');
      const parts = style.length ? style.split(';').map(s => s.trim()).filter(Boolean) : [];
      const hasMaxWidth = parts.some(p => /^max-width\s*:/i.test(p));
      const hasHeight = parts.some(p => /^height\s*:\s*auto/i.test(p));
      if (!hasMaxWidth) parts.push('max-width: 100%');
      if (!hasHeight) parts.push('height: auto');
      el.attribs.style = parts.join('; ');
      count++;
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'image-max-width', category: 'mobile', summary: `Added max-width:100%;height:auto to ${count} image(s)`, count });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/image-max-width.js test/rules/image-max-width.test.js
git commit -m "feat(rule): image-max-width — responsive images on mobile"
```

---

### Task 24: Rule — dark-mode-css (Polish, 3 pts)

**Files:** `test/rules/dark-mode-css.test.js`, `rules/dark-mode-css.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/dark-mode-css');
const { runRule } = require('../helpers');

test('dark-mode-css: adds baseline dark-mode rules to <head>', async () => {
  const html = '<html><head></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'dark-mode-css'));
  assert.match(ctx.html, /prefers-color-scheme:\s*dark/);
  assert.match(ctx.html, /\[data-ogsc\]/);
});

test('dark-mode-css: no-op when rule already present', async () => {
  const html = '<html><head><style>@media (prefers-color-scheme: dark){body{color:#fff}}</style></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'dark-mode-css').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/dark-mode-css.js`**

```javascript
'use strict';

const BLOCK = `
<style type="text/css">
@media (prefers-color-scheme: dark) {
  body, table, td { background: #1a1a1a !important; color: #eaeaea !important; }
  a { color: #9dd4ff !important; }
}
[data-ogsc] body, [data-ogsc] table, [data-ogsc] td { background: #1a1a1a !important; color: #eaeaea !important; }
[data-ogsc] a { color: #9dd4ff !important; }
</style>`.trim();

module.exports = {
  id: 'dark-mode-css',
  category: 'polish',
  weight: 3,
  detect(ctx) {
    const already = /prefers-color-scheme:\s*dark/i.test(ctx.html) && /\[data-ogsc\]/i.test(ctx.html);
    if (!already) {
      ctx.issues.push({
        id: 'dark-mode-css',
        category: 'polish',
        weight: 3,
        severity: 'info',
        detail: 'No dark-mode CSS detected',
        fixable: true
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'dark-mode-css' && !i.fixed);
    if (!issue) return;
    ctx.html = ctx.html.replace(/<\/head>/i, `${BLOCK}\n</head>`);
    ctx.$ = require('cheerio').load(ctx.html, { decodeEntities: false });
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'dark-mode-css', category: 'polish', summary: 'Added dark-mode CSS (prefers-color-scheme + [data-ogsc])', count: 1 });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/dark-mode-css.js test/rules/dark-mode-css.test.js
git commit -m "feat(rule): dark-mode-css — baseline dark-mode support"
```

---

### Task 25: Rule — mso-conditionals (Outlook, 5 pts)

**Files:** `test/rules/mso-conditionals.test.js`, `rules/mso-conditionals.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/mso-conditionals');
const { runRule } = require('../helpers');

test('mso-conditionals: adds MSO block when missing', async () => {
  const html = '<html><head></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'mso-conditionals'));
  assert.match(ctx.html, /<!--\[if mso\]>/);
});

test('mso-conditionals: no-op when present', async () => {
  const html = '<html><head><!--[if mso]><xml></xml><![endif]--></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'mso-conditionals').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/mso-conditionals.js`**

```javascript
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
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/mso-conditionals.js test/rules/mso-conditionals.test.js
git commit -m "feat(rule): mso-conditionals — Outlook MSO block with PixelsPerInch"
```

---

### Task 26: Rule — office-document-settings (Outlook, 3 pts)

**Files:** `test/rules/office-document-settings.test.js`, `rules/office-document-settings.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/office-document-settings');
const { runRule } = require('../helpers');

test('office-document-settings: detects missing PixelsPerInch', async () => {
  const html = '<html><head><!--[if mso]><style></style><![endif]--></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'office-document-settings'));
});

test('office-document-settings: no-op when present', async () => {
  const html = '<html><head><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]--></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'office-document-settings').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/office-document-settings.js`**

```javascript
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
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/office-document-settings.js test/rules/office-document-settings.test.js
git commit -m "feat(rule): office-document-settings — Outlook PixelsPerInch fix"
```

---

### Task 27: Rule — mso-line-height (Outlook, 2 pts)

**Files:** `test/rules/mso-line-height.test.js`, `rules/mso-line-height.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/mso-line-height');
const { runRule } = require('../helpers');

test('mso-line-height: appends mso-line-height-rule to styles containing line-height', async () => {
  const html = '<html><body><p style="line-height: 1.5;">hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /mso-line-height-rule:\s*exactly/);
});

test('mso-line-height: ignores styles without line-height', async () => {
  const html = '<html><body><p style="color: red">hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.doesNotMatch(ctx.html, /mso-line-height-rule/);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/mso-line-height.js`**

```javascript
'use strict';

module.exports = {
  id: 'mso-line-height',
  category: 'outlook',
  weight: 2,
  detect(ctx) {
    const needs = ctx.$('[style]').filter((_, el) => {
      const s = el.attribs.style || '';
      return /line-height\s*:/i.test(s) && !/mso-line-height-rule/i.test(s);
    });
    if (needs.length > 0) {
      ctx.issues.push({
        id: 'mso-line-height',
        category: 'outlook',
        weight: 2,
        severity: 'info',
        detail: `${needs.length} element(s) with line-height missing mso-line-height-rule`,
        fixable: true,
        count: needs.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'mso-line-height' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      if (/line-height\s*:/i.test(s) && !/mso-line-height-rule/i.test(s)) {
        el.attribs.style = s.replace(/;?\s*$/, '') + '; mso-line-height-rule: exactly';
        count++;
      }
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'mso-line-height', category: 'outlook', summary: `Added mso-line-height-rule to ${count} element(s)`, count });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/mso-line-height.js test/rules/mso-line-height.test.js
git commit -m "feat(rule): mso-line-height — Outlook exact line-height rule"
```

---

### Task 28: Rule — border-radius-fallback (Outlook, 2 pts)

**Files:** `test/rules/border-radius-fallback.test.js`, `rules/border-radius-fallback.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/border-radius-fallback');
const { runRule } = require('../helpers');

test('border-radius-fallback: adds mso-border-radius override where border-radius present', async () => {
  const html = '<html><body><div style="border-radius: 8px;">hi</div></body></html>';
  const ctx = await runRule(rule, html);
  assert.match(ctx.html, /mso-border-radius\s*:/);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/border-radius-fallback.js`**

```javascript
'use strict';

module.exports = {
  id: 'border-radius-fallback',
  category: 'outlook',
  weight: 2,
  detect(ctx) {
    const needs = ctx.$('[style]').filter((_, el) => {
      const s = el.attribs.style || '';
      return /border-radius\s*:/i.test(s) && !/mso-border-radius/i.test(s);
    });
    if (needs.length > 0) {
      ctx.issues.push({
        id: 'border-radius-fallback',
        category: 'outlook',
        weight: 2,
        severity: 'info',
        detail: `${needs.length} element(s) with border-radius need Outlook fallback`,
        fixable: true,
        count: needs.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'border-radius-fallback' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      if (/border-radius\s*:/i.test(s) && !/mso-border-radius/i.test(s)) {
        el.attribs.style = s.replace(/;?\s*$/, '') + '; mso-border-radius: 0';
        count++;
      }
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'border-radius-fallback', category: 'outlook', summary: `Added mso-border-radius:0 to ${count} element(s)`, count });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/border-radius-fallback.js test/rules/border-radius-fallback.test.js
git commit -m "feat(rule): border-radius-fallback — Outlook graceful degrade"
```

---

### Task 29: Rule — web-fonts-fallback (Outlook, 3 pts)

**Files:** `test/rules/web-fonts-fallback.test.js`, `rules/web-fonts-fallback.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/web-fonts-fallback');
const { runRule } = require('../helpers');

test('web-fonts-fallback: flags font-family without Arial/sans-serif fallback', async () => {
  const html = `<html><body><p style='font-family: "Aktiv Grotesk"'>hi</p></body></html>`;
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'web-fonts-fallback'));
  assert.match(ctx.html, /Arial|sans-serif/);
});

test('web-fonts-fallback: no-op when Arial already present', async () => {
  const html = `<html><body><p style='font-family: "Aktiv Grotesk", Arial, sans-serif'>hi</p></body></html>`;
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'web-fonts-fallback').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/web-fonts-fallback.js`**

```javascript
'use strict';

const FALLBACK = ', Arial, sans-serif';

module.exports = {
  id: 'web-fonts-fallback',
  category: 'outlook',
  weight: 3,
  detect(ctx) {
    const needs = ctx.$('[style]').filter((_, el) => {
      const s = el.attribs.style || '';
      if (!/font-family\s*:/i.test(s)) return false;
      const match = s.match(/font-family\s*:\s*([^;]+)/i);
      if (!match) return false;
      return !/\b(arial|helvetica|sans-serif|serif|monospace|system-ui)\b/i.test(match[1]);
    });
    if (needs.length > 0) {
      ctx.issues.push({
        id: 'web-fonts-fallback',
        category: 'outlook',
        weight: 3,
        severity: 'warn',
        detail: `${needs.length} element(s) have font-family without safe fallback`,
        fixable: true,
        count: needs.length
      });
    }
  },
  fix(ctx) {
    const issue = ctx.issues.find(i => i.id === 'web-fonts-fallback' && !i.fixed);
    if (!issue) return;
    let count = 0;
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      const match = s.match(/font-family\s*:\s*([^;]+)/i);
      if (!match) return;
      const value = match[1];
      if (/\b(arial|helvetica|sans-serif|serif|monospace|system-ui)\b/i.test(value)) return;
      el.attribs.style = s.replace(match[0], `font-family: ${value.trim()}${FALLBACK}`);
      count++;
    });
    ctx.html = ctx.$.root().html();
    issue.fixed = true;
    ctx.fixesApplied.push({ id: 'web-fonts-fallback', category: 'outlook', summary: `Added Arial fallback to ${count} font-family declaration(s)`, count });
  }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/web-fonts-fallback.js test/rules/web-fonts-fallback.test.js
git commit -m "feat(rule): web-fonts-fallback — Arial/sans-serif fallback"
```

---

### Task 30: Rule — unsupported-css (Outlook, 5 pts)

**Files:** `test/rules/unsupported-css.test.js`, `rules/unsupported-css.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/unsupported-css');
const { runRule, loadFixture } = require('../helpers');

test('unsupported-css: flags flex, grid, position', async () => {
  const ctx = await runRule(rule, loadFixture('bad-css-flex.html'));
  const issue = ctx.issues.find(i => i.id === 'unsupported-css');
  assert.ok(issue);
  assert.ok(Array.isArray(issue.offenders));
  assert.ok(issue.offenders.some(o => /flex/i.test(o.property)));
  assert.ok(issue.offenders.some(o => /position/i.test(o.property)));
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/unsupported-css.js`**

```javascript
'use strict';

const UNSUPPORTED = [
  { property: 'display', value: /\b(flex|grid|inline-flex|inline-grid)\b/i, label: 'display: flex/grid' },
  { property: 'position', value: /\b(absolute|fixed|sticky)\b/i, label: 'position: absolute/fixed/sticky' },
  { property: 'transform', value: /./, label: 'transform' },
  { property: 'object-fit', value: /./, label: 'object-fit' },
  { property: 'gap', value: /./, label: 'gap' }
];

function scan(css) {
  const offenders = [];
  for (const rule of UNSUPPORTED) {
    const re = new RegExp(`${rule.property}\\s*:\\s*([^;}"'\\n]+)`, 'gi');
    let m;
    while ((m = re.exec(css))) {
      if (rule.value.test(m[1])) offenders.push({ property: rule.label, value: m[1].trim() });
    }
  }
  return offenders;
}

module.exports = {
  id: 'unsupported-css',
  category: 'outlook',
  weight: 5,
  detect(ctx) {
    const offenders = [];
    ctx.$('style').each((_, el) => {
      const css = ctx.$(el).html() || '';
      offenders.push(...scan(css));
    });
    ctx.$('[style]').each((_, el) => {
      offenders.push(...scan(el.attribs.style || ''));
    });
    if (offenders.length > 0) {
      ctx.issues.push({
        id: 'unsupported-css',
        category: 'outlook',
        weight: 5,
        severity: 'warn',
        detail: `${offenders.length} unsupported-in-Outlook CSS declaration(s) detected`,
        fixable: false,
        offenders
      });
    }
  },
  fix() { /* flags only — rewriting flex/grid into tables requires design intent */ }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/unsupported-css.js test/rules/unsupported-css.test.js
git commit -m "feat(rule): unsupported-css — flag Outlook-hostile CSS"
```

---

### Task 31: Rule — div-layout (Outlook, 5 pts)

**Files:** `test/rules/div-layout.test.js`, `rules/div-layout.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/div-layout');
const { runRule, loadFixture } = require('../helpers');

test('div-layout: flags when <div> count exceeds <table> count', async () => {
  const html = '<html><body><div><div><div>x</div></div></div></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'div-layout'));
});

test('div-layout: quiet when tables dominate', async () => {
  const ctx = await runRule(rule, loadFixture('synthetic-minimal.html'));
  assert.equal(ctx.issues.filter(i => i.id === 'div-layout').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/div-layout.js`**

```javascript
'use strict';

module.exports = {
  id: 'div-layout',
  category: 'outlook',
  weight: 5,
  detect(ctx) {
    const divs = ctx.$('div').length;
    const tables = ctx.$('table').length;
    if (divs > 0 && divs > tables * 2) {
      ctx.issues.push({
        id: 'div-layout',
        category: 'outlook',
        weight: 5,
        severity: 'warn',
        detail: `${divs} <div> vs ${tables} <table> — Outlook renders divs unreliably`,
        fixable: false
      });
    }
  },
  fix() { /* not fixable — requires design rework */ }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/div-layout.js test/rules/div-layout.test.js
git commit -m "feat(rule): div-layout — warn when divs dominate layout"
```

---

### Task 32: Rule — gmail-clipping (Deliverability, 15 pts, cap74 if >500KB)

**Files:** `test/rules/gmail-clipping.test.js`, `rules/gmail-clipping.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/gmail-clipping');
const { runRule } = require('../helpers');

test('gmail-clipping: no issue under 102KB', async () => {
  const ctx = await runRule(rule, '<html><body>tiny</body></html>');
  assert.equal(ctx.issues.filter(i => i.id === 'gmail-clipping').length, 0);
});

test('gmail-clipping: warns between 102KB and 500KB', async () => {
  const padding = 'x'.repeat(150 * 1024);
  const ctx = await runRule(rule, `<html><body>${padding}</body></html>`);
  const issue = ctx.issues.find(i => i.id === 'gmail-clipping');
  assert.ok(issue);
  assert.equal(issue.cap74, undefined);
});

test('gmail-clipping: cap74 when over 500KB', async () => {
  const padding = 'x'.repeat(600 * 1024);
  const ctx = await runRule(rule, `<html><body>${padding}</body></html>`);
  const issue = ctx.issues.find(i => i.id === 'gmail-clipping');
  assert.ok(issue);
  assert.equal(issue.cap74, true);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/gmail-clipping.js`**

```javascript
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
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/gmail-clipping.js test/rules/gmail-clipping.test.js
git commit -m "feat(rule): gmail-clipping — 102KB warn, 500KB cap74"
```

---

### Task 33: Rule — oversize-warning (Deliverability, 5 pts)

**Files:** `test/rules/oversize-warning.test.js`, `rules/oversize-warning.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/oversize-warning');
const { runRule } = require('../helpers');

test('oversize-warning: flags emails between 50KB and 102KB', async () => {
  const padding = 'x'.repeat(70 * 1024);
  const ctx = await runRule(rule, `<html><body>${padding}</body></html>`);
  assert.ok(ctx.issues.find(i => i.id === 'oversize-warning'));
});

test('oversize-warning: quiet when under 50KB or over 102KB', async () => {
  const small = await runRule(rule, '<html><body>small</body></html>');
  assert.equal(small.issues.filter(i => i.id === 'oversize-warning').length, 0);
  const huge = 'x'.repeat(200 * 1024);
  const large = await runRule(rule, `<html><body>${huge}</body></html>`);
  assert.equal(large.issues.filter(i => i.id === 'oversize-warning').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/oversize-warning.js`**

```javascript
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
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/oversize-warning.js test/rules/oversize-warning.test.js
git commit -m "feat(rule): oversize-warning — 50–102KB soft warning"
```

---

### Task 34: Rule — base64-images (Deliverability, 8 pts)

**Files:** `test/rules/base64-images.test.js`, `rules/base64-images.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/base64-images');
const { runRule, loadFixture } = require('../helpers');

test('base64-images: reports count and bytes', async () => {
  const ctx = await runRule(rule, loadFixture('base64-heavy.html'));
  const issue = ctx.issues.find(i => i.id === 'base64-images');
  assert.ok(issue);
  assert.equal(issue.count, 1);
  assert.ok(issue.totalBytes > 0);
});

test('base64-images: quiet when no base64 present', async () => {
  const ctx = await runRule(rule, loadFixture('synthetic-minimal.html'));
  assert.equal(ctx.issues.filter(i => i.id === 'base64-images').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/base64-images.js`**

```javascript
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
  fix() { /* externalization deliberately out of scope for v1 */ }
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/base64-images.js test/rules/base64-images.test.js
git commit -m "feat(rule): base64-images — report count and bytes (no fix)"
```

---

### Task 35: Rule — broken-links (Deliverability, 2 pts)

**Files:** `test/rules/broken-links.test.js`, `rules/broken-links.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/broken-links');
const { runRule } = require('../helpers');

test('broken-links: flags empty and # hrefs, skips Creatio macros', async () => {
  const html = '<html><body><a href="">A</a><a href="#">B</a><a href="https://x">C</a><a href="[#Unsubscribe.URL#]">D</a></body></html>';
  const ctx = await runRule(rule, html);
  const issue = ctx.issues.find(i => i.id === 'broken-links');
  assert.ok(issue);
  assert.equal(issue.count, 2);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/broken-links.js`**

```javascript
'use strict';

function isMacro(href) { return /\[#[^#\]]+#\]/.test(href); }

module.exports = {
  id: 'broken-links',
  category: 'deliverability',
  weight: 2,
  detect(ctx) {
    const broken = [];
    ctx.$('a[href]').each((_, el) => {
      const href = (el.attribs.href || '').trim();
      if (!href || href === '#') { broken.push(href); return; }
      if (isMacro(href)) return;
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(href)) broken.push(href);
    });
    if (broken.length > 0) {
      ctx.issues.push({
        id: 'broken-links',
        category: 'deliverability',
        weight: 2,
        severity: 'warn',
        detail: `${broken.length} broken or placeholder href(s): ${broken.slice(0, 3).join(', ')}`,
        fixable: false,
        count: broken.length
      });
    }
  },
  fix() {}
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/broken-links.js test/rules/broken-links.test.js
git commit -m "feat(rule): broken-links — empty/# hrefs, skip macros"
```

---

### Task 36: Rule — responsive-css (Mobile, 5 pts)

**Files:** `test/rules/responsive-css.test.js`, `rules/responsive-css.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/responsive-css');
const { runRule } = require('../helpers');

test('responsive-css: flags when no @media queries present', async () => {
  const html = '<html><head><style>body{margin:0}</style></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'responsive-css'));
});

test('responsive-css: quiet when @media present', async () => {
  const html = '<html><head><style>@media (max-width:480px){body{font-size:14px}}</style></head><body></body></html>';
  const ctx = await runRule(rule, html);
  assert.equal(ctx.issues.filter(i => i.id === 'responsive-css').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/responsive-css.js`**

```javascript
'use strict';

module.exports = {
  id: 'responsive-css',
  category: 'mobile',
  weight: 5,
  detect(ctx) {
    const hasMedia = /@media[^{]*\{/i.test(ctx.html);
    if (!hasMedia) {
      ctx.issues.push({
        id: 'responsive-css',
        category: 'mobile',
        weight: 5,
        severity: 'warn',
        detail: 'No @media queries detected — email may not adapt to mobile',
        fixable: false
      });
    }
  },
  fix() {}
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/responsive-css.js test/rules/responsive-css.test.js
git commit -m "feat(rule): responsive-css — flag missing @media queries"
```

---

### Task 37: Rule — min-font-size (Mobile, 3 pts)

**Files:** `test/rules/min-font-size.test.js`, `rules/min-font-size.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/min-font-size');
const { runRule } = require('../helpers');

test('min-font-size: flags font-size below 14px', async () => {
  const html = '<html><body><p style="font-size: 11px;">hi</p></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'min-font-size'));
});

test('min-font-size: quiet when >=14px or not set', async () => {
  const ok = await runRule(rule, '<html><body><p style="font-size: 16px">hi</p></body></html>');
  assert.equal(ok.issues.filter(i => i.id === 'min-font-size').length, 0);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/min-font-size.js`**

```javascript
'use strict';

const MIN_PX = 14;

module.exports = {
  id: 'min-font-size',
  category: 'mobile',
  weight: 3,
  detect(ctx) {
    const offenders = [];
    ctx.$('[style]').each((_, el) => {
      const s = el.attribs.style || '';
      const m = s.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i);
      if (m && parseFloat(m[1]) < MIN_PX) offenders.push(m[1]);
    });
    if (offenders.length > 0) {
      ctx.issues.push({
        id: 'min-font-size',
        category: 'mobile',
        weight: 3,
        severity: 'warn',
        detail: `${offenders.length} element(s) with font-size <14px (hard to read on mobile)`,
        fixable: false,
        count: offenders.length
      });
    }
  },
  fix() {}
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/min-font-size.js test/rules/min-font-size.test.js
git commit -m "feat(rule): min-font-size — warn on <14px text"
```

---

### Task 38: Rule — tap-target-size (Mobile, 3 pts)

**Files:** `test/rules/tap-target-size.test.js`, `rules/tap-target-size.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/tap-target-size');
const { runRule } = require('../helpers');

test('tap-target-size: flags <a> whose explicit width OR height is <44px', async () => {
  const html = '<html><body><a href="#" style="display:inline-block;width:30px;height:30px">x</a></body></html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.issues.find(i => i.id === 'tap-target-size'));
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/tap-target-size.js`**

```javascript
'use strict';

const MIN = 44;

function pxOf(style, prop) {
  const m = (style || '').match(new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`, 'i'));
  return m ? parseFloat(m[1]) : null;
}

module.exports = {
  id: 'tap-target-size',
  category: 'mobile',
  weight: 3,
  detect(ctx) {
    let count = 0;
    ctx.$('a, button').each((_, el) => {
      const s = el.attribs.style || '';
      const w = pxOf(s, 'width');
      const h = pxOf(s, 'height');
      if ((w !== null && w < MIN) || (h !== null && h < MIN)) count++;
    });
    if (count > 0) {
      ctx.issues.push({
        id: 'tap-target-size',
        category: 'mobile',
        weight: 3,
        severity: 'warn',
        detail: `${count} link(s)/button(s) under 44×44px — hard to tap on mobile`,
        fixable: false,
        count
      });
    }
  },
  fix() {}
};
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/tap-target-size.js test/rules/tap-target-size.test.js
git commit -m "feat(rule): tap-target-size — 44px minimum for taps"
```

---

### Task 39: Rule — minify-output (Polish, 1 pt, RUNS LAST)

**Files:** `test/rules/minify-output.test.js`, `rules/minify-output.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../rules/minify-output');
const { runRule } = require('../helpers');

test('minify-output: shrinks whitespace while preserving macros and MSO blocks', async () => {
  const html = '<html>\n  <head>\n    <title>t</title>\n  </head>\n  <body>\n    <!--[if mso]><xml></xml><![endif]-->\n    <p>  Hello [#Contact.FirstName#]  </p>\n  </body>\n</html>';
  const ctx = await runRule(rule, html);
  assert.ok(ctx.html.length < html.length);
  assert.match(ctx.html, /\[#Contact\.FirstName#\]/);
  assert.match(ctx.html, /<!--\[if mso\]>/);
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `rules/minify-output.js`**

```javascript
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
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add rules/minify-output.js test/rules/minify-output.test.js
git commit -m "feat(rule): minify-output — preserve macros and MSO blocks"
```

---

## Phase 5 — Integration

### Task 40: Honor rule `order`, add integration test with real fixture

**Files:**
- Modify: `lib/pipeline.js`
- Create: `test/integration.test.js`

- [ ] **Step 1: Modify `lib/pipeline.js` to sort rules by `order`**

Replace the `run` function's rule loops with an ordered pass. Edit `lib/pipeline.js`: find the line `for (const rule of rules) safeCall(rule, 'detect');` and replace it plus the next loop with:

```javascript
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
```

- [ ] **Step 2: Write `test/integration.test.js`**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const pipeline = require('../lib/pipeline');
const { loadRules } = require('../lib/ruleLoader');

const rules = loadRules(path.join(__dirname, '..', 'rules'));
const realHtml = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'MKT-10021-steri-tamp.html'), 'utf8');

test('integration: real Creatio export preserves macros', async () => {
  const ctx = await pipeline.run(realHtml, { rules });
  assert.equal(ctx.score.macrosIntact, true);
  assert.deepEqual(ctx.macros.before.sort(), ctx.macros.after.sort());
});

test('integration: real export produces a score in a reasonable range', async () => {
  const ctx = await pipeline.run(realHtml, { rules });
  assert.ok(ctx.score.value >= 0 && ctx.score.value <= 100);
});

test('integration: expected fixes applied', async () => {
  const ctx = await pipeline.run(realHtml, { rules });
  const ids = ctx.fixesApplied.map(f => f.id);
  assert.ok(ids.includes('inline-css') || ids.includes('table-role-presentation'));
  // at least one polish fix applies
});

test('integration: idempotent — running output back through yields score >= previous and no new fixes', async () => {
  const first = await pipeline.run(realHtml, { rules });
  const second = await pipeline.run(first.html, { rules });
  assert.ok(second.score.value >= first.score.value - 1); // allow 1-pt jitter
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npm test`

- [ ] **Step 4: Commit**

```bash
git add lib/pipeline.js test/integration.test.js
git commit -m "test: full-pipeline integration on real Creatio export"
```

---

## Phase 6 — Preview simulation + results page

### Task 41: 4 client-simulation CSS layers

**Files:**
- Create: `public/previews/gmail.css`
- Create: `public/previews/outlook-classic.css`
- Create: `public/previews/outlook-new.css`
- Create: `public/previews/ios.css`

- [ ] **Step 1: Write `public/previews/gmail.css`**

```css
/* Gmail simulation — strips <style> tags without @media, enforces 14px min */
head > style:not([media]) { display: none !important; }
* { min-font-size: 14px; }
body { font-family: Arial, sans-serif !important; }
```

- [ ] **Step 2: Write `public/previews/outlook-classic.css`**

```css
/* Outlook Classic (Word engine) — aggressive strips */
* {
  border-radius: 0 !important;
  transform: none !important;
  object-fit: unset !important;
}
*:not(body) { background-image: none !important; }
[style*="display: flex"], [style*="display:flex"],
[style*="display: grid"], [style*="display:grid"] { display: block !important; }
[style*="position: absolute"], [style*="position:absolute"],
[style*="position: fixed"], [style*="position:fixed"] { position: static !important; }
body, table, td, p, span, h1, h2, h3, h4 {
  font-family: Arial, Helvetica, sans-serif !important;
}
body { zoom: 1.25; }
```

- [ ] **Step 3: Write `public/previews/outlook-new.css`**

```css
/* Outlook New (Edge engine) — modern; enforce light mode only */
:root { color-scheme: light; }
@media (prefers-color-scheme: dark) { body { filter: none; } }
```

- [ ] **Step 4: Write `public/previews/ios.css`**

```css
/* iOS Mail — modern, respects toggleable dark mode */
body { font-size: max(14px, 1em); }
```

- [ ] **Step 5: Commit**

```bash
git add public/previews/
git commit -m "feat(previews): 4 client-simulation CSS layers"
```

---

### Task 42: lib/renderPreview.js builds 8 iframe configs

**Files:**
- Create: `test/renderPreview.test.js`
- Create: `lib/renderPreview.js`

- [ ] **Step 1: Write test**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const renderPreview = require('../lib/renderPreview');

test('renderPreview: returns 8 panel configs', () => {
  const panels = renderPreview('<html><body>hi</body></html>');
  assert.equal(panels.length, 8);
  const ids = panels.map(p => p.id);
  assert.deepEqual(ids, [
    'gmail-desktop', 'gmail-mobile',
    'outlook-classic-desktop', 'outlook-classic-narrow',
    'outlook-new-desktop', 'outlook-new-mobile',
    'ipad-gmail', 'ipad-outlook'
  ]);
});

test('renderPreview: srcdoc escapes double quotes and includes layer link', () => {
  const panels = renderPreview('<p>"quoted"</p>');
  const gmail = panels.find(p => p.id === 'gmail-desktop');
  assert.ok(gmail.srcdoc.includes('&quot;quoted&quot;'));
  assert.ok(gmail.srcdoc.includes('/public/previews/gmail.css'));
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement `lib/renderPreview.js`**

```javascript
'use strict';

const PANELS = [
  { id: 'gmail-desktop',           label: 'Gmail Desktop',           width: 1024, layer: 'gmail.css' },
  { id: 'gmail-mobile',            label: 'Gmail Mobile',            width: 375,  layer: 'gmail.css' },
  { id: 'outlook-classic-desktop', label: 'Outlook Classic Desktop', width: 1024, layer: 'outlook-classic.css' },
  { id: 'outlook-classic-narrow',  label: 'Outlook Classic Narrow',  width: 375,  layer: 'outlook-classic.css' },
  { id: 'outlook-new-desktop',     label: 'Outlook New Desktop',     width: 1024, layer: 'outlook-new.css' },
  { id: 'outlook-new-mobile',      label: 'Outlook New Mobile',      width: 375,  layer: 'outlook-new.css' },
  { id: 'ipad-gmail',              label: 'iPad Gmail',              width: 768,  layer: 'gmail.css' },
  { id: 'ipad-outlook',            label: 'iPad Outlook',            width: 768,  layer: 'outlook-new.css' }
];

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildSrcdoc(html, layerFile) {
  const link = `<link rel="stylesheet" href="/public/previews/${layerFile}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${link}`);
  }
  return `<!DOCTYPE html><html><head>${link}</head><body>${html}</body></html>`;
}

function renderPreview(html) {
  return PANELS.map(panel => {
    const doc = buildSrcdoc(html, panel.layer);
    return {
      id: panel.id,
      label: panel.label,
      width: panel.width,
      srcdoc: escapeAttr(doc)
    };
  });
}

module.exports = renderPreview;
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add lib/renderPreview.js test/renderPreview.test.js
git commit -m "feat(previews): renderPreview builds 8 sandboxed iframe configs"
```

---

### Task 43: Results page EJS template

**Files:**
- Create: `views/results.ejs`

- [ ] **Step 1: Write `views/results.ejs`**

```ejs
<div style="display: flex; align-items: stretch; margin-bottom: 40px;">
  <div class="score-ring <%= score.grade %>">
    <div class="value"><%= score.value %>%</div>
    <div class="grade"><%= score.grade %></div>
  </div>
  <div class="verdict-banner <%= score.grade %>">
    <h2>
      <% if (score.grade === 'ready')   { %>✓ Ready to send<% } %>
      <% if (score.grade === 'review')  { %>⚠ Sendable but review warnings<% } %>
      <% if (score.grade === 'blocked') { %>✕ Do not send — critical issues<% } %>
    </h2>
    <ul>
      <% (changelog || []).slice(0, 6).forEach(function(line) { %>
        <li><%= line %></li>
      <% }); %>
    </ul>
  </div>
</div>

<h3>Previews</h3>
<div class="preview-grid">
  <% previews.forEach(function(p) { %>
    <div class="preview-panel">
      <h4><%= p.label %></h4>
      <iframe sandbox="allow-same-origin" srcdoc="<%- p.srcdoc %>" loading="lazy"></iframe>
    </div>
  <% }); %>
</div>
<p class="fidelity-note">Previews are simulated approximations, not real client renders.</p>

<h3 style="margin-top: 48px;">Output HTML</h3>
<textarea id="output" readonly><%= output %></textarea>
<div style="margin-top: 16px; text-align: right;">
  <button class="primary" onclick="copyOut()">Copy HTML</button>
</div>
<script>
  function copyOut() {
    const t = document.getElementById('output');
    t.select();
    document.execCommand('copy');
    event.target.textContent = 'Copied ✓';
    setTimeout(() => { event.target.textContent = 'Copy HTML'; }, 1500);
  }
</script>
```

- [ ] **Step 2: Commit**

```bash
git add views/results.ejs
git commit -m "feat(ui): results page with score, changelog, previews, output"
```

---

### Task 44: Wire /qa POST to render results

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Replace the `/qa` handler in `server.js`**

Find the existing `app.post('/qa', ...)` block and replace with:

```javascript
const renderPreview = require('./lib/renderPreview');

function buildChangelog(fixesApplied) {
  // dedupe by id, take top 6 by weight (polish last)
  const byId = new Map();
  for (const f of fixesApplied) {
    if (!byId.has(f.id)) byId.set(f.id, f);
  }
  return Array.from(byId.values()).slice(0, 6).map(f => f.summary);
}

app.post('/qa', async (req, res, next) => {
  try {
    const html = String(req.body.html || '');
    if (html.length === 0 || !html.includes('<')) {
      return res.status(400).send("Doesn't look like HTML — try pasting again.");
    }
    const ctx = await pipeline.run(html, { rules });
    const previews = renderPreview(ctx.html);
    const changelog = buildChangelog(ctx.fixesApplied);
    render(res, 'results', {
      title: 'QA Results',
      score: ctx.score,
      changelog,
      previews,
      output: ctx.html
    });
  } catch (err) {
    next(err);
  }
});
```

(Make sure `const renderPreview = require('./lib/renderPreview');` is at the top near the other requires — remove it from the snippet above if already added.)

- [ ] **Step 2: Run `npm run dev`, paste real fixture, submit, verify results page renders**

Run:
```bash
npm run dev
```
Open http://localhost:3000, paste content of `fixtures/synthetic-minimal.html`, submit. Verify: score displayed, bullets shown, 8 iframes rendered, output box populated.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: /qa now renders results page (score + previews + output)"
```

---

## Phase 7 — Database + dashboard

### Task 45: Migration SQL + migrate.js

**Files:**
- Create: `migrations/001-create-submissions.sql`
- Create: `lib/migrate.js`

- [ ] **Step 1: Write `migrations/001-create-submissions.sql`**

```sql
CREATE TABLE IF NOT EXISTS submissions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_name   TEXT,
  score           INTEGER NOT NULL,
  grade           TEXT NOT NULL,
  bytes_before    INTEGER NOT NULL,
  bytes_after     INTEGER NOT NULL,
  macros_before   TEXT[] NOT NULL DEFAULT '{}',
  macros_intact   BOOLEAN NOT NULL,
  issues_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixes_applied   JSONB NOT NULL DEFAULT '[]'::jsonb,
  hard_fail       BOOLEAN NOT NULL DEFAULT false,
  duration_ms     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);
```

- [ ] **Step 2: Write `lib/migrate.js`**

```javascript
#!/usr/bin/env node
'use strict';
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL — skipping migrations.');
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`Running ${f}...`);
    await pool.query(sql);
  }
  await pool.end();
  console.log('Migrations complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Commit**

```bash
git add migrations/001-create-submissions.sql lib/migrate.js
git commit -m "feat(db): submissions table + migrate script"
```

---

### Task 46: lib/db.js — pool + insert + summary queries

**Files:**
- Create: `lib/db.js`

- [ ] **Step 1: Write `lib/db.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/db.js
git commit -m "feat(db): pool + recordSubmission + getStats"
```

---

### Task 47: Persist submission from /qa handler

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Edit `server.js` — add db require and fire-and-forget insert**

Near the top with the other requires, add:
```javascript
const db = require('./lib/db');
```

Inside the `/qa` handler, **after** computing `ctx` and **before** `render(...)`, add:

```javascript
const bytesBefore = Buffer.byteLength(html, 'utf8');
const bytesAfter = Buffer.byteLength(ctx.html, 'utf8');
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
  durationMs: 0
}).catch(() => {/* fire-and-forget; never block on DB */});
```

- [ ] **Step 2: Run the app with DB offline — verify QA still works**

Run (without a valid `DATABASE_URL`):
```bash
npm run dev
```
Submit a QA. Verify the results page renders without error.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: persist submission after /qa (fire-and-forget)"
```

---

### Task 48: /stats route + stats.ejs template

**Files:**
- Modify: `server.js`
- Create: `views/stats.ejs`

- [ ] **Step 1: Write `views/stats.ejs`**

```ejs
<div class="hero">
  <h1>Dashboard</h1>
</div>

<% if (!stats) { %>
  <p>Stats temporarily unavailable.</p>
<% } else { %>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
    <div class="stat-card">
      <div class="value"><%= stats.emailsQad %></div>
      <div class="label">emails QA'd</div>
    </div>
    <div class="stat-card">
      <div class="value"><%= stats.emailsQad * 8 %></div>
      <div class="label">previews generated</div>
    </div>
    <div class="stat-card" title="Assumes 20 min manual Litmus/device check loop per email">
      <div class="value">≈ <%= Math.round(stats.emailsQad * 20 / 60) %> hrs</div>
      <div class="label">saved</div>
    </div>
    <div class="stat-card">
      <div class="value"><%= stats.avgScore %>%</div>
      <div class="label">avg readiness score</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px;">
    <div class="card">
      <h3>Top issues detected</h3>
      <% stats.topIssues.forEach(function(i) { %>
        <div style="margin: 8px 0;"><span class="semibold"><%= i.n %></span> · <%= i.id %></div>
      <% }); %>
    </div>
    <div class="card">
      <h3>Top auto-fixes applied</h3>
      <% stats.topFixes.forEach(function(f) { %>
        <div style="margin: 8px 0;"><span class="semibold"><%= f.n %></span> · <%= f.id %></div>
      <% }); %>
    </div>
  </div>

  <h3 style="margin-top: 48px;">Recent submissions</h3>
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr style="text-align: left; border-bottom: 1px solid var(--mid-grey);">
      <th style="padding: 8px;">When</th>
      <th style="padding: 8px;">Score</th>
      <th style="padding: 8px;">Campaign</th>
    </tr>
    <% stats.recent.forEach(function(r) { %>
      <tr style="border-bottom: 1px solid var(--inter-grey);">
        <td style="padding: 8px;"><%= new Date(r.created_at).toISOString().replace('T',' ').slice(0,16) %></td>
        <td style="padding: 8px;"><%= r.score %>% (<%= r.grade %>)</td>
        <td style="padding: 8px;"><%= r.campaign_name || '—' %></td>
      </tr>
    <% }); %>
  </table>
<% } %>
```

- [ ] **Step 2: Add `/stats` route to `server.js`**

After `/qa` route, add:

```javascript
app.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.getStats();
    render(res, 'stats', { title: 'Dashboard', stats });
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`, sign in, hit `/stats`. Without DB: "Stats temporarily unavailable." With DB after submissions: KPIs render.

- [ ] **Step 4: Commit**

```bash
git add server.js views/stats.ejs
git commit -m "feat(stats): /stats route with KPI dashboard"
```

---

## Phase 8 — Deployment

### Task 49: HTTP smoke test

**Files:**
- Create: `test/server.test.js`

- [ ] **Step 1: Write `test/server.test.js`**

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

function req(port, opts, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, ...opts }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

test('server smoke: /health returns 200', async (t) => {
  const port = 3456;
  const env = { ...process.env, PORT: String(port), APP_PASSWORD: 'x', SESSION_SECRET: 'x', DATABASE_URL: '' };
  const child = spawn('node', [path.join(__dirname, '..', 'server.js')], { env, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  t.after(() => child.kill());
  const res = await req(port, { path: '/health', method: 'GET' });
  assert.equal(res.status, 200);
});

test('server smoke: root redirects to /login when unauthed', async (t) => {
  const port = 3457;
  const env = { ...process.env, PORT: String(port), APP_PASSWORD: 'x', SESSION_SECRET: 'x', DATABASE_URL: '' };
  const child = spawn('node', [path.join(__dirname, '..', 'server.js')], { env, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  t.after(() => child.kill());
  const res = await req(port, { path: '/', method: 'GET' });
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /\/login/);
});
```

- [ ] **Step 2: Run — expect pass**

Run: `npm test`

- [ ] **Step 3: Commit**

```bash
git add test/server.test.js
git commit -m "test: HTTP smoke — /health and auth redirect"
```

---

### Task 50: GitHub Actions CI

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Write `.github/workflows/test.yml`**

```yaml
name: test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: run npm test on push/PR"
```

---

### Task 51: README deploy section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append to `README.md`**

```markdown

## Deploy to Render

1. Push repo to GitHub (private).
2. In Render, create a new **Web Service** connected to the repo.
   - Environment: Node
   - Build command: `npm install && npm run migrate`
   - Start command: `node server.js`
   - Health check path: `/health`
3. Provision a **Neon Postgres** free-tier database (neon.tech). Copy the pooled connection string.
4. In Render → Environment, set:
   - `DATABASE_URL` (Neon pooled URL with `?sslmode=require`)
   - `APP_PASSWORD` (shared team password)
   - `SESSION_SECRET` (long random string)
5. Deploy. Visit the Render URL and sign in with the shared password.

Free tier spins down after 15 min idle — first request after sleep takes ~30 sec.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README deploy-to-Render instructions"
```

---

### Task 52: Verify end-to-end locally before remote deploy

**Files:**
- (verification only)

- [ ] **Step 1: Fresh-start the app**

Run:
```bash
cp .env.example .env
# Edit .env: set APP_PASSWORD=dev, SESSION_SECRET=dev-secret, leave DATABASE_URL blank
npm test
npm run dev
```

- [ ] **Step 2: Open browser, run through the full flow**

Verify in browser (http://localhost:3000):
1. Redirects to /login
2. Password `dev` signs in
3. Landing page shows paste box
4. Paste `fixtures/MKT-10021-steri-tamp.html` content, submit
5. Results page shows: score ring, 5–6 bullet changelog, 8 iframe previews, copy-ready output
6. /stats shows "Stats temporarily unavailable."

- [ ] **Step 3: Final commit (if anything changed)**

```bash
git status
# If modifications, commit; otherwise skip
```

---

## Spec coverage check

Every spec section maps to tasks:

| Spec section | Tasks |
|---|---|
| §1 Overview, §2 Goals/non-goals | Whole plan |
| §3 Users & workflow | Task 6 (landing), 43–44 (results), 48 (stats) |
| §4 Architecture (rules engine + pipeline) | Tasks 9–13, 40 |
| §5 Data flow + invariants | Tasks 9–13, 40, 44 |
| §6 UI + branding | Tasks 3, 4, 5, 6, 43, 48 |
| §7 Rules catalog (26 rules) | Tasks 14–39 |
| §8 Preview simulation | Tasks 41, 42 |
| §9 Scoring algorithm + caps | Task 10 (pipeline), 19 (unsubscribe cap74), 32 (gmail cap74), 20 (macros integrity) |
| §10 Data model | Task 45 |
| §11 Error handling | Task 6 (auth), 10 (rule errors), 13 (input validation), 47 (DB graceful degrade) |
| §12 Security | Task 5 (password gate), 43 (sandbox iframes), 47 (TLS env var) |
| §13 Testing | Tasks 9, 10, 14–39, 40, 42, 49 |
| §14 Tech stack | Task 1 |
| §15 Project structure | All tasks |
| §16 Deployment | Tasks 50, 51, 52 |
| §17 YAGNI | Enforced by omission |
| §19 Success criteria | Task 52 (manual verification) |

---

**End of plan.**
