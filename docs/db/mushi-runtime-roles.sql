-- Applied Supabase migration: mushi_per_service_runtime_grants
-- Project: mkcjqgbgzfjzudpdbqwo
-- Requires mushi_service_schemas_initial.
-- All runtime roles are NOLOGIN; runtime DB credentials are NOT provisioned.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['core','monitor','terminal','automation','agents'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname=s) THEN RAISE EXCEPTION 'Missing schema: %',s; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='mushi_'||s||'_runtime') THEN RAISE EXCEPTION 'Runtime role exists: %',s; END IF;
  END LOOP;
END $$;
CREATE ROLE mushi_core_runtime NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA core TO mushi_core_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA core TO mushi_core_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA core TO mushi_core_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA core GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO mushi_core_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA core GRANT USAGE,SELECT ON SEQUENCES TO mushi_core_runtime;
CREATE ROLE mushi_monitor_runtime NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA monitor TO mushi_monitor_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA monitor TO mushi_monitor_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA monitor TO mushi_monitor_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA monitor GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO mushi_monitor_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA monitor GRANT USAGE,SELECT ON SEQUENCES TO mushi_monitor_runtime;
CREATE ROLE mushi_terminal_runtime NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA terminal TO mushi_terminal_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA terminal TO mushi_terminal_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA terminal TO mushi_terminal_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA terminal GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO mushi_terminal_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA terminal GRANT USAGE,SELECT ON SEQUENCES TO mushi_terminal_runtime;
CREATE ROLE mushi_automation_runtime NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA automation TO mushi_automation_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA automation TO mushi_automation_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA automation TO mushi_automation_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA automation GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO mushi_automation_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA automation GRANT USAGE,SELECT ON SEQUENCES TO mushi_automation_runtime;
CREATE ROLE mushi_agents_runtime NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA agents TO mushi_agents_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA agents TO mushi_agents_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA agents TO mushi_agents_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA agents GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO mushi_agents_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA agents GRANT USAGE,SELECT ON SEQUENCES TO mushi_agents_runtime;
