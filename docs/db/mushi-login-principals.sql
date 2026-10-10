-- Applied Supabase migration: mushi_service_login_principals
-- Five LOGIN principals were created with NO PASSWORD until provisioned
-- separately over the Mac's authenticated DB connection. No passwords belong in migrations.
DO $$ DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['core','monitor','terminal','automation','agents'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mushi_'||s||'_api') THEN
      RAISE EXCEPTION 'Existing login role %',s;
    END IF;
  END LOOP;
END $$;

CREATE ROLE mushi_core_api LOGIN INHERIT PASSWORD NULL;
GRANT mushi_core_runtime TO mushi_core_api WITH INHERIT TRUE, SET FALSE;
CREATE ROLE mushi_monitor_api LOGIN INHERIT PASSWORD NULL;
GRANT mushi_monitor_runtime TO mushi_monitor_api WITH INHERIT TRUE, SET FALSE;
CREATE ROLE mushi_terminal_api LOGIN INHERIT PASSWORD NULL;
GRANT mushi_terminal_runtime TO mushi_terminal_api WITH INHERIT TRUE, SET FALSE;
CREATE ROLE mushi_automation_api LOGIN INHERIT PASSWORD NULL;
GRANT mushi_automation_runtime TO mushi_automation_api WITH INHERIT TRUE, SET FALSE;
CREATE ROLE mushi_agents_api LOGIN INHERIT PASSWORD NULL;
GRANT mushi_agents_runtime TO mushi_agents_api WITH INHERIT TRUE, SET FALSE;

-- Secrets were subsequently generated on Mac via Node crypto.randomBytes,
-- installed through a PostgreSQL SQL-stdin session and saved in Git-ignored
-- per-service apps/api/.env files. Never store passwords here.
