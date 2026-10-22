-- Every table that holds company data gets row-level security enabled.
-- With RLS on and no policy for a given operation, that operation is
-- denied by default for the `authenticated` role -- the safe failure mode.

alter table companies enable row level security;
alter table roles enable row level security;
alter table users enable row level security;
alter table leads enable row level security;
alter table cadences enable row level security;
alter table cadence_steps enable row level security;
alter table activities enable row level security;
alter table import_batches enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table saved_views enable row level security;
alter table google_connections enable row level security;
