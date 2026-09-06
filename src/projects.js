// Projects domain: saved label projects (per-user CRUD over the D1 `projects`
// table from migration 0001 — no new tables). List responses NEVER carry
// data_json; single-fetch returns the full row for hydration. Ownership is
// enforced by user_id-scoped queries — another user's id is a 404, never 403
// (no existence oracle). Writes are rate-limited per user. No user content in
// logs.
//
// Project data shape (v1, defined here as the contract):
//   editor:  { meta:{version:1, tool:'editor'}, preset:'<presetKey>', elements:[{id,type,x,y,text,fontSize,width,aspectRatio,src,align,bold}] }
//   bin:     { meta:{version:1, tool:'bin'},     values:{ '<input-id>': '<value>' } }
//   whatnot: { meta:{version:1, tool:'whatnot'}, values:{...} }
//   fnsku:   { meta:{version:1, tool:'fnsku'},   values:{...} }
// The server treats `data` as opaque JSON (≤ MAX_DATA_BYTES) — validation of
// the inner shape lives client-side where the schema is owned.

import { ok, HttpError, readJson } from './http.js';
import { now, uid } from './db.js';
import { getSessionUser } from './auth.js';
import { enforceUserRateLimit } from './ratelimit.js';

const KNOWN_TOOLS = new Set(['editor', 'bin', 'whatnot', 'fnsku']);
const MAX_DATA_BYTES = 256 * 1024;
const BODY_CAP = 300 * 1024; // data cap + JSON envelope headroom
const WRITES_PER_HOUR = 60;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const MAX_NAME_CHARS = 80;

function expectName(value, { required = true } = {}) {
  if (value === undefined && !required) return undefined;
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > MAX_NAME_CHARS) {
    throw new HttpError(400, 'validation_error', `Project name must be 1-${MAX_NAME_CHARS} characters.`);
  }
  return name;
}

function expectTool(value) {
  if (!KNOWN_TOOLS.has(value)) {
    throw new HttpError(400, 'validation_error', 'Unknown tool.');
  }
  return value;
}

// Serialize + size-check in one pass. Rejects non-objects (array/null/scalar)
// so data is always a JSON object at rest.
function serializeData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'validation_error', 'Project data must be a JSON object.');
  }
  const text = JSON.stringify(value);
  if (new TextEncoder().encode(text).byteLength > MAX_DATA_BYTES) {
    throw new HttpError(400, 'data_too_large', `Project data is too large (max ${Math.floor(MAX_DATA_BYTES / 1024)}KB).`);
  }
  return text;
}

function listSummary(row) {
  return { id: row.id, name: row.name, tool: row.tool, is_template: row.is_template, updated_at: row.updated_at };
}

function fullProject(row) {
  return {
    id: row.id,
    name: row.name,
    tool: row.tool,
    is_template: row.is_template,
    data: JSON.parse(row.data_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createProject(request, env, user) {
  await enforceUserRateLimit(env.DB, user.id, 'projects', WRITES_PER_HOUR);
  const body = await readJson(request, BODY_CAP);
  const name = expectName(body.name);
  const tool = expectTool(body.tool);
  const dataJson = serializeData(body.data);
  const isTemplate = body.is_template === true ? 1 : 0;
  const id = uid();
  const t = now();
  await env.DB.prepare(
    'INSERT INTO projects (id, user_id, name, tool, data_json, is_template, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)'
  )
    .bind(id, user.id, name, tool, dataJson, isTemplate, t, t)
    .run();
  return ok({ project: { id, name, tool, is_template: isTemplate, updated_at: t } });
}

async function listProjects(env, user, searchParams) {
  const limitRaw = Number(searchParams.get('limit') || DEFAULT_LIST_LIMIT);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_LIST_LIMIT) : DEFAULT_LIST_LIMIT;
  const rows = await env.DB.prepare(
    'SELECT id, name, tool, is_template, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?'
  )
    .bind(user.id, limit)
    .all();
  return ok({ projects: (rows.results || []).map(listSummary) });
}

async function getOwnedRow(env, user, id) {
  const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!row) throw new HttpError(404, 'not_found', 'Not found.');
  return row;
}

async function showProject(env, user, id) {
  return ok({ project: fullProject(await getOwnedRow(env, user, id)) });
}

async function patchProject(request, env, user, id) {
  await enforceUserRateLimit(env.DB, user.id, 'projects', WRITES_PER_HOUR);
  await getOwnedRow(env, user, id); // 404 before any write attempt
  const body = await readJson(request, BODY_CAP);
  const sets = [];
  const binds = [];
  if (body.name !== undefined) {
    sets.push('name = ?');
    binds.push(expectName(body.name));
  }
  if (body.data !== undefined) {
    sets.push('data_json = ?');
    binds.push(serializeData(body.data));
  }
  if (body.is_template !== undefined) {
    sets.push('is_template = ?');
    binds.push(body.is_template === true ? 1 : 0);
  }
  if (!sets.length) throw new HttpError(400, 'validation_error', 'Nothing to update (name, data, is_template).');
  sets.push('updated_at = ?');
  binds.push(now(), id, user.id);
  await env.DB.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).bind(...binds).run();
  return ok({ project: fullProject(await getOwnedRow(env, user, id)) });
}

async function deleteProject(env, user, id) {
  await getOwnedRow(env, user, id);
  await env.DB.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return ok({ message: 'Project deleted.' });
}

const ITEM_PATH = /^\/api\/projects\/([0-9a-zA-Z-]+)$/;

export async function handleProjectsApi(request, env, path, searchParams) {
  const user = await getSessionUser(env, request);
  if (!user) throw new HttpError(401, 'unauthorized', 'Not signed in.');
  const route = `${request.method} ${path}`;
  if (route === 'POST /api/projects') return createProject(request, env, user);
  if (route === 'GET /api/projects') return listProjects(env, user, searchParams);
  const m = path.match(ITEM_PATH);
  if (m) {
    if (request.method === 'GET') return showProject(env, user, m[1]);
    if (request.method === 'PATCH') return patchProject(request, env, user, m[1]);
    if (request.method === 'DELETE') return deleteProject(env, user, m[1]);
  }
  throw new HttpError(404, 'not_found', 'Not found.');
}
