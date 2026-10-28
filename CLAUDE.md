# CLAUDE.md

Guidance for Claude Code when working in the LeadFlow CRM repo. Read this every session.

## Source of truth

- `SPEC.md` is the product spec. Read it before planning or building any feature.
- Build only what the spec puts in **v1**. v2 and v3 items (Granola API integration, weighted assignment, Slack reminders, in-app email sending, Sheets export, billing) stay out unless the user asks.
- If the spec is unclear or contradicts itself, stop and ask. Don't guess.

## How to work

- Plan first: propose the steps for a feature and wait for approval before writing code.
- Work in small steps. One feature per branch, small commits with clear messages.
- After each step, run lint, type-check and all tests. Don't call a step done if anything fails.
- Never push to `main` directly. Open a pull request.
- Summarise what changed and what to test by hand at the end of each step.

## Tech stack

- Next.js with TypeScript (strict mode), App Router.
- PostgreSQL on Supabase, Prisma as the ORM, Supabase Auth.
- Papa Parse for CSV and TSV, ExcelJS for Excel, Google Sheets API with the Google Picker for Sheets import.
- Zod for all input validation.
- Scheduled job every 15 minutes for due cadence steps.
- Hosted on Vercel (free Hobby plan). The 15-minute cadence sweep runs via
  `.github/workflows/cron-sweep.yml` (a free GitHub Actions schedule calling
  `/api/cron/due-steps` with the `CRON_SECRET` bearer token). There's no
  `vercel.json` cron entry -- Vercel's free Hobby plan rejects any cron
  schedule more frequent than once a day (it blocks the deploy, not just a
  warning), so a `*/15 * * * *` entry there would break every deploy. If
  this project ever moves to a paid Vercel plan, a `vercel.json` with a
  `crons` entry can replace the GitHub Actions workflow instead of running
  alongside it. A Netlify config (`netlify.toml` +
  `netlify/functions/cron-sweep.ts`) also exists as an alternative, since
  Netlify's free Scheduled Functions have no daily-only cap.

## Security rules (never break these)

- **Multi-tenancy:** every table with company data has `company_id`. Every table has row-level security policies, saved as migrations in `/supabase`.
- **RLS tests:** every new table or policy gets tests in `/tests` that try to read and edit another company's data and another advisor's leads. Any success must fail the build.
- **Permissions on the server:** check role and ownership in every API route and server action, never only in the UI.
- **Owner rules:** exactly one owner per company. No code path may remove, demote or lock out the owner. Ownership changes only by owner-initiated transfer.
- **Service role key:** server-only. Never import it in client components or expose it through `NEXT_PUBLIC_` variables.
- **Secrets:** only in environment variables. Never commit `.env`. Keep `.env.example` updated with variable names only.
- **No real data:** never add real names, emails or phone numbers to the repo, tests or seed data. Use obviously fake data.
- **Validation:** every API input goes through a Zod schema. Queries go through Prisma. No raw string SQL.
- **Imports:** check file type by content, reject macro-enabled Excel files, read cell values only, escape values starting with `=`, `+`, `-` or `@`, enforce size and row limits, delete uploaded files after import.
- **Google access:** use the narrowest scopes (`drive.file` for Sheets, minimal Calendar scope). Store tokens encrypted.
- **Logging:** never log emails, phone numbers or call notes. Scrub them from error reports.
- **Webhooks:** verify signatures before processing.
- **Audit log:** record imports, assignments, handoffs, role changes, ownership transfers, exports and deletions.
- **Billing:** not in v1. Never store card details. Future billing goes through Stripe and is owner-only.

## Code conventions

- Business logic lives in `/lib` by feature (cadence, assignment, import, notifications, calendar, google, auth, validation), not in pages or components.
- Keep components small. Server components by default; client components only when needed.
- Every Prisma schema change gets a migration. Never edit old migrations.
- Write unit tests for the cadence engine, assignment logic and import parsing.
- Store dates in UTC; show them in the user's time zone.

## Commands

Fill these in once the project is set up:

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Tests: `npm test`
- Database migrations: `npx prisma migrate dev`
