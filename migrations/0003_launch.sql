-- Preserve historical usage. Existing batches continue to cost exactly one credit.
ALTER TABLE export_jobs ADD COLUMN input_hash TEXT;
ALTER TABLE users ADD COLUMN billing_event_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_jobs_expiry ON export_jobs(status, expires_at);
CREATE INDEX idx_jobs_processing ON export_jobs(status, started_at);
CREATE INDEX idx_reset_expiry ON password_reset_tokens(expires_at);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX idx_rate_window ON rate_limits(window_start);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE TABLE checkout_attempts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  attempt_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  session_id TEXT
);
