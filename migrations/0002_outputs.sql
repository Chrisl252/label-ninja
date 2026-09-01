-- Label Ninja schema v2 — D1-blob output storage (R2 unavailable on the account, error 10042).
-- PDF bytes for completed export jobs, chunked to stay well under D1 parameter-size limits.
CREATE TABLE output_chunks (
  job_id TEXT NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  bytes BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (job_id, seq)
);
