// GET    /api/preset/:id — public read of a stored preset.
// PUT    /api/preset/:id — update (OSM auth; ownerId must match).
// DELETE /api/preset/:id — delete (OSM auth; ownerId must match).

import {
  type Env,
  err,
  json,
  loadPreset,
  MAX_XML_BYTES,
  type StoredPreset,
  verifyOsmToken,
} from '../../_shared';

const CORS: HeadersInit = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};

export const onRequestOptions: PagesFunction<Env, 'id'> = () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ env, params }) => {
  const id = String(params.id);
  const p = await loadPreset(env, id);
  if (!p) return err(404, 'not found');
  return json(p, { headers: CORS });
};

export const onRequestPut: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const id = String(params.id);
  const user = await verifyOsmToken(request, env);
  if (!user) return err(401, 'Invalid or missing OSM token');
  const p = await loadPreset(env, id);
  if (!p) return err(404, 'not found');
  if (p.ownerId !== user.id) return err(403, 'not the owner');

  let body: { title?: unknown; xml?: unknown };
  try {
    body = await request.json();
  } catch {
    return err(400, 'Body must be JSON');
  }
  const title = typeof body.title === 'string' ? body.title.trim() : p.title;
  const xml = typeof body.xml === 'string' ? body.xml : p.xml;
  if (!title) return err(400, 'title cannot be empty');
  if (title.length > 200) return err(400, 'title too long');
  if (new TextEncoder().encode(xml).length > MAX_XML_BYTES)
    return err(413, `xml > ${MAX_XML_BYTES} bytes`);
  if (!xml.includes('<presets')) return err(400, 'xml must be a JOSM preset document');

  const updated: StoredPreset = {
    ...p,
    title,
    xml,
    updatedAt: Math.floor(Date.now() / 1000),
  };
  await env.PRESETS.put(`preset:${id}`, JSON.stringify(updated));
  return json(
    { id, title: updated.title, updatedAt: updated.updatedAt },
    { headers: CORS },
  );
};

export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const id = String(params.id);
  const user = await verifyOsmToken(request, env);
  if (!user) return err(401, 'Invalid or missing OSM token');
  const p = await loadPreset(env, id);
  if (!p) return err(404, 'not found');
  if (p.ownerId !== user.id) return err(403, 'not the owner');
  await env.PRESETS.delete(`preset:${id}`);
  return json({ ok: true }, { headers: CORS });
};
