-- Helper functions used by RLS policies.
--
-- These are SECURITY DEFINER so a policy on `users` doesn't recurse into
-- its own RLS check when looking up the caller's company/role. They assume
-- Supabase's `auth.uid()` (the JWT `sub` claim), which the Supabase platform
-- provides -- this migration does not define the `auth` schema itself.

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from users where id = auth.uid()
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from users u
  join roles r on r.id = u.role_id
  where u.id = auth.uid()
$$;

-- True for the built-in "owner" and "manager" roles. Custom roles (SPEC.md
-- "custom roles") are not manager-equivalent by default; granting a custom
-- role manager-level data access is a permissions-system decision for the
-- auth step, not this RLS foundation.
create or replace function public.is_manager_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from users u
    join roles r on r.id = u.role_id
    where u.id = auth.uid() and r.name in ('owner', 'manager')
  )
$$;

revoke all on function public.current_company_id() from public;
revoke all on function public.current_role_name() from public;
revoke all on function public.is_manager_or_owner() from public;

grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_manager_or_owner() to authenticated;
