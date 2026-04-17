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
