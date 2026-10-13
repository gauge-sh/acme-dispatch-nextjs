# Runbook

## Prerequisites

Node 22 and pnpm. Local development uses SQLite, which ships with the OS.

## First run

```
pnpm install
pnpm db:setup
pnpm dev
```

`db:setup` applies every migration to `packages/db/prisma/dev.db` and loads
the deterministic seed data. `pnpm dev` starts the web app on
http://localhost:3000 and the API on http://localhost:3001.

Seeded logins (web):

| Email | Password | Role |
|---|---|---|
| `olivia@acme-dispatch.example` | `dispatch123` | admin |
| `ray@acme-dispatch.example` | `dispatch123` | dispatcher |

## Reseeding

`pnpm db:seed` wipes and reloads all data. The seed is a fixed PRNG, so two
reseeded databases contain byte-identical rows (including invoice totals).
Anything you created by hand is gone afterwards.

## Migrations

Change `packages/db/prisma/schema.prisma`, then from `packages/db`:

```
pnpm db:migrate --name what_changed
```

Never edit an applied migration; add another one. `pnpm db:deploy` applies
pending migrations without the dev-mode drift checks — that is what CI and
`db:setup` use.

## Tests

```
pnpm test            # everything, via turbo
pnpm --filter @acme/core test
pnpm --filter @acme/api  test
```

Core tests are pure unit tests. API tests build one template SQLite database
from the migration history, copy it per worker, and call the route handlers
directly — no server, no network. The web app's Playwright smoke tests run
only when a Chromium install is present (`pnpm --filter @acme/web exec
playwright install chromium`); without one they skip and exit clean, which is
what CI does.

## API access

Tokens are issued from the web app: Users → pick a user → "Issue a token".
The plaintext is shown exactly once; we store a SHA-256 hash. Then:

```
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/jobs
```

## Production notes

Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in the environment for the web app
(the committed `.env.development` values are for local work only). Both apps
build with `pnpm build` and start with `pnpm --filter <app> start`.
