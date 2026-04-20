// Frontend short-link preset store.
//
// - Preset XML lives in Cloudflare KV via /api/preset/*.
// - Anyone with the id can READ (public share link).
// - Only the original OSM owner can UPDATE or DELETE (backend checks).
// - Each user's own list of presets is mirrored into OSM preferences under
//   `jps.index` so it syncs across devices. The mirror is advisory only —
//   security is enforced server-side by ownership check.

import { getToken } from './auth';
import { getChunkedJson, putChunkedJson } from './osmPrefs';

export interface PresetPublic {
  id: string;
  title: string;
  xml: string;
  ownerId: number;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
}

export interface IndexEntry {
  id: string;
  title: string;
  updatedAt: number;
}

const API = '/api/preset';
const INDEX_KEY = 'index';

function bearer(): HeadersInit {
  const t = getToken();
  if (!t) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${t.access_token}` };
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return (await res.json()) as T;
}

export async function createPreset(title: string, xml: string): Promise<IndexEntry> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify({ title, xml }),
  });
  const data = await readJson<{ id: string; title: string; updatedAt: number }>(res);
  const entry: IndexEntry = {
    id: data.id,
    title: data.title,
    updatedAt: data.updatedAt,
  };
  await addToIndex(entry);
  return entry;
}

export async function updatePreset(
  entry: IndexEntry,
  patch: { title?: string; xml?: string },
): Promise<IndexEntry> {
  const res = await fetch(`${API}/${encodeURIComponent(entry.id)}`, {
    method: 'PUT',
    headers: { ...bearer(), 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await readJson<{ id: string; title: string; updatedAt: number }>(res);
  const next: IndexEntry = { id: data.id, title: data.title, updatedAt: data.updatedAt };
  await replaceInIndex(next);
  return next;
}

export async function deletePreset(entry: IndexEntry): Promise<void> {
  const res = await fetch(`${API}/${encodeURIComponent(entry.id)}`, {
    method: 'DELETE',
    headers: bearer(),
  });
  await readJson<{ ok: true }>(res);
  await removeFromIndex(entry.id);
}

/** Public read; does not require auth. */
export async function fetchPreset(id: string): Promise<PresetPublic> {
  const res = await fetch(`${API}/${encodeURIComponent(id)}`);
  return readJson<PresetPublic>(res);
}

// --- Index in OSM prefs ---------------------------------------------------

export async function loadIndex(): Promise<IndexEntry[]> {
  const data = await getChunkedJson<IndexEntry[]>(INDEX_KEY);
  return Array.isArray(data) ? data : [];
}

async function saveIndex(entries: IndexEntry[]): Promise<void> {
  await putChunkedJson(INDEX_KEY, entries);
}

async function addToIndex(entry: IndexEntry): Promise<void> {
  const current = await loadIndex();
  const next = [entry, ...current.filter((e) => e.id !== entry.id)];
  await saveIndex(next);
}

async function replaceInIndex(entry: IndexEntry): Promise<void> {
  const current = await loadIndex();
  const next = current.map((e) => (e.id === entry.id ? entry : e));
  await saveIndex(next);
}

async function removeFromIndex(id: string): Promise<void> {
  const current = await loadIndex();
  await saveIndex(current.filter((e) => e.id !== id));
}
