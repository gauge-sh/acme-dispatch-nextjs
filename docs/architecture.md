# Architecture

Three workspaces under pnpm + Turborepo:

```
packages/core   pure domain rules
packages/db     prisma schema, migrations, seed, data services
apps/api        JSON REST API (Next.js route handlers, port 3001)
apps/web        server-rendered UI (Next.js, port 3000)
```

## packages/core

The rules of the business, with no I/O: enum values as they appear on the
wire, the job status machine, the half-open appointment overlap check, stock
arithmetic, attribute validation, and the pricing engine. Nothing in here
imports Prisma, Next.js, or anything else with a runtime dependency — a rule
either holds for plain values or it is not a core rule.

Money never exists as a float. Every pricing step works on integer cents;
multiplications by 1.6, 1.15, and 1.10 run through `divideRounded`, an exact
bigint ratio division that rounds halves away from zero. That is where the
conformance fixtures in `testdata/pricing-cases.json` are enforced, and most
of the unit tests live here for the same reason the rules do.

## packages/db

Owns the schema (`prisma/schema.prisma`), the migration history, the seed
script, and a service layer that both apps call. Services are where a rule
meets persistence: `addJobPart` checks the job's status via core, then
decrements stock and writes the usage row in one transaction; `createInvoiceForJob`
prices via core and flips the job to `invoiced` atomically. Putting these
here means the API and the web app cannot drift apart on behavior — they call
the same function.

Column names are snake_case (`@map`) so raw SQL and the migration history read
conventionally; Prisma model fields stay camelCase for TypeScript.

## apps/api

Thin: parse the query string and body, call a service, serialize the result.
The interesting parts are `lib/http.ts` (bearer auth, the error envelope, the
domain-error-to-status mapping) and `lib/serialize.ts` (camelCase rows to
snake_case wire shapes — the wire format is snake_case even though the code
is not). Integration tests invoke the route handlers directly against a
per-worker SQLite file built from the real migrations, so the suite runs with
no server and no network.

## apps/web

Server components read through Prisma and the db services; mutations are
server actions that call the same services and surface `DomainError`s as form
feedback. Auth is NextAuth's credentials provider over the `users` table;
sessions are JWTs, but every request re-reads the user so deactivation and
role changes bite immediately. Styling is one hand-written stylesheet — the
tool is internal and the fanciest thing in it is a `<details>` element.

## Boundaries worth defending

- Core never learns about HTTP or the database.
- Apps never re-implement a rule that core states; they may only add
  transport concerns (status codes, form handling).
- The wire contract (snake_case keys, error envelope, pagination shape) lives
  in `docs/domain.md` and `apps/api/src/lib/serialize.ts`, in that order of
  authority.
