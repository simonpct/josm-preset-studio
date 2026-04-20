// OSM user preferences client.
// Reference: https://wiki.openstreetmap.org/wiki/API_v0.6#Preferences_of_the_logged-in_user
//
// Hard limits:
//   - 255 characters per key AND per value (unicode codepoints)
//   - Max 150 preferences total per user (shared across ALL apps)
// We namespace our keys under `jps.` and try to stay under ~20 keys.

import { env } from './env';
import { authHeader } from './auth';

const NS = 'jps.';

export interface OsmUser {
  id: number;
  display_name: string;
}

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${env.apiBase}/api/0.6${path}`, {
    ...init,
    headers: {
      ...authHeader(),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`OSM API ${res.status}: ${await res.text()}`);
  }
  return res;
}

export async function getUserDetails(): Promise<OsmUser> {
  const res = await fetch(`${env.apiBase}/api/0.6/user/details.json`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`user/details ${res.status}`);
  const data = await res.json();
  return { id: data.user.id, display_name: data.user.display_name };
}

/** Fetch all preferences. Returns a plain object. */
export async function listPrefs(): Promise<Record<string, string>> {
  const res = await req('/user/preferences.json');
  if (res.status === 404) return {};
  const data = await res.json();
  return data.preferences ?? {};
}

/** Fetch preferences under the `jps.` namespace only. */
export async function listAppPrefs(): Promise<Record<string, string>> {
  const all = await listPrefs();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(NS)) out[k.slice(NS.length)] = v;
  }
  return out;
}

export async function getPref(key: string): Promise<string | null> {
  const res = await req(`/user/preferences/${encodeURIComponent(NS + key)}`);
  if (res.status === 404) return null;
  return res.text();
}

export async function putPref(key: string, value: string): Promise<void> {
  if ([...value].length > 255) {
    throw new Error(`Preference value too long (${[...value].length} > 255): ${key}`);
  }
  if ([...(NS + key)].length > 255) {
    throw new Error(`Preference key too long: ${NS + key}`);
  }
  await req(`/user/preferences/${encodeURIComponent(NS + key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: value,
  });
}

export async function deletePref(key: string): Promise<void> {
  await req(`/user/preferences/${encodeURIComponent(NS + key)}`, { method: 'DELETE' });
}

/**
 * Store a JSON object across multiple preference keys if it doesn't fit in 255 chars.
 * Uses keys `${key}.0`, `${key}.1`, ... and a metadata key `${key}` with the chunk count.
 * This is wasteful — avoid for large payloads. Only use for small index-like data.
 */
export async function putChunkedJson(key: string, obj: unknown): Promise<void> {
  const json = JSON.stringify(obj);
  const codepoints = [...json];
  const CHUNK = 240; // leave some slack
  if (codepoints.length <= 255) {
    await putPref(key, json);
    return;
  }
  const chunks: string[] = [];
  for (let i = 0; i < codepoints.length; i += CHUNK) {
    chunks.push(codepoints.slice(i, i + CHUNK).join(''));
  }
  // Write chunks then the header, so a reader who sees the header can trust the chunks.
  for (let i = 0; i < chunks.length; i++) {
    await putPref(`${key}.${i}`, chunks[i]);
  }
  await putPref(key, `@chunked:${chunks.length}`);
}

export async function getChunkedJson<T = unknown>(key: string): Promise<T | null> {
  const head = await getPref(key);
  if (head == null) return null;
  if (!head.startsWith('@chunked:')) {
    try {
      return JSON.parse(head) as T;
    } catch {
      return null;
    }
  }
  const count = parseInt(head.slice('@chunked:'.length), 10);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const p = await getPref(`${key}.${i}`);
    if (p == null) throw new Error(`Missing chunk ${key}.${i}`);
    parts.push(p);
  }
  try {
    return JSON.parse(parts.join('')) as T;
  } catch {
    return null;
  }
}
