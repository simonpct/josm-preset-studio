// Shared helpers for Pages Functions.

export interface Env {
  PRESETS: KVNamespace;
  OSM_API_BASE?: string;
}

export const OSM_API_BASE_DEFAULT = 'https://api.openstreetmap.org';

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export function err(status: number, message: string): Response {
  return json({ error: message }, { status });
}

export interface OsmIdentity {
  id: number;
  display_name: string;
}

/** Verify an OSM access token by calling /api/0.6/user/details.json. */
export async function verifyOsmToken(
  req: Request,
  env: Env,
): Promise<OsmIdentity | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;
  const base = env.OSM_API_BASE ?? OSM_API_BASE_DEFAULT;
  const r = await fetch(`${base}/api/0.6/user/details.json`, {
    headers: { authorization: auth },
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { user?: { id: number; display_name: string } };
  if (!data.user) return null;
  return { id: data.user.id, display_name: data.user.display_name };
}

/** 8-char url-safe id. ~47 bits of entropy. */
export function newId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

export interface StoredPreset {
  id: string;
  title: string;
  xml: string;
  ownerId: number;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_XML_BYTES = 512 * 1024;

export async function loadPreset(env: Env, id: string): Promise<StoredPreset | null> {
  const raw = await env.PRESETS.get(`preset:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPreset;
  } catch {
    return null;
  }
}
