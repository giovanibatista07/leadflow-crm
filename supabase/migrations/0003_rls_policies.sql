-- RLS policies, table by table.
--
-- Scope of this migration (data model + RLS foundation step): every table
-- gets tenant isolation. Leads and Activities -- the two tables SPEC.md
-- section 13 calls out by name -- additionally get the full advisor/closer
-- visibility rules. For the other tables, write access (insert/update/
-- delete) is deliberately left denied for the `authenticated` role for now;
-- those mutations go through server actions using the service role, with
-- role/ownership checks in application code (CLAUDE.md "Permissions on the
-- server"). Granular, role-aware write policies for roles/users/cadences
-- arrive with the auth step and the cadence builder step, once there's a
-- real permissions system to express them against.

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

create policy companies_select on companies
  for select
  using (id = public.current_company_id());

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------

create policy roles_select on roles
  for select
  using (company_id = public.current_company_id());

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create policy users_select on users
  for select
  using (company_id = public.current_company_id());

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create policy leads_select on leads
  for select
  using (
    company_id = public.current_company_id()
    and (
      public.is_manager_or_owner()
      or assigned_advisor_id = auth.uid()
      or assigned_closer_id = auth.uid()
    )
  );

-- Leads are created by imports, which SPEC.md scopes to managers.
create policy leads_insert on leads
  for insert
  with check (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

create policy leads_update on leads
  for update
  using (
    company_id = public.current_company_id()
    and (
      public.is_manager_or_owner()
      or assigned_advisor_id = auth.uid()
      or assigned_closer_id = auth.uid()
    )
  )
  with check (
    company_id = public.current_company_id()
    and (
      public.is_manager_or_owner()
      or assigned_advisor_id = auth.uid()
      or assigned_closer_id = auth.uid()
    )
  );

-- Permanent deletion (SPEC.md GDPR/CCPA export-or-delete rights) is a
-- manager/owner action.
create policy leads_delete on leads
  for delete
  using (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

-- ---------------------------------------------------------------------------
-- activities (incl. Granola notes -- "visible only to the lead's advisor,
-- closer and manager", SPEC.md section 13)
-- ---------------------------------------------------------------------------

create policy activities_select on activities
  for select
  using (
    company_id = public.current_company_id()
    and (
      public.is_manager_or_owner()
      or exists (
        select 1 from leads
        where leads.id = activities.lead_id
          and (leads.assigned_advisor_id = auth.uid() or leads.assigned_closer_id = auth.uid())
      )
    )
  );

create policy activities_insert on activities
  for insert
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
    and (
      public.is_manager_or_owner()
      or exists (
        select 1 from leads
        where leads.id = activities.lead_id
          and (leads.assigned_advisor_id = auth.uid() or leads.assigned_closer_id = auth.uid())
      )
    )
  );

-- Corrections by the original logger, or a manager/owner.
create policy activities_update on activities
  for update
  using (
    company_id = public.current_company_id()
    and (user_id = auth.uid() or public.is_manager_or_owner())
  )
  with check (
    company_id = public.current_company_id()
    and (user_id = auth.uid() or public.is_manager_or_owner())
  );

-- Deleting a call log is a manager/owner action, to keep the activity
-- timeline trustworthy for the advisor-to-closer handoff.
create policy activities_delete on activities
  for delete
  using (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

-- ---------------------------------------------------------------------------
-- cadences / cadence_steps
-- ---------------------------------------------------------------------------

create policy cadences_select on cadences
  for select
  using (company_id = public.current_company_id());

create policy cadence_steps_select on cadence_steps
  for select
  using (
    exists (
      select 1 from cadences
      where cadences.id = cadence_steps.cadence_id
        and cadences.company_id = public.current_company_id()
    )
  );

-- ---------------------------------------------------------------------------
-- import_batches
-- ---------------------------------------------------------------------------

create policy import_batches_select on import_batches
  for select
  using (company_id = public.current_company_id());

create policy import_batches_insert on import_batches
  for insert
  with check (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

-- ---------------------------------------------------------------------------
-- audit_logs (manager/owner visibility only; all writes go through the
-- service role so the trail can't be forged or tampered with by end users)
-- ---------------------------------------------------------------------------

create policy audit_logs_select on audit_logs
  for select
  using (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

-- ---------------------------------------------------------------------------
-- notifications (own-user only; created by the system via the service role)
-- ---------------------------------------------------------------------------

create policy notifications_select on notifications
  for select
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy notifications_update on notifications
  for update
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- saved_views (fully self-service, private to the user)
-- ---------------------------------------------------------------------------

create policy saved_views_select on saved_views
  for select
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy saved_views_insert on saved_views
  for insert
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy saved_views_update on saved_views
  for update
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy saved_views_delete on saved_views
  for delete
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- google_connections (fully self-service; values are themselves encrypted
-- at the application layer before being stored)
-- ---------------------------------------------------------------------------

create policy google_connections_select on google_connections
  for select
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy google_connections_insert on google_connections
  for insert
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy google_connections_update on google_connections
  for update
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

create policy google_connections_delete on google_connections
  for delete
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );
