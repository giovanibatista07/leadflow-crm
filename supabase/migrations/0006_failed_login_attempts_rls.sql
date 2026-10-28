-- RLS for failed_login_attempts, added in the security-hardening step.
-- Deliberately has no policies at all: it carries no company_id (a failed
-- attempt isn't tied to a validated company, only to whatever email was
-- typed), and it's never read through the app's normal data paths -- only
-- by the server-side rate-limit check itself. Enabling RLS with zero
-- policies means the anon/authenticated roles get nothing by default.

alter table failed_login_attempts enable row level security;
