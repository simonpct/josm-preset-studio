// JOSM preset icons: loaded on demand from the JOSM GitHub mirror.
// The bundled src/data/josm-icons.json is a lightweight index (category ->
// list of names). Actual SVG bytes are fetched lazily and cached as object
// URLs for the session.
//
// Reference: https://github.com/JOSM/josm/tree/master/resources/images/presets
// Icon path in preset XML is relative to `resources/images/`, e.g.
//   <item name="Bar" icon="presets/food/bar.svg">

import iconData from '@/data/josm-icons.json';

export interface JosmIconIndex {
  source_sha: string;
  categories: Record<string, string[]>;
}

export const iconIndex: JosmIconIndex = iconData as JosmIconIndex;

export interface IconEntry {
  /** Top-level JOSM category, e.g. "vehicle". */
  category: string;
  /**
   * Sub-path within the category (no extension), may contain slashes.
   * Example: "parking/parking" for presets/vehicle/parking/parking.svg.
   */
  name: string;
  /** Filename stem (last segment of `name`), used as the display label. */
  leaf: string;
  /**
   * Intermediate path between category and leaf (no leading/trailing slash),
   * empty string if the icon sits directly in the category folder.
   */
  subpath: string;
  /** Path as stored in preset XML, e.g. "presets/vehicle/parking/parking.svg". */
  path: string;
}

/** Flatten the index into a searchable list. */
export function allIcons(): IconEntry[] {
  const out: IconEntry[] = [];
  for (const [category, names] of Object.entries(iconIndex.categories)) {
    for (const name of names) {
      const lastSlash = name.lastIndexOf('/');
      const leaf = lastSlash < 0 ? name : name.slice(lastSlash + 1);
      const subpath = lastSlash < 0 ? '' : name.slice(0, lastSlash);
      out.push({
        category,
        name,
        leaf,
        subpath,
        path: `presets/${category}/${name}.svg`,
      });
    }
  }
  return out;
}

const BASE = 'https://raw.githubusercontent.com/JOSM/josm/master/resources/images/';

// path -> object URL
const blobCache = new Map<string, string>();
// path -> in-flight promise (de-duplicate concurrent fetches)
const inflight = new Map<string, Promise<string>>();
const MAX_CACHE = 256;

/**
 * Resolve a JOSM icon path to a blob: URL usable in <img src=>.
 * Returns null if the fetch fails. Results are cached for the session.
 */
export function loadIconUrl(path: string): Promise<string | null> {
  const cached = blobCache.get(path);
  if (cached) return Promise.resolve(cached);
  const existing = inflight.get(path);
  if (existing) return existing.then((u) => u).catch(() => null);

  const p = (async (): Promise<string> => {
    const r = await fetch(BASE + path);
    if (!r.ok) throw new Error(`icon fetch ${r.status}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    // Evict oldest if we exceed the cap.
    if (blobCache.size >= MAX_CACHE) {
      const firstKey = blobCache.keys().next().value;
      if (firstKey) {
        const stale = blobCache.get(firstKey);
        if (stale) URL.revokeObjectURL(stale);
        blobCache.delete(firstKey);
      }
    }
    blobCache.set(path, url);
    return url;
  })();
  inflight.set(path, p);
  p.finally(() => inflight.delete(path));
  return p.catch(() => null);
}

/** Simple substring + category filter. */
export function searchIcons(query: string, category: string | null): IconEntry[] {
  const q = query.trim().toLowerCase();
  const list = allIcons();
  return list.filter((ic) => {
    if (category && ic.category !== category) return false;
    if (!q) return true;
    return ic.name.toLowerCase().includes(q) || ic.category.toLowerCase().includes(q);
  });
}
