# Monitor metric history

Ticket T-261010-10. Uses real observed Mac CPU metrics, not synthetic points.

- Migration: `docs/db/monitor-metric-history.sql` must be applied by an authorized DB administrator before the history endpoint is usable.
- Write path: each valid, accepted device heartbeat attempts an idempotent sample insert into `monitor.metric_history`. If the migration has not run, heartbeat availability is preserved while history remains unavailable.
- Read path: authenticated `GET /owner/devices/:deviceId/metrics-history?hours=24`. Only the configured owner and device are accepted. Supported windows: 1, 6, 24, 72, 168 hours; max 500 samples ordered chronologically.
- Storage: Supabase `pg_cron` job `mushi_metric_history_30d_cleanup` is active, scheduled daily at 03:15 UTC (12:15 KST) to delete samples older than 30 days. Applied by `monitor_metric_history_30day_retention_20261010`. Verify first scheduled run in `cron.job_run_details`; the job does not prune immediately. The newest 500 samples may cover less than the requested history window.
- Frontend: Monitor chart consumes real saved samples. An empty or missing history table does not generate fake samples. The current CPU snapshot remains available.
- Security: owner-only access; device identity is server configured; schema privilege REVOKE provided in migration; no browser direct DB access.
- Deployment: DB migration and 30-day cleanup schedule applied to the current Supabase project. Still pending: first scheduled cleanup run, browser signed-in chart/API end-to-end verification, and hosted deployment validation.
