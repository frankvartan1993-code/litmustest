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
