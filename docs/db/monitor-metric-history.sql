-- T-261010-10: Real Mac metric samples from authenticated device check-ins.
-- Run with migration permissions before enabling history view; writes are best-effort until then.
CREATE TABLE IF NOT EXISTS monitor.metric_history (
  device_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL,
  cpu_percent double precision NOT NULL CHECK (cpu_percent BETWEEN 0 AND 100),
  memory_used_bytes bigint NOT NULL CHECK (memory_used_bytes >= 0),
  memory_total_bytes bigint NOT NULL CHECK (memory_total_bytes > 0),
  PRIMARY KEY (device_id, recorded_at)
);
CREATE INDEX IF NOT EXISTS metric_history_owner_device_time
  ON monitor.metric_history (owner_id, device_id, recorded_at DESC);
REVOKE ALL ON monitor.metric_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON monitor.metric_history TO mushi_monitor_runtime;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON monitor.metric_history FROM mushi_monitor_runtime, mushi_monitor_api;
ALTER TABLE monitor.metric_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY mushi_metric_history_runtime_select ON monitor.metric_history FOR SELECT TO mushi_monitor_runtime USING (true);
CREATE POLICY mushi_metric_history_runtime_insert ON monitor.metric_history FOR INSERT TO mushi_monitor_runtime WITH CHECK (true);
-- Retention: call periodically from privileged operations:
-- DELETE FROM monitor.metric_history WHERE recorded_at < now() - interval '30 days';
