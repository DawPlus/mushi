-- Applied to Supabase project mkcjqgbgzfjzudpdbqwo on 2026-10-09
-- Migration: mushi_service_schemas_initial
-- Run only against a fresh project after checking existing role/schema names.
-- Schemas are owned by postgres, since Supabase SQL executor cannot SET ROLE
-- to newly-created NOLOGIN roles. These roles are NOT DB login credentials.
-- They have only USAGE on their matching (currently empty) schema.
DO $$
DECLARE service text;
BEGIN
  FOREACH service IN ARRAY ARRAY['core','monitor','terminal','automation','agents']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = service) THEN
      RAISE EXCEPTION 'Mushi schema % already exists; review before applying', service;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mushi_' || service || '_owner') THEN
      RAISE EXCEPTION 'Mushi role % already exists; review before applying', service;
    END IF;
  END LOOP;
END $$;

CREATE ROLE mushi_core_owner NOLOGIN NOINHERIT;
CREATE ROLE mushi_monitor_owner NOLOGIN NOINHERIT;
CREATE ROLE mushi_terminal_owner NOLOGIN NOINHERIT;
CREATE ROLE mushi_automation_owner NOLOGIN NOINHERIT;
CREATE ROLE mushi_agents_owner NOLOGIN NOINHERIT;

CREATE SCHEMA core;
CREATE SCHEMA monitor;
CREATE SCHEMA terminal;
CREATE SCHEMA automation;
CREATE SCHEMA agents;

REVOKE ALL ON SCHEMA core,monitor,terminal,automation,agents FROM PUBLIC;
GRANT USAGE ON SCHEMA core TO mushi_core_owner;
GRANT USAGE ON SCHEMA monitor TO mushi_monitor_owner;
GRANT USAGE ON SCHEMA terminal TO mushi_terminal_owner;
GRANT USAGE ON SCHEMA automation TO mushi_automation_owner;
GRANT USAGE ON SCHEMA agents TO mushi_agents_owner;

-- NEXT PHASE: create separate limited LOGIN/runtime and migration identities,
-- enforce per-schema permissions on existing AND future tables/sequences,
-- verify cross-schema denial and store secrets only server-side.
-- Do not reuse privileged 'postgres' credentials for individual services.
