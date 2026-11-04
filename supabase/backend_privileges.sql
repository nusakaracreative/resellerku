-- Trusted backend role privileges.
-- service_role bypasses RLS, but still needs SQL object privileges.
grant usage on schema public, private to service_role;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Tables created later by the migration owner also receive backend privileges.
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
