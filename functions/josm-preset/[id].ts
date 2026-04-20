// GET /josm-preset/:id
// Returns the raw XML of a stored preset with application/xml content type,
// so JOSM can load it directly from the URL.
// Public; no authentication.

import { type Env, err, loadPreset } from '../_shared';

export const onRequestOptions: PagesFunction<Env, 'id'> = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-max-age': '86400',
    },
  });

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ env, params }) => {
  const id = String(params.id);
  const p = await loadPreset(env, id);
  if (!p) return err(404, 'not found');

  const safeName = p.title.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || p.id;

  return new Response(p.xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // Short public cache so in-place edits propagate quickly.
      'cache-control': 'public, max-age=60, must-revalidate',
      'content-disposition': `inline; filename="${safeName}.xml"`,
      'access-control-allow-origin': '*',
      'x-preset-id': p.id,
      'x-preset-updated-at': String(p.updatedAt),
    },
  });
};
