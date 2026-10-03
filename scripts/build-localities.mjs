// Builds src/data/localities.json from the israel-geolocation package
// (MIT, data from Israeli government settlement records): every Israeli
// locality with its Hebrew name and coordinates, compacted to
// [name, lat, lon] rows.
//
//   npx --yes -p israel-geolocation@1.0.1 node scripts/build-localities.mjs <path to locations.json>

import { readFile, writeFile } from 'node:fs/promises';

const FIXES = {
  // The source has the coordinates of an unrelated place for this one.
  עטרת: [31.9915, 35.1496],
};

const src = JSON.parse(await readFile(process.argv[2], 'utf8'));
const rows = src
  .map((l) => {
    const [lat, lon] = FIXES[l.name] ?? [l.lat, l.lon];
    return [l.name.trim(), Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4];
  })
  .filter(([, lat, lon]) => lat > 29.4 && lat < 33.4 && lon > 34.2 && lon < 35.95)
  .sort((a, b) => a[0].localeCompare(b[0], 'he'));
await writeFile(new URL('../src/data/localities.json', import.meta.url), '[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');
console.log(`${rows.length} localities`);
