# Acme Dispatch

Internal field-service operations tool: office staff schedule jobs, assign
technicians, track parts and stock, and record what to bill. There is no
public signup and no payment processing — invoices here are records of what
to bill, produced when a completed job is closed out.

## Quickstart

```
pnpm install
pnpm db:setup
pnpm dev
```

Web UI: http://localhost:3000 (sign in as `olivia@acme-dispatch.example` /
`dispatch123`). JSON API: http://localhost:3001/api/v1 with a bearer token
issued from the Users screen. See `docs/runbook.md` for the rest.

## Layout

| Path | What it is |
|---|---|
| `packages/core` | Domain rules: status machine, scheduling conflicts, stock, pricing. No I/O; most unit tests live here. |
| `packages/db` | Prisma schema, migrations, deterministic seed, and the transactional services both apps share. |
| `apps/api` | REST API — token auth, pagination, snake_case wire format. Integration tests hit the handlers directly. |
| `apps/web` | Server-rendered UI — dashboard, jobs, scheduling, customers, technicians, parts, invoices, user admin. |

`pnpm test` runs every suite offline in well under two minutes. `docs/` has
the architecture notes, the pricing rules, and the frozen domain contract the
API implements.
