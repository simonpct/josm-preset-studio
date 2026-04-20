#!/usr/bin/env node
// Regenerate src/data/josm-icons.json from the JOSM GitHub mirror.
// Run manually when you want to refresh against upstream:
//   node scripts/fetch-josm-icons.mjs
//
// Includes all icons under presets/<category>/... at any nesting depth.
// The top-level directory is the "category"; the remainder (without .svg)
// is the entry identifier, which may contain slashes.
//
// Example: resources/images/presets/vehicle/parking/parking.svg
//   → category "vehicle", entry "parking/parking"
//   → full XML icon path "presets/vehicle/parking/parking.svg"

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', 'src', 'data', 'josm-icons.json');

const r = await fetch('https://api.github.com/repos/JOSM/josm/git/trees/master?recursive=1', {
  headers: { 'user-agent': 'josm-preset-studio-build' },
});
if (!r.ok) {
  console.error(`GitHub API ${r.status}: ${await r.text()}`);
  process.exit(1);
}
const data = await r.json();

const PREFIX = 'resources/images/presets/';
/** @type {Record<string, string[]>} */
const byCat = {};
for (const t of data.tree ?? []) {
  if (t.type !== 'blob') continue;
  const p = t.path;
  if (!p.startsWith(PREFIX) || !p.endsWith('.svg')) continue;
  const rest = p.slice(PREFIX.length); // e.g. "vehicle/parking/parking.svg"
  const firstSlash = rest.indexOf('/');
  if (firstSlash <= 0) continue; // skip files directly in presets/
  const cat = rest.slice(0, firstSlash);
  const entry = rest.slice(firstSlash + 1, -4); // strip ".svg"
  (byCat[cat] ??= []).push(entry);
}
for (const cat of Object.keys(byCat)) byCat[cat].sort();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source_sha: data.sha ?? '',
      categories: Object.fromEntries(
        Object.keys(byCat)
          .sort()
          .map((k) => [k, byCat[k]]),
      ),
    },
    null,
    0,
  ),
);
const total = Object.values(byCat).reduce((a, b) => a + b.length, 0);
const nested = Object.values(byCat)
  .flat()
  .filter((e) => e.includes('/')).length;
console.log(
  `wrote ${OUT}: ${total} icons in ${Object.keys(byCat).length} categories (${nested} nested)`,
);
