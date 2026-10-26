-- RLS for import_mappings, added in the lead-import step. Manager/owner
-- only, matching who can run an import (import_leads permission).

alter table import_mappings enable row level security;

create policy import_mappings_select on import_mappings
  for select
  using (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

create policy import_mappings_insert on import_mappings
  for insert
  with check (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );

create policy import_mappings_update on import_mappings
  for update
  using (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  )
  with check (
    company_id = public.current_company_id()
    and public.is_manager_or_owner()
  );
