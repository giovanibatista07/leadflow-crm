# LeadFlow CRM

A simple, efficiency-first CRM built as a lead flow: leads come in from a CSV, Excel file or Google Sheet, then move through follow-ups to a closer.

See [SPEC.md](./SPEC.md) for the full product spec and [CLAUDE.md](./CLAUDE.md) for engineering/process rules.

## Tech stack

- Next.js (TypeScript, App Router)
- PostgreSQL on Supabase, Prisma as the ORM, Supabase Auth
- Papa Parse (CSV/TSV), ExcelJS (Excel), Google Sheets API + Picker (Sheets import)
- Zod for input validation
- Vercel Cron for the cadence scheduler

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own Supabase/Google values
npx prisma migrate dev
npm run dev
```

## Commands

- `npm run dev` — start the dev server
- `npm run lint` — lint
- `npm run typecheck` — TypeScript check
- `npm test` — run tests
- `npx prisma migrate dev` — run database migrations

## Security

No real lead data in this repo, ever — see the security rules in [CLAUDE.md](./CLAUDE.md). Sample data lives in `/samples` and is fake.
