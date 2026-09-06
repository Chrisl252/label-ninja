// Export domain: job creation with atomic entitlement reservation, D1-blob storage,
// authorized downloads, expiry, history. One use = one completed export; failures consume nothing.

import { ok, HttpError, readJson } from './http.js';
import { now, uid, sha256Hex } from './db.js';
import { getSessionUser } from './auth.js';
import { enforceUserRateLimit } from './ratelimit.js';
import { LIMITS } from './limits.js';
import { validateJobSpec } from './spec-validate.js';
import { renderSpecPdf, buildTestPrintSpec } from './render/pdf-label.js';
import { isProActive, remainingFreeUses } from './entitlements.js';

// Atomic reservation: the INSERT only lands while free uses remain. stmt.changes===0 -> no use left.
const RESERVATION_SQL = `INSERT INTO usage_ledger (user_id, job_id, kind, delta, reason, created_at)
SELECT ?, ?, 'export', 1, NULL, ?
WHERE (
  (SELECT free_uses_granted FROM users WHERE id = ?)
  + IFNULL((SELECT SUM(delta) FROM usage_ledger WHERE user_id = ? AND kind IN ('admin_grant','admin_revoke')), 0)
  - (SELECT COUNT(*) FROM usage_ledger WHERE user_id = ? AND kind = 'export')
) > 0 AND EXISTS (SELECT 1 FROM export_jobs WHERE id = ? AND status = 'processing')`;

function splitChunks(bytes, size) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  return chunks;
}

function orientationOf(page) {
  if (page.orientation) return page.orientation;
  return page.width_in >= page.height_in ? 'landscape' : 'portrait';
}

function jobFilename(tool) {
  return `${tool}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function publicJob(row, { downloadUrl = true } = {}) {
  const job = {
    id: row.id,
    tool: row.tool,
    status: row.status,
    created_at: row.created_at,
    completed_at: row.completed_at,
    expires_at: row.expires_at,
    failure_code: row.status === 'failed' ? row.failure_reason : undefined,
    output_meta: row.output_meta_json ? JSON.parse(row.output_meta_json) : null,
  };
  if (downloadUrl && row.status === 'completed') job.download_url = `/api/export/${row.id}/download`;
  return job;
}

// Lazy expiry: flip one bounded batch of completed-but-expired jobs and drop their chunks.
async function cleanupExpired(env) {
  try {
    const rows = await env.DB.prepare(
      "SELECT id FROM export_jobs WHERE status = 'completed' AND expires_at <= ? LIMIT ?"
    ).bind(now(), LIMITS.CLEANUP_BATCH).all();
    const ids = (rows.results || []).map((r) => r.id);
    if (!ids.length) return;
    const ph = ids.map(() => '?').join(',');
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM output_chunks WHERE job_id IN (${ph})`).bind(...ids),
      env.DB.prepare(`UPDATE export_jobs SET status = 'expired' WHERE id IN (${ph})`).bind(...ids),
    ]);
  } catch (err) {
    console.error(`expired-output cleanup error: ${err && err.name}`);
  }
}

async function createExport(request, env, user) {
  await enforceUserRateLimit(env.DB, user.id, 'export', LIMITS.EXPORTS_PER_HOUR);
  const body = await readJson(request, LIMITS.MAX_BODY_BYTES);
  const spec = validateJobSpec(body); // 400/501 — thrown before anything is consumed

  const inputHash = await sha256Hex(JSON.stringify(spec));
  // An old key never deletes/refunds a completed job or steals an in-flight job.
  const existing = await env.DB.prepare(
    'SELECT * FROM export_jobs WHERE user_id = ? AND idempotency_key = ?'
  ).bind(user.id, spec.idempotency_key).first();
  if (existing) {
    if (existing.input_hash && existing.input_hash !== inputHash) {
      throw new HttpError(409, 'idempotency_conflict', 'This request key was used for different content. Start a new export.');
    }
    if (existing.status === 'processing') {
      throw new HttpError(409, 'export_in_progress', 'This PDF is still processing. Try again shortly.');
    }
    if (existing.status === 'expired' || (existing.expires_at && existing.expires_at <= now())) {
      throw new HttpError(410, 'export_expired', 'This PDF has expired. Start a new export; it will use a new batch credit.');
    }
    if (existing.status === 'completed') {
      await cleanupExpired(env);
      return ok({ job: publicJob(existing), remaining_free_uses: await remainingFreeUses(env.DB, user) });
    }
    throw new HttpError(409, 'export_retry_required', 'This export did not finish. Start a new export.');
  }

  const jobId = uid();
  const t = now();
  const pro = isProActive(user);
  const claim = env.DB.prepare(
    `INSERT OR IGNORE INTO export_jobs (id, user_id, idempotency_key, tool, status, input_meta_json, input_hash, created_at, started_at)
     VALUES (?, ?, ?, ?, 'processing', ?, ?, ?, ?)`
  ).bind(jobId, user.id, spec.idempotency_key, spec.tool, JSON.stringify({ pages: spec.pages ? spec.pages.length : 1 }), inputHash, t, t);
  const statements = [claim];
  if (!pro) statements.push(env.DB.prepare(RESERVATION_SQL).bind(user.id, jobId, t, user.id, user.id, user.id, jobId));
  const claimed = await env.DB.batch(statements);
  if (!claimed[0].meta?.changes) {
    throw new HttpError(409, 'export_in_progress', 'This PDF is already processing. Try again shortly.');
  }
  const reserved = !pro && !!claimed[1].meta?.changes;
  if (!pro && !reserved) {
    await env.DB.prepare("UPDATE export_jobs SET status = 'failed', failure_reason = 'free_limit_reached' WHERE id = ?").bind(jobId).run();
    throw new HttpError(402, 'free_limit_reached', 'Your 10 free PDF batches are used. Upgrade to Pro for unlimited batches.', {}, { upgrade_url: '/pricing' });
  }

  try {
    const renderSpec = spec.tool === 'test_print' ? buildTestPrintSpec(spec.settings) : spec;
    const bytes = await renderSpecPdf(renderSpec);
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error('empty_output');
    const chunks = splitChunks(bytes, LIMITS.CHUNK_BYTES);
    if (chunks.length > LIMITS.MAX_CHUNKS) throw new Error('output_too_large');

    const firstPage = renderSpec.pages[0];
    const expiresAt = t + LIMITS.OUTPUT_TTL_MS;
    const outputMeta = {
      filename: jobFilename(spec.tool),
      format: 'pdf',
      pages: renderSpec.pages.length,
      width_in: firstPage.width_in,
      height_in: firstPage.height_in,
      orientation: orientationOf(firstPage),
      bytes: bytes.length,
      expires_at: expiresAt,
    };
    const t2 = now();
    const stmts = chunks.map((c, i) =>
      env.DB.prepare(
        `INSERT INTO output_chunks (job_id, seq, content_type, bytes, created_at)
         SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM export_jobs WHERE id = ? AND status = 'processing')`
      ).bind(jobId, i, 'application/pdf', c, t2, jobId)
    );
    stmts.push(
      env.DB.prepare(
        `UPDATE export_jobs SET status = 'completed', completed_at = ?, expires_at = ?,
           output_storage = 'd1', output_key = ?, output_meta_json = ?, uses_consumed = ? WHERE id = ? AND status = 'processing'`
      ).bind(t2, expiresAt, jobId, JSON.stringify(outputMeta), pro ? 0 : 1, jobId)
    );
    const saved = await env.DB.batch(stmts);
    if (!saved.at(-1).meta?.changes) throw new Error('export_interrupted');
  } catch (err) {
    // A lost response after a successful commit must not refund an available PDF.
    const saved = await env.DB.prepare('SELECT * FROM export_jobs WHERE id = ?').bind(jobId).first().catch(() => null);
    if (saved?.status === 'completed') return ok({ job: publicJob(saved), remaining_free_uses: await remainingFreeUses(env.DB, user) });
    // Compensation: a failed export consumes zero uses.
    const reason = `${err && err.name ? err.name : 'Error'}`.slice(0, 60);
    const undo = [];
    undo.push(env.DB.prepare("DELETE FROM output_chunks WHERE job_id = ? AND EXISTS (SELECT 1 FROM export_jobs WHERE id = ? AND status = 'processing')").bind(jobId, jobId));
    if (reserved) undo.push(env.DB.prepare("DELETE FROM usage_ledger WHERE job_id = ? AND EXISTS (SELECT 1 FROM export_jobs WHERE id = ? AND status = 'processing')").bind(jobId, jobId));
    undo.push(env.DB.prepare("UPDATE export_jobs SET status = 'failed', failure_reason = ? WHERE id = ? AND status = 'processing'").bind(reason, jobId));
    await env.DB.batch(undo).catch(() => {});
    console.error(`export job ${jobId} failed (${reason})`);
    throw new HttpError(500, 'export_failed', 'PDF generation did not finish. Check My Exports before retrying; failed batch credits are restored automatically.');
  }

  await cleanupExpired(env);
  const row = await env.DB.prepare('SELECT * FROM export_jobs WHERE id = ?').bind(jobId).first();
  return ok({ job: publicJob(row), remaining_free_uses: await remainingFreeUses(env.DB, user) });
}

async function getJob(env, user, id) {
  const row = await env.DB.prepare('SELECT * FROM export_jobs WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!row) throw new HttpError(404, 'not_found', 'Not found.');
  return row;
}

async function showJob(env, user, id) {
  const row = await getJob(env, user, id);
  return ok({ job: publicJob(row), remaining_free_uses: await remainingFreeUses(env.DB, user) });
}

async function downloadJob(env, user, id) {
  const row = await getJob(env, user, id);
  if (row.status !== 'completed' || (row.expires_at && row.expires_at <= now())) {
    throw new HttpError(410, 'expired', 'This export is no longer available.');
  }
  const rows = await env.DB.prepare(
    'SELECT seq, bytes FROM output_chunks WHERE job_id = ? ORDER BY seq'
  ).bind(id).all();
  const parts = (rows.results || []).map((r) => new Uint8Array(r.bytes));
  if (!parts.length) throw new HttpError(410, 'expired', 'This export is no longer available.');
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  const meta = row.output_meta_json ? JSON.parse(row.output_meta_json) : null;
  const filename = meta && meta.filename ? meta.filename : 'export.pdf';
  return new Response(out, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

async function deleteJob(env, user, id) {
  const row = await getJob(env, user, id);
  if (row.status === 'processing') throw new HttpError(409, 'export_in_progress', 'Wait for this PDF to finish before deleting it.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM output_chunks WHERE job_id = ?').bind(row.id),
    env.DB.prepare("UPDATE export_jobs SET status = 'expired' WHERE id = ?").bind(row.id),
  ]);
  return ok({ message: 'Export deleted.' });
}

async function listJobs(env, user, searchParams) {
  await cleanupExpired(env);
  const limitRaw = Number(searchParams.get('limit') || LIMITS.HISTORY_DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), LIMITS.HISTORY_MAX_LIMIT) : LIMITS.HISTORY_DEFAULT_LIMIT;
  const rows = await env.DB.prepare(
    `SELECT id, tool, status, created_at, expires_at, output_meta_json FROM export_jobs
     WHERE user_id = ? AND status NOT IN ('expired', 'failed') ORDER BY created_at DESC LIMIT ?`
  ).bind(user.id, limit).all();
  return ok({
    exports: (rows.results || []).map((r) => publicJob(r, { downloadUrl: false })),
  });
}

const JOB_PATH = /^\/api\/export\/([0-9a-zA-Z-]+)$/;

export async function handleExportApi(request, env, path, searchParams) {
  const user = await getSessionUser(env, request);
  if (!user) throw new HttpError(401, 'unauthorized', 'Not signed in.');
  const route = `${request.method} ${path}`;
  if (route === 'POST /api/export') return createExport(request, env, user);
  if (route === 'GET /api/exports') return listJobs(env, user, searchParams);
  const m = path.match(JOB_PATH);
  if (m) {
    if (request.method === 'GET') return showJob(env, user, m[1]);
    if (request.method === 'DELETE') return deleteJob(env, user, m[1]);
  }
  const md = path.match(/^\/api\/export\/([0-9a-zA-Z-]+)\/download$/);
  if (md && request.method === 'GET') return downloadJob(env, user, md[1]);
  throw new HttpError(404, 'not_found', 'Not found.');
}
