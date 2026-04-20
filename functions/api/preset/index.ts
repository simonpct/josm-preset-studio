// POST /api/preset — create a new short-linked preset.
// Body: { title: string, xml: string }
// Auth: OSM Bearer token (verified against api.openstreetmap.org).
// Returns: { id, title, ownerId, ownerName, updatedAt }

import {
  type Env,
  err,
  json,
  MAX_XML_BYTES,
  newId,
  type StoredPreset,
  verifyOsmToken,
} from '../../_shared';

const CORS: HeadersInit = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};

export const onRequestOptions: PagesFunction<Env> = () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyOsmToken(request, env);
  if (!user) return err(401, 'Invalid or missing OSM token');

  let body: { title?: unknown; xml?: unknown };
  try {
    body = await request.json();
  } catch {
    return err(400, 'Body must be JSON');
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const xml = typeof body.xml === 'string' ? body.xml : '';
  if (!title) return err(400, 'title required');
  if (title.length > 200) return err(400, 'title too long');
  if (!xml) return err(400, 'xml required');
  if (new TextEncoder().encode(xml).length > MAX_XML_BYTES)
    return err(413, `xml > ${MAX_XML_BYTES} bytes`);
  if (!xml.includes('<presets')) return err(400, 'xml must be a JOSM preset document');

  const id = newId();
  const now = Math.floor(Date.now() / 1000);
  const record: StoredPreset = {
    id,
    title,
    xml,
    ownerId: user.id,
    ownerName: user.display_name,
    createdAt: now,
    updatedAt: now,
  };
  await env.PRESETS.put(`preset:${id}`, JSON.stringify(record));
  return json(
    {
      id,
      title,
      ownerId: user.id,
      ownerName: user.display_name,
      updatedAt: now,
    },
    { headers: CORS },
  );
};
