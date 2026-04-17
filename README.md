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
