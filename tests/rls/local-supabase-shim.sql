-- Local-only Supabase emulation for running RLS tests against a plain
-- Postgres instance (e.g. the throwaway db Prisma's own dev server gives
-- us, or a CI postgres service container). This is NOT applied to real
-- Supabase projects and does not live in /supabase/migrations: Supabase
-- already provides the `auth` schema, `auth.uid()`, and the `authenticated`
-- / `anon` roles with their grants.

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end
$$;

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
