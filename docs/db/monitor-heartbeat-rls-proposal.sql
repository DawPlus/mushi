-- REVIEW ONLY. Do not apply until an approved maintenance window and service-account E2E.
-- Existing NestJS heartbeat store uses INSERT ... ON CONFLICT DO UPDATE and SELECT.
-- PostgreSQL RLS checks are evaluated against the inherited mushi_monitor_runtime role.
BEGIN;
CREATE POLICY mushi_monitor_runtime_select ON monitor.device_heartbeats
  FOR SELECT TO mushi_monitor_runtime USING (true);
CREATE POLICY mushi_monitor_runtime_insert ON monitor.device_heartbeats
  FOR INSERT TO mushi_monitor_runtime WITH CHECK (true);
CREATE POLICY mushi_monitor_runtime_update ON monitor.device_heartbeats
  FOR UPDATE TO mushi_monitor_runtime USING (true) WITH CHECK (true);
ALTER TABLE monitor.device_heartbeats ENABLE ROW LEVEL SECURITY;
-- Remove the currently unused DELETE privilege from the runtime role:
REVOKE DELETE ON monitor.device_heartbeats FROM mushi_monitor_runtime;
COMMIT;
-- Verification required before release:
-- SELECT relrowsecurity FROM pg_class WHERE oid='monitor.device_heartbeats'::regclass;
-- SELECT * FROM pg_policies WHERE schemaname='monitor' AND tablename='device_heartbeats';
-- Connection as mushi_monitor_api: current heartbeat read and upsert succeed;
-- anon/authenticated/other service roles cannot access the schema/table.
-- Rollback (only if explicitly approved):
-- BEGIN; ALTER TABLE monitor.device_heartbeats DISABLE ROW LEVEL SECURITY;
-- DROP POLICY mushi_monitor_runtime_select ON monitor.device_heartbeats;
-- DROP POLICY mushi_monitor_runtime_insert ON monitor.device_heartbeats;
-- DROP POLICY mushi_monitor_runtime_update ON monitor.device_heartbeats;
-- GRANT DELETE ON monitor.device_heartbeats TO mushi_monitor_runtime; COMMIT;
