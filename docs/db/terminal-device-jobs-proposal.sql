-- T-261010-15: proposal only; DO NOT apply until production credentials and grants are reviewed.
CREATE TABLE IF NOT EXISTS terminal.device_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 device_id uuid NOT NULL,
 request_id varchar(80) NOT NULL,
 command text NOT NULL CHECK (command IN ('node-version','git-version')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','succeeded','failed','cancelled','expired')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
 lease_id uuid,
 lease_until timestamptz,
 completed_at timestamptz,
 output text CHECK (length(output) <= 256),
 CONSTRAINT device_jobs_deadline CHECK (expires_at > created_at),
 CONSTRAINT device_jobs_lease_shape CHECK (
   (status = 'leased' AND lease_id IS NOT NULL AND lease_until IS NOT NULL)
   OR (status <> 'leased' AND lease_id IS NULL AND lease_until IS NULL)
 ),
 UNIQUE (owner_id, request_id)
);
CREATE INDEX IF NOT EXISTS device_jobs_pending_idx ON terminal.device_jobs (device_id, expires_at) WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS terminal.device_job_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES terminal.device_jobs(id),
 event text NOT NULL CHECK (event IN ('created','claimed','completed','cancelled','expired','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON terminal.device_jobs, terminal.device_job_events FROM PUBLIC, anon, authenticated;
-- Claim must run inside a transaction with SELECT ... FOR UPDATE SKIP LOCKED,
-- authenticated device-to-owner pairing, short lease and status/expiry predicates.
-- Ack must CAS on device_id, owner_id, lease_id, status='leased', lease_until > now().
-- Expire stale pending/leased rows; NEVER requeue a potentially executed leased command.
