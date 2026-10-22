# LeadFlow CRM: Product Spec

A simple, efficiency-first CRM built as a lead flow: leads come straight in from a CSV or Excel file, or a Google Sheet, from any job board or lead source, then move through follow-ups to a closer. It was first designed around a sports advisory team. It replaces the manual workflow of copying leads into a shared spreadsheet, assigning them by hand and pasting call notes back in.

> This spec is meant to sit in the GitHub repo as `SPEC.md`, with a short summary in `README.md`.

## 1. Problem

The current workflow, based on ASM Sports:

- The manager copies leads from Indeed and LinkedIn into a shared Google Sheet.
- The manager assigns leads by hand in the sheet.
- Advisors do outreach, record calls with Granola, then paste the notes back into the sheet.
- Every status change is updated by hand, by every advisor, every time.
- Everyone can edit the whole sheet, so data gets overwritten and there's no audit trail.
- Follow-up cadence depends on memory, so steps get skipped.

## 2. Goals

- Import leads from a CSV or Excel file, or straight from Google Sheets, in one step.
- Assign leads to advisors automatically.
- Guide each lead through a cadence the manager defines (Step 1 to Step N).
- Hand qualified leads to a closer with full context.
- Give each role only the view and permissions it needs.
- Cut manual data entry to a minimum.

### Non-goals (v1)

- Built-in email or phone sending (log only at first).
- Full Granola integration (paste or upload notes in v1, API later).
- Billing and subscriptions. The product is free for now. When paid plans arrive, billing is owner-only and card details are handled by a payment provider such as Stripe, never stored in the CRM.

## 3. Users and roles

| Role | What they can do |
| --- | --- |
| Manager | Import leads, set assignment rules, build the cadence, create custom roles and invite people (if the owner allows), see all leads and reports, reassign leads |
| Advisor | See only their assigned leads, log activities, move leads through steps, hand off to a closer |
| Closer | See leads handed to them, log updates, mark a lead Won or Lost |

**Account owner:** the person who creates the account is the owner and has authority over everything. By default only the owner can do the following (the owner may delegate role creation and invites to managers):

- add or remove managers and change anyone's role, including other managers;
- create, edit and delete roles and their permissions;
- change company settings, the email domain, integrations and data retention;
- export or delete company data; manage billing and payment (plan, credit card, invoices) once paid plans exist, which is not in v1;
- transfer ownership to another team member (the only way the owner role changes hands).

No one else can remove the owner, lower their access or lock them out. There is always exactly one owner per company.

**Custom roles:** the owner can add roles beyond the defaults (for example Team Lead or SDR) and set what each one can see and do: which leads, which cadence steps, and whether it can hand off or close. The owner can also let managers create roles and invite people.

### Accounts and team invites

- The owner signs up and creates the company account. Their email domain becomes the company domain.
- The owner (or a manager the owner allows) invites team members one by one by email and picks a role for each.
- Invites only go to addresses on the company's domain (for example name@yourcompany.com). Other domains, including personal Gmail addresses, are blocked.

## 4. Core workflow

1. **Import:** The manager uploads a file (CSV or Excel) or picks a Google Sheet, from any job board or lead source.
2. **Validate:** The system maps columns, flags missing fields and removes duplicates by email or phone.
3. **Assign:** Leads are distributed to advisors (round-robin by default).
4. **Cadence:** Each lead starts at Step 1 of the manager's sequence.
5. **Outreach:** The advisor logs each attempt and its outcome. The system moves the lead to the next step and schedules the next due date.
6. **Qualify:** When a lead is qualified, the advisor hands it off to a closer.
7. **Close:** The closer works the lead through closing stages and marks it Won or Lost.

## 5. Cadence engine

The manager builds the cadence inside the CRM: how many steps there are, the action for each step (email, call, message, meeting or a custom action), which role performs it, and the wait before the next step. Example default:

| Step | Action | Wait before next step |
| --- | --- | --- |
| 1 | Intro email | 1 day |
| 2 | Call | 1 day |
| 3 | If no answer: text or WhatsApp message | 2 days |
| 4 | Follow-up call | 2 days |
| 5 | Final follow-up email | none (end of sequence) |

Outcome rules:

- **No answer:** advance to the next step on schedule.
- **Connected, interested:** mark Qualified and prompt a closer handoff.
- **Connected, not interested:** mark Lost and record a reason.
- **Call back later:** reschedule the same step for a chosen date and time.
- **Sequence finished with no response:** mark Unresponsive and keep it eligible for later re-engagement.

Each advisor gets a **Today queue** showing every lead with a step due today or overdue.

### Dates and times

- Every outreach step has a scheduled date and time, set automatically from the cadence and editable by the advisor.
- Every logged activity records the date and time it actually happened.
- "Call back later" and meetings are booked to a specific date and time, and show in the Today queue at that slot.

### Closer view

When a lead is handed off, the closer sees its full history: every step completed, which calls were answered, which meetings the lead attended or missed, and the advisor's notes. The closer logs each update in the CRM (call made, meeting attended, no-show, offer sent, Won or Lost), so nothing is updated by hand in a spreadsheet.

## 6. Assignment rules

- **Round-robin** (default): spread leads evenly across active advisors.
- **Weighted:** give some advisors a bigger share.
- **Manual override:** the manager can reassign any lead.
- **Closer assignment:** round-robin across closers, or the advisor picks one.

## 7. Lead statuses

`New → In Sequence → Qualified → With Closer → Won / Lost`

Side statuses: `Unresponsive`, `Do Not Contact`.

## 8. Data model

**Company:** id, name, email_domain, owner_id (the account owner; exactly one)

**User:** id, name, email, company_id, role_id, active

**Role:** id, name, permissions (default roles: owner, manager, advisor, closer; the owner can add more)

**Lead:** id, company_id, first_name, last_name, email, phone, source (Indeed / LinkedIn / other), sport, position, location, notes, status, assigned_advisor_id, assigned_closer_id, current_step, next_due_at, created_at

**Cadence:** id, company_id, name, is_default

**CadenceStep:** id, cadence_id, order, action_type (email / call / message / meeting / custom), assigned_role_id, wait_days, default_time, template_text

**Activity:** id, company_id, lead_id, user_id, type, outcome, notes, scheduled_at, completed_at (date and time), granola_note, created_at

**ImportBatch:** id, company_id, uploaded_by, source_type (csv / tsv / excel / google_sheets), filename or sheet_id, row_count, duplicates_skipped, created_at

**AuditLog:** id, company_id, user_id, action, target_type, target_id, created_at

**Notification:** id, company_id, user_id, type, lead_id, read_at, created_at

**SavedView:** id, company_id, user_id, name, filters

**GoogleConnection:** id, company_id, user_id, scopes, encrypted tokens, connected_at

## 9. Lead import

- Accept `.csv`, `.tsv`, Excel (.xlsx and .xls) and plain text exports from any job board or lead source (Indeed, LinkedIn and others) or a generic template. Leads can also be imported straight from Google Sheets: the manager connects Google, picks the spreadsheet and tab with the Google file picker, and the CRM reads the rows through the Google Sheets API into the same mapping and dedupe flow. Access uses the narrow drive.file permission, so the CRM can only open the files the manager picks.
- Column mapping screen, with saved mappings per source.
- Required fields: name plus at least one of email or phone.
- Duplicate check on email and phone, against both the file and the existing database.
- Import summary: rows imported, skipped and flagged.

A sample template lives at `/samples/leads_template.csv`.

## 10. Call notes (Granola)

Granola is the main way call notes get into the CRM, so advisors and closers don't type them up.

- v1: after a call, the advisor pastes the Granola summary into the activity, and the CRM saves it with the call's date and time.
- v2: Granola integration. Notes for each call are generated and attached to the right lead automatically, matched by the lead's email or the meeting invite.
- The closer sees every Granola note in the lead's timeline before taking over.

## 11. Screens

- **Manager dashboard:** pipeline by status, leads per advisor, overdue steps, conversion rates.
- **Import page:** upload, mapping, summary.
- **Cadence builder:** add, reorder and edit steps.
- **Advisor Today queue:** due leads with one-click outcome logging.
- **Lead detail:** contact info, timeline of activities, current step, handoff button.
- **Closer board:** Kanban view of handed-off leads.

### Search and filters

- Global search by name, email, phone, sport or position, limited to the leads the user is allowed to see.
- Filters by status, step, advisor, closer, source and due date.
- Saved views per user (for example "My overdue leads" or "Qualified this week").

### Notifications

- In-app notifications for a new assignment, a handoff to a closer, a step coming due and a meeting about to start.
- Daily email digest of the Today queue (optional per user).
- Managers notified when steps go overdue past a set limit.
- Notifications never include call notes, only a link to the lead.

### Calendar sync

- Each user can connect Google Calendar.
- Meetings and call-backs booked in the CRM are created as calendar events with the lead's name and a link back to the lead.
- Rescheduling or cancelling in the CRM updates the event.
- Only the event details needed are shared; calendar access uses the narrowest Google permission available, and tokens are stored encrypted.

## 12. Suggested tech stack

- Frontend and backend: Next.js (TypeScript)
- Database: PostgreSQL via Supabase, with Prisma as the ORM
- Auth and roles: Supabase Auth, with row-level security so advisors only see their own leads
- File parsing: Papa Parse for CSV and TSV, ExcelJS for Excel files
- Scheduling: a cron job every 15 minutes to work out due steps by date and time
- Hosting: Vercel

## 13. Security and data protection

Leads are personal data (names, emails, phones, call notes), so protection is built in from v1, not added later.

### Access and accounts

- Sign-in through Supabase Auth, with multi-factor authentication required for the owner and managers and offered to everyone.
- Invites limited to the company's email domain; invite links expire after 72 hours and work once.
- Sessions time out after inactivity; removing a team member ends their access straight away.
- Role-based permissions checked on the server for every request, never only in the interface.

### Data isolation

- Every record carries a company_id. Row-level security in PostgreSQL stops one company from ever reading another's data.
- Advisors see only their assigned leads; closers see only leads handed to them; managers see their own company.

### Data protection

- HTTPS everywhere (encryption in transit) and encrypted storage and backups (encryption at rest).
- Granola call notes treated as sensitive: visible only to the lead's advisor, closer and manager.
- Daily automatic backups with point-in-time restore.

### File and Google Sheets imports

- Only .csv, .tsv, .txt, .xlsx and .xls files accepted, checked by file content and not just the extension; macro-enabled files (.xlsm) rejected; only the first sheet's cell values are read, never formulas, macros or links; size limit (for example 10 MB) and a row limit per import.
- Every field validated and cleaned; values starting with =, +, - or @ are escaped so exported files can't run spreadsheet formulas.
- Uploaded files deleted after import; only the cleaned lead records are kept.

### Privacy and compliance

- Collect only the fields the lead flow needs.
- Do Not Contact status honoured everywhere, including future imports of the same person.
- Managers can export or permanently delete a lead's data on request (GDPR and CCPA style rights).
- Retention rule: leads marked Lost or Unresponsive are deleted after a set period the manager chooses (for example 12 months).
- Legal review of the privacy policy before any real company data is used.

### Audit and monitoring

- Audit log of key actions: imports, assignments, handoffs, role changes, ownership transfers, exports and deletions, with who and when.
- Rate limiting on sign-in and invites; alerts on repeated failed logins.

### GitHub and code hygiene

- No real lead data in the repo, ever. Only fake sample data in /samples.
- Secrets (database keys, API keys) kept in environment variables, never committed; .env listed in .gitignore.
- Dependabot and GitHub secret scanning switched on; branch protection on main.

### Engineering safeguards (baseline for every release)

- **No PII in logs:** error tracking (for example Sentry) scrubs emails, phone numbers and call notes before sending.
- **Automated RLS tests in CI:** tests try to read and edit another company's leads, and another advisor's leads; any success fails the build.
- **Service role key server-only:** the Supabase service role key bypasses row-level security, so it never reaches the browser or client bundle.
- **Server-side validation:** every API input checked against a Zod schema; queries go through Prisma, never raw string SQL.
- **Security headers:** Content Security Policy, HSTS, X-Frame-Options and secure, HTTP-only cookies.
- **Webhook verification:** Granola and any other webhooks rejected unless their signature checks out.
- **Vendor agreements:** a data processing agreement with each provider that touches lead data (Supabase, Vercel, Granola, Google), listed as subprocessors in the privacy policy.
- **Incident response plan:** who does what if data leaks, with breach notification within 72 hours as GDPR expects.
- **Restore drills:** restore a backup to a test environment at least once a quarter and record the result.

## 14. Roadmap

**v1 (MVP):** company account with domain-restricted invites, default and custom roles, CSV import, round-robin assignment, cadence builder, Today queue with dates and times, activity logging with pasted Granola notes, closer handoff and closer view, search and filters, in-app notifications, Google Calendar sync, Google Sheets and Excel import, and the full security baseline.

**v2:** Granola integration, weighted assignment, dashboard metrics, Slack reminders.

**v3:** sending email from inside the app, export back to Google Sheets, re-engagement campaigns, paid plans with owner-only billing through Stripe.

## 15. Success metrics

- Time from lead import to first contact
- Percentage of cadence steps completed on time
- Lead-to-qualified and qualified-to-won conversion
- Manual data-entry time saved per advisor each week

## 16. Repo structure (proposed)

```
leadflow-crm/
  README.md
  SPEC.md
  CLAUDE.md          # rules Claude Code reads every session
  .env.example       # variable names only, no secrets
  .gitignore         # includes .env and uploaded files
  /.github
    /workflows       # CI: lint, type-check, tests incl. RLS
    dependabot.yml
  /app               # Next.js routes and pages
    /api             # server routes, incl. webhooks and cron
  /components
  /lib
    /cadence         # cadence engine and scheduling
    /assignment      # round-robin and weighted logic
    /import          # CSV, Excel and Sheets parsing, mapping, dedupe, escaping
    /notifications   # in-app alerts and email digest
    /calendar        # Google Calendar sync
    /google          # shared Google sign-in, Sheets and Picker
    /auth            # roles, permissions, invites
    /validation      # Zod schemas
  /prisma            # schema and migrations
  /supabase          # RLS policies as SQL migrations
  /samples           # fake CSV templates only
  /tests             # unit, RLS and permission tests
  /docs              # screenshots, diagrams
```
