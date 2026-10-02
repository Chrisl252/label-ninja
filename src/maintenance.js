// Bounded scheduled deletion and recovery of interrupted renders.
export async function maintain(env) {
  const t = Date.now();
  const expired = await env.DB.prepare("SELECT id FROM export_jobs WHERE status = 'completed' AND expires_at <= ? LIMIT 10")
    .bind(t).all();
  const stale = await env.DB.prepare("SELECT id FROM export_jobs WHERE status = 'processing' AND started_at < ? LIMIT 5")
    .bind(t - 15 * 60 * 1000).all();
  const statements = [];
  for (const { id } of expired.results || []) {
    statements.push(env.DB.prepare('DELETE FROM output_chunks WHERE job_id = ?').bind(id),
      env.DB.prepare("UPDATE export_jobs SET status = 'expired' WHERE id = ?").bind(id));
  }
  for (const { id } of stale.results || []) {
    statements.push(
      env.DB.prepare("UPDATE export_jobs SET status = 'failed', failure_reason = 'interrupted' WHERE id = ? AND status = 'processing' AND started_at < ?").bind(id, t - 15 * 60 * 1000),
      env.DB.prepare("DELETE FROM output_chunks WHERE job_id = ? AND EXISTS (SELECT 1 FROM export_jobs WHERE id = ? AND status = 'failed' AND failure_reason = 'interrupted')").bind(id, id));
  }
  // Each group stays in one transaction. A late renderer may only complete a
  // processing job; it cannot resurrect a recovered export.
  if (statements.length) await env.DB.batch(statements);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at <= ? LIMIT 500)').bind(t),
    env.DB.prepare('DELETE FROM password_reset_tokens WHERE token_hash IN (SELECT token_hash FROM password_reset_tokens WHERE expires_at <= ? LIMIT 500)').bind(t),
    env.DB.prepare('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE window_start < ? LIMIT 500)').bind(Math.floor(t / 3600000) - 24),
  ]);
  console.log(JSON.stringify({ event: 'maintenance', expired: expired.results?.length || 0, interrupted: stale.results?.length || 0 }));
}
