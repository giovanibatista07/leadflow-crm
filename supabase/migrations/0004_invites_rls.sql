-- RLS for the invites table added in the team-invites-and-custom-roles step.
-- Only managers/owner can see or create invites; acceptance (by someone who
-- isn't yet a company member) happens through Prisma, which connects as the
-- table owner and bypasses RLS -- same pattern as owner signup.

alter table invites enable row level security;

create policy invites_select on invites
  for select
  using (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

create policy invites_insert on invites
  for insert
  with check (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );
