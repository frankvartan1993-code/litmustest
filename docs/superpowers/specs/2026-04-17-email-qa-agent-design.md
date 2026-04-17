# Email QA Agent — Design Spec

**Date:** 2026-04-17
**Author:** Carl (CRM Manager, Medisca) with Claude
**Status:** Draft, awaiting final review before implementation plan

---

## 1. Overview

A Medisca-branded internal web tool that takes a Creatio email export (HTML), runs a deterministic QA pipeline against it, applies safe auto-fixes, shows simulated previews across 8 client/device targets, and hands back cleaned HTML the designer can paste straight back into Creatio.

Secondary surface: a KPI dashboard tracking usage and time saved.

Primary user: Medisca's graphic designer(s). Secondary user: Carl (CRM Manager) for visibility and dashboard review.

## 2. Goals & non-goals

**Goals (v1)**
- Paste HTML → cleaned HTML, in one click
- Improve Outlook and mobile rendering of Creatio-exported emails
- Preserve Creatio macros (`[#...#]`) byte-for-byte through every transform
- Give the designer a readiness score + plain-language changelog
- Show simulated previews across 8 client/device targets
- Track usage KPIs so the tool's value is visible

**Non-goals (v1)**
- Real client rendering (no Litmus, no Email on Acid — cost and bureaucracy)
- Image externalization (per explicit product decision — designer wants pure paste-in/paste-out)
- Image hosting or CDN management
- Click-tracking injection, UTM management, A/B test variants
- Preheader optimization, spam scoring
- Multi-tenant support, per-user auth (shared password is enough)
- Internationalization of the tool UI (English-only)

## 3. Users & workflow

**Primary workflow:**
1. Designer builds email in Creatio, hits "Export HTML"
2. Opens the Email QA Agent URL, logs in with shared password
3. Optionally types campaign name, pastes HTML, clicks **Run QA**
4. Results page shows score, 5–6 bullet changelog, 8 simulated previews, cleaned HTML
5. If score ≥ 90%: copies output, pastes back into Creatio, sends
6. If score < 90%: reviews warnings, fixes source issues in Creatio, re-runs

**Secondary workflow (Carl / management):**
1. Opens `/stats` dashboard
2. Sees usage counts, time saved, top issues/fixes, recent submissions

## 4. Architecture

**Approach B: Rules engine + named pipeline** (not monolithic).

Pipeline stages are pure functions threading a `ctx` object:

```javascript
ctx = {
  htmlIn:         string,           // original paste
  html:           string,           // working (mutated by fixes)
  macros: {
    before:       string[],         // captured in parse()
    after:        string[]          // re-captured after fixes
  },
  issues:         Issue[],          // produced by detect()
  fixesApplied:   Fix[],            // produced by fix()
  score: {
    value:        number,           // 0-100
    grade:        'ready' | 'review' | 'blocked',
    hardFail:     boolean,
    capped:       boolean,
    breakdown: {
      deliverability: number,       // points deducted
      outlook:        number,
      mobile:         number,
      compliance:     number,
      polish:         number
    }
  },
  previews:       PreviewConfig[8]  // one per client/device
}
```

Each rule is a self-contained module in `rules/<rule-id>.js`:

```javascript
module.exports = {
  id: 'viewport-meta',
  category: 'mobile',
  weight: 6,
  detect(ctx) { /* returns issue object or null */ },
  fix(ctx)    { /* mutates ctx.html, appends to ctx.fixesApplied */ }
};
```

Adding a rule = drop a file in `rules/`. Removing = delete. Each rule is unit-testable in isolation against a fixture.

## 5. Data flow

```
Designer pastes HTML → POST /qa
            │
            ▼
┌───────────────────────────────┐
│ 1. parse(ctx)                 │ cheerio DOM; capture all [#...#] macros
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 2. detect(ctx)                │ runs every rule.detect(); builds issues[]
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 3. fix(ctx)                   │ runs rule.fix() for fixable issues
│    (in dependency order)      │ mutates ctx.html, appends ctx.fixesApplied
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 4. score(ctx)                 │ deducts per remaining (unfixed) issue
│                               │ applies hard-fail caps
│                               │ verifies ctx.macros.after === ctx.macros.before
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 5. renderPreviews(ctx)        │ returns 8 iframe configs (srcdoc = layer + html)
└──────────────┬────────────────┘
               ▼
     Results page renders
       • Score badge + verdict banner
       • Top 5–6 deduped fixes applied
       • 8 preview iframes
       • Output HTML in copy-to-clipboard box
               │
               ▼
      Background: persist row to Neon Postgres
```

**Fix ordering** (baked into pipeline):
1. Parse + capture macros
2. Structural (viewport, charset, lang, title)
3. CSS (inline via juice, dark-mode, font fallbacks)
4. Outlook (MSO conditionals, mso-line-height, border-radius fallback)
5. Mobile (image max-width)
6. Polish (role=presentation, minify last)
7. Verify macros intact → score

**Key invariants:**
- Changelog is **deduped and prioritized**: 30 images getting `alt=""` becomes one bullet ("Added alt text to 30 images"), not 30 bullets
- **Nothing hits the network during processing** — pure in-memory transform
- **Idempotent**: running output back through pipeline produces 0 new fixes and score ≥ previous

## 6. UI design

### 6.1 Branding (from CLAUDE.md)

| Element | Value |
|---|---|
| Primary Green | `#006c34` — headers, CTAs |
| Lime Green | `#c7f169` — emphasis, "ready" success |
| Primary Tint | `#eaf0eb` — subtle fills, textarea background |
| Secondary Blue | `#003e53` — sparingly, ≤33% of any page |
| Primary Grey | `#383a36` — secondary text, captions |
| Typography | Aktiv Grotesk Light body / Semibold emphasis, **Calibri fallback** |
| Case | Sentence case, never ALL CAPS |
| Corners | 25px radius on cards, buttons, textareas |
| Logo source | `assets/Logos and Wordmarks/01 - Medisca_Motherbrand/04_RGB/` (PNG), copied from `C:\Medisca-Agent\assets\` into `public/logo.png` |

**Font honest note:** Aktiv Grotesk is a Monotype-licensed font. We ship Calibri fallback in the webfont stack because Medisca does not hold a webfont license. Upgrade path: buy Monotype webfont SKU or swap to Inter/Work Sans.

### 6.2 Landing page (`/`)

```
┌──────────────────────────────────────────────────────────┐
│  [MEDISCA LOGO]                             Stats → v1.0 │
│                                                          │
│              Email QA Agent                              │
│      Paste your Creatio export. Get it client-ready.     │
│                                                          │
│   Campaign name (optional)                               │
│   ┌────────────────────────────────────────────────┐    │
│   │ MKT-10021 Steri-Tamp Seals MCA                 │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
│   Paste HTML                                             │
│   ┌────────────────────────────────────────────────┐    │
│   │                                                │    │
│   │  Paste email HTML here...                      │    │
│   │  (textarea, min 320px height, #eaf0eb fill,    │    │
│   │   primary green border on focus)               │    │
│   │                                                │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
│              [  Run QA  ]                                │
│                                                          │
│  Built for Medisca marketing                             │
└──────────────────────────────────────────────────────────┘
```

- Textarea supports paste up to 20 MB (body-parser limit)
- "Run QA" button disabled until textarea has content
- Loading state: "Waking up the QA agent..." if first POST takes >3s (Render cold start)

### 6.3 Results page (`/qa`)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO]    New email ←    Stats →                     [Copy HTML]    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────┐    ┌──────────────────────────────────────────────┐   │
│   │   92%   │    │  ✓ Ready to send                              │   │
│   │  ready  │    │  • Inlined 4 <style> blocks                   │   │
│   │         │    │  • Added viewport meta for mobile             │   │
│   │         │    │  • Added dark-mode CSS                        │   │
│   │ (score  │    │  • Preserved 2 Creatio macros                 │   │
│   │  ring)  │    │  • Minified to 3.64 MB                        │   │
│   └─────────┘    └──────────────────────────────────────────────┘   │
│                                                                      │
│   Previews (simulated approximations, not real client renders)      │
│   ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│   │ Gmail Desktop│ Gmail Mobile │Outlook Classic│  OC Narrow   │    │
│   │   [iframe]   │   [iframe]   │   Desktop     │   [iframe]   │    │
│   │              │              │   [iframe]    │              │    │
│   └──────────────┴──────────────┴──────────────┴──────────────┘    │
│   ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│   │ Outlook New  │ Outlook New  │  iPad Gmail  │ iPad Outlook │    │
│   │   Desktop    │    Mobile    │   [iframe]   │   [iframe]   │    │
│   │   [iframe]   │   [iframe]   │              │              │    │
│   └──────────────┴──────────────┴──────────────┴──────────────┘    │
│                                                                      │
│   Output HTML                                                        │
│   ┌────────────────────────────────────────────────┐ [Copy]         │
│   │ <html xmlns="..."><head>...                    │                │
│   │ (read-only textarea, 300px height, monospace)  │                │
│   └────────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

**Score ring coloring:**
- ≥90% → lime green `#c7f169` fill, "Ready to send" banner
- 75–89% → amber, "Sendable but review warnings"
- <75% → red, "Do not send — critical issues"

**Changelog:** 5–6 bullets MAX, deduped. Ordering: highest-impact fixes first.

**Preview panels:** All 8 rendered at scaled-down size (e.g., 1024px iframe content scaled to 400px visible width via CSS transform). Click any panel to open full-size in a modal overlay. Dark mode toggle button on Outlook New Mobile, iPad Gmail, iPad Outlook panels.

**Output HTML box:** Read-only textarea + [Copy] button. Content escaped via EJS default escaping.

### 6.4 Dashboard page (`/stats`)

```
┌────────────────────────────────────────────────────────────────┐
│  [LOGO]              Dashboard    Run QA →                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│   │   127    │  │  1,016   │  │  ≈42 hrs │  │   87 %   │     │
│   │ emails   │  │ previews │  │   saved  │  │ avg score│     │
│   │  QA'd    │  │generated │  │ (tooltip)│  │          │     │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                │
│   Top issues detected              Top auto-fixes              │
│   ┌────────────────────────┐      ┌────────────────────────┐  │
│   │ ▓▓▓▓▓▓▓▓ base64 images │      │ ▓▓▓▓▓ Inline CSS       │  │
│   │ ▓▓▓▓▓ no dark mode     │      │ ▓▓▓▓ Add viewport      │  │
│   │ ▓▓▓ missing viewport   │      │ ▓▓▓ Add MSO fallback   │  │
│   └────────────────────────┘      └────────────────────────┘  │
│                                                                │
│   Recent submissions                                           │
│   ┌──────────────────────────────────────────────────────────┐│
│   │ 2026-04-17 14:32 │ 92% │ MKT-10021 Steri-Tamp Seals MCA  ││
│   │ 2026-04-17 11:05 │ 78% │ YES-Event-Teaser-MUS            ││
│   │ 2026-04-16 16:44 │ 95% │ MAZathon-Week3-MCA              ││
│   │ ... (last 30)                                            ││
│   └──────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

**KPIs:**

| KPI | Definition |
|---|---|
| **Emails QA'd** | `COUNT(*) FROM submissions` |
| **Previews generated** | `emails_qad × 8` |
| **Time saved (total)** | `emails_qad × 20 min`, rendered as "≈ N hrs saved" with tooltip: "Assumes 20 min manual Litmus/device check loop per email" |
| **Avg readiness score** | `AVG(score)`, all-time + 30-day delta |
| **First-pass rate** | `% of submissions where score ≥ 90` |
| **Top 5 issues detected** | Horizontal bar chart, primary green bars, reading `issues_detected` JSONB column |
| **Top 5 auto-fixes applied** | Horizontal bar chart, reading `fixes_applied` JSONB column |
| **Recent submissions** | Last 30 rows, clickable to open full row detail (JSON view) |

## 7. Rules catalog (v1 = 26 rules)

### 7.1 Deliverability (30 pts)

| ID | Weight | Fix? | Detects |
|---|---|---|---|
| `gmail-clipping` | 15 | no | File >102 KB. Caps score at 74% if >500 KB. |
| `oversize-warning` | 5 | no | 50–102 KB soft warning |
| `base64-images` | 8 | no | Reports count + total bytes. **Flags only**, doesn't externalize. Notes Outlook Classic will strip. |
| `broken-links` | 2 | no | `href=""`, `href="#"`, malformed URLs |

### 7.2 Outlook compatibility (25 pts)

| ID | Weight | Fix? | Detects |
|---|---|---|---|
| `mso-conditionals` | 5 | yes | Missing `<!--[if mso]>` block |
| `office-document-settings` | 3 | yes | Missing PixelsPerInch=96 |
| `unsupported-css` | 5 | partial | `flex`, `grid`, `position:absolute`, `object-fit`, `transform` |
| `border-radius-fallback` | 2 | yes | Adds `mso-border-radius: 0` |
| `web-fonts-fallback` | 3 | yes | Every `font-family` gets Arial/Calibri fallback |
| `mso-line-height` | 2 | yes | Adds `mso-line-height-rule: exactly` |
| `div-layout` | 5 | no | Warns if primary layout uses `<div>` not `<table>` |

### 7.3 Mobile rendering (20 pts)

| ID | Weight | Fix? | Detects |
|---|---|---|---|
| `viewport-meta` | 6 | yes | Adds `<meta name="viewport">` if missing |
| `responsive-css` | 5 | no | Warns if no `@media` queries present |
| `min-font-size` | 3 | no | Body text <14 px |
| `tap-target-size` | 3 | no | Clickable elements <44×44 px |
| `image-max-width` | 3 | yes | Adds `max-width:100%;height:auto` to images |

### 7.4 Compliance (15 pts)

| ID | Weight | Fix? | Detects |
|---|---|---|---|
| `unsubscribe-macro` | 6 | no | `[#Unsubscribe.URL#]` present. Missing = CASL/Law 25 risk. Caps score at 74%. |
| `creatio-macros` | 4 | no | Captures all `[#...#]` pre-fix, verifies intact post-fix. Any drift = hard fail cap at 50%. |
| `alt-text` | 3 | yes | Adds `alt=""` to decorative images, flags missing alt on content images |
| `lang-attribute` | 2 | yes | Adds `<html lang="en">` if missing |

### 7.5 Polish (10 pts)

| ID | Weight | Fix? | Detects |
|---|---|---|---|
| `inline-css` | 3 | yes | Runs `juice` to inline `<style>` into `style=""` |
| `dark-mode-css` | 3 | yes | Adds baseline `@media (prefers-color-scheme: dark)` + `[data-ogsc]` rules |
| `charset-meta` | 1 | yes | Adds `<meta charset="utf-8">` |
| `title-tag` | 1 | yes | If `<title>` empty, pulls from first `<h1>` or warns |
| `table-role-presentation` | 1 | yes | Adds `role="presentation"` on layout tables |
| `minify-output` | 1 | yes | Gentle whitespace minify. **Never touches `[#...#]` macros or `<!--[if mso]>` blocks.** |

## 8. Preview simulation layers

Each preview is an `<iframe srcdoc="...">` with the fixed HTML + a client-simulation CSS layer injected at the top. Iframe browser renders in Chrome's engine; CSS overrides strip or modify properties the target client wouldn't honor.

| Panel | Viewport | Simulation layer strips / enforces |
|---|---|---|
| Gmail Desktop | 1024px | Hides `<style>` in `<head>` unless `@media`; overlays red "Clipped" divider at 102 KB boundary |
| Gmail Mobile | 375px | Same + 14px min font |
| Outlook Classic Desktop | 1024px | `* { border-radius: 0 !important }`; strips web fonts → Arial; kills `flex`, `grid`, `position:absolute`, `transform`, `object-fit`; hides `background-image` except on `<body>`; scales to 120 DPI |
| Outlook Classic Narrow | 375px | Same strips, narrow width |
| Outlook New Desktop | 1024px | Modern engine; minimal strips; enforces light mode |
| Outlook New Mobile | 375px | Same, narrow |
| iPad Gmail | 768px | Modern; dark mode toggle |
| iPad Outlook | 768px | Modern; dark mode toggle |

**Each simulation CSS file = ~20 lines**, hand-written, bundled in `public/previews/*.css`.

**Honest fidelity note** (surfaced on every results page):
Simulated previews catch ~85% of real layout/responsive issues. They do NOT catch: Outlook Classic's actual Word rendering quirks (line-height, exact spacing, PNG alpha), Gmail Android vs iOS differences, Samsung/Yahoo/AOL, real font rendering (browser substitutes system fonts), MSO conditional block behavior (we flag presence, not render). Add Litmus layer later if this gap becomes painful.

**Security:**
- iframes sandboxed with `sandbox="allow-same-origin"` — no script execution, no external network
- Pasted HTML never rendered outside iframes

## 9. Scoring algorithm

```
score = 100 - sum(issue.weight for issue in ctx.issues if not issue.fixed)

if any hardFail triggered:
  score = min(score, 74)   # or 50 for macro drift

grade =
  'ready'   if score >= 90
  'review'  if 75 <= score < 90
  'blocked' if score < 75
```

**Hard-fail caps:**
- Missing `[#Unsubscribe.URL#]` → cap 74
- File size > 500 KB → cap 74
- Macro drift (pre/post mismatch) → cap 50

## 10. Data model (Neon Postgres)

```sql
CREATE TABLE submissions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_name   TEXT,                    -- optional user input
  score           INTEGER NOT NULL,        -- 0-100
  grade           TEXT NOT NULL,           -- 'ready' | 'review' | 'blocked'
  bytes_before    INTEGER NOT NULL,
  bytes_after     INTEGER NOT NULL,
  macros_before   TEXT[],                  -- captured [#...#]
  macros_intact   BOOLEAN NOT NULL,
  issues_detected JSONB NOT NULL,          -- [{id, category, weight, severity, detail}]
  fixes_applied   JSONB NOT NULL,          -- [{id, category, summary, count}]
  hard_fail       BOOLEAN NOT NULL DEFAULT false,
  duration_ms     INTEGER NOT NULL         -- pipeline execution time
);

CREATE INDEX submissions_created_at_idx ON submissions (created_at DESC);
```

Connection via `DATABASE_URL` env var. `pg` npm dep. No ORM (SQL is tiny).

## 11. Error handling

### 11.1 Input validation

| Case | Handling |
|---|---|
| Empty paste | Disabled "Run QA" button until textarea has content |
| Not HTML | Server check: if no `<` char, 400 with "Doesn't look like HTML — try pasting again" |
| Size >20 MB | Body-parser limit rejects with friendly message |
| HTML fragment | Cheerio wraps with minimal boilerplate |
| `<script>` tags | Strip and flag (emails don't execute scripts) |
| External stylesheets | Leave intact but flag |

### 11.2 Pipeline errors

| Case | Handling |
|---|---|
| `juice` throws | Skip inline stage, log, continue. `inline-css` rule records as "errored", no deduction |
| Rule throws | Try/catch around each rule. On error: log rule ID + stack, skip, continue. Results page notes "1 rule errored" |
| Macro drift | Hard fail, cap score at 50%, red banner |
| >30s processing | Timeout, return "Processing took too long — probably a huge base64 blob" |

### 11.3 Storage errors

| Case | Handling |
|---|---|
| Neon unreachable | QA result still renders. Dashboard shows banner: "Stats temporarily unavailable." |
| DB write fails | Don't block response. Log and drop row. |

### 11.4 Operational

| Case | Handling |
|---|---|
| Render cold start | Loading state: "Waking up the QA agent..." if request >3s |
| Memory pressure | 20 MB paste limit on 256 MB Render free — comfortable margin |
| Logs | `console.log` with request ID → Render log viewer |

## 12. Security

| Layer | Measure |
|---|---|
| Site access | Shared password via `APP_PASSWORD` env var. Single login form, cookie-based session, 7-day expiry. Keeps casual traffic out. |
| XSS in pasted HTML | Rendered ONLY inside sandboxed iframes (`sandbox="allow-same-origin"`). Never injected into main page DOM. |
| Output display | Content escaped via EJS default escaping when populating the output textarea |
| Script tags in input | Stripped and flagged |
| DB connection | TLS enforced, connection string in env var, never committed |
| Rate limiting | None in v1 — shared password is the gate |

## 13. Testing strategy

**Framework:** Node built-in `node:test` (zero deps, Node 20+).

**Three layers:**

### 13.1 Unit test per rule (`test/rules/*.test.js`)

Every rule has a paired test. Loads fixture → runs only that rule's `detect()` / `fix()` → asserts issue detected, HTML transformed as expected, macros byte-identical.

### 13.2 Integration test (`test/pipeline.test.js`)

Runs real `MKT-10021` export end-to-end. Asserts:
- Score in expected range (65-75% pre-externalization)
- Expected fixes applied: `inline-css`, `viewport-meta`, `dark-mode-css`, `charset-meta`, `table-role-presentation`
- Both Creatio macros byte-identical in output
- Output HTML valid, smaller than input
- Idempotent: running output back through produces 0 new fixes

### 13.3 HTTP smoke test (`test/server.test.js`)

Starts Express on random port. Hits `GET /`, `POST /qa`, `GET /stats`. Asserts status codes and key content markers.

### 13.4 Fixtures (`fixtures/`)

| File | Purpose |
|---|---|
| `MKT-10021-steri-tamp.html` | Real Creatio export. Canonical integration fixture. |
| `synthetic-minimal.html` | 3 KB skeleton with 1 macro, 1 image, basic table |
| `no-unsubscribe.html` | Missing `[#Unsubscribe.URL#]` — tests hard-fail cap |
| `altered-macros.html` | Pre-broken macros — tests integrity check |
| `base64-heavy.html` | Synthetic 200 KB+ base64 — tests size warnings |
| `bad-css-flex.html` | Contains `display:flex` — tests unsupported-css rule |
| `no-viewport.html` | Missing viewport meta — tests viewport-meta rule |

Add more as real-world failure modes surface.

### 13.5 Discipline

- **Test-driven** per superpowers rule: red (fixture + failing test) → green (implement) → refactor
- No rule lands without a paired test
- CI: GitHub Actions runs `npm test` on every push
- Render auto-deploys only if tests pass

**Not tested in v1:** visual regression on preview iframes, performance/load, cross-browser (modern Chrome only — internal tool).

## 14. Tech stack & dependencies

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Stable, `node:test` built-in |
| Server | Express 4 | Minimal, well-understood |
| Templates | EJS | Lightweight, no build step |
| HTML parsing | cheerio | jQuery-like API, standard for this kind of work |
| CSS inlining | juice | Industry standard for email CSS inlining |
| Minification | html-minifier-terser | Conservative config — never touch macros or MSO comments |
| DB driver | pg | Official Postgres driver |
| Support data | caniemail JSON | Public dataset bundled, mapped to rule checks |
| Session | express-session + memorystore | Single-process, simple |
| Dev | nodemon | Auto-restart on save |

**Explicitly NOT using:** Next.js, React, Webpack, Vite, Tailwind (hand-written CSS for brand control), TypeScript (v1 — keep JS for speed; reconsider at v2), any ORM (SQL is tiny).

## 15. Project structure

```
C:\Email-QA-Agent\
├── CLAUDE.md                          # agent role, Creatio quirks, brand rules pointer
├── README.md                          # setup + deploy instructions
├── package.json
├── .env.example                       # DATABASE_URL, APP_PASSWORD
├── .gitignore
├── server.js                          # Express app, 4 routes: /, /qa, /stats, /login
├── views/
│   ├── layout.ejs                     # shared header/footer, brand CSS link
│   ├── login.ejs                      # password gate
│   ├── landing.ejs                    # paste box + CTA
│   ├── results.ejs                    # score, changelog, 8 previews, output box
│   └── stats.ejs                      # KPI dashboard
├── public/
│   ├── medisca.css                    # brand CSS (greens, typography, spacing)
│   ├── logo.png                       # copied from Medisca-Agent assets
│   └── previews/                      # client-simulation CSS layers
│       ├── gmail.css
│       ├── outlook-classic.css
│       ├── outlook-new.css
│       └── ios.css
├── lib/
│   ├── pipeline.js                    # orchestrates 5 stages
│   ├── parse.js                       # cheerio + macro capture
│   ├── detect.js                      # runs all rule.detect()
│   ├── fix.js                         # runs rule.fix() in order
│   ├── score.js                       # weighted scoring + threshold
│   ├── renderPreview.js               # builds 8 iframe configs
│   ├── db.js                          # pg pool + helpers
│   └── auth.js                        # shared password middleware
├── rules/                             # 26 rule modules
│   ├── gmail-clipping.js
│   ├── base64-images.js
│   ├── viewport-meta.js
│   ├── dark-mode-css.js
│   ├── mso-conditionals.js
│   ├── creatio-macros.js
│   ├── unsubscribe-macro.js
│   └── ... (22 more)
├── data/
│   └── caniemail.json                 # bundled support matrix
├── fixtures/
│   ├── MKT-10021-steri-tamp.html
│   ├── synthetic-minimal.html
│   └── ... (5 more)
├── test/
│   ├── rules/*.test.js                # one test per rule
│   ├── pipeline.test.js               # end-to-end integration
│   └── server.test.js                 # HTTP smoke
├── migrations/
│   └── 001-create-submissions.sql
└── .github/
    └── workflows/
        └── test.yml                   # runs npm test on push
```

**Budget:** ~1,200 LOC total (server + lib + rules + views + tests). Rules average ~40 LOC each.

## 16. Deployment

**Host:** Render.com — free web service tier for v1.

**Setup:**
1. GitHub private repo
2. Render web service connected to repo, auto-deploy on push to `main`
3. Neon Postgres free tier provisioned; `DATABASE_URL` set in Render env
4. `APP_PASSWORD` set in Render env (shared team password)
5. Build command: `npm install && npm run migrate` (migrate runs SQL files from `migrations/` via a tiny script in `lib/migrate.js`)
6. Start command: `node server.js`
7. Health check path: `/health` (simple 200 OK)

**URL:** `medisca-email-qa.onrender.com` (or similar); designer bookmarks.

**Cold start:** Free tier spins down after 15 min idle, ~30 sec wake. Loading state handles this. Upgrade to $7/mo Starter plan if painful.

**Cost (v1):** $0/mo on free tiers. Upgrade path is clear.

## 17. What's NOT in v1 (YAGNI)

- Image externalization / CDN hosting
- Real client renders (Litmus, Email on Acid)
- Click tracking, UTM management, A/B variants
- Preheader text optimization
- Spam scoring
- Per-user auth (shared password instead)
- Internationalization
- Visual regression testing
- Rate limiting
- Sentry / APM
- Real-time streaming UI
- Backup/restore automation
- Admin UI for managing rules (edit `rules/*.js` directly)
- Webhook integrations
- Slack notifications

## 18. Future considerations (post-v1 backlog)

- **Litmus integration layer** — if simulation gap becomes painful, add `/qa-deep` endpoint that hits Litmus Enterprise API
- **Image externalization** — optional toggle for designers who want it
- **Rule versioning** — pin rule set per submission for reproducibility
- **Team accounts** — swap shared password for real auth
- **Campaign analytics link** — associate submissions with actual send stats from Creatio
- **Accessibility score** — alt text quality, color contrast, ARIA
- **Export dashboard to PDF** for monthly reporting
- **Slack bot** — paste HTML in a channel, get QA back as a thread reply

## 19. Success criteria (when do we know v1 works?)

1. Designer can paste any real Creatio export and get a result within 10 seconds (excluding Render cold start)
2. All 26 rules have a paired test; `npm test` exits 0
3. The real `MKT-10021-steri-tamp.html` fixture runs through the pipeline with macros byte-identical pre/post
4. Dashboard shows accurate counts matching the `submissions` table
5. Site is accessible at a shared URL with password gate
6. First week of real use: designer reports at least one email they would have shipped broken that the tool caught

---

**End of spec.**
