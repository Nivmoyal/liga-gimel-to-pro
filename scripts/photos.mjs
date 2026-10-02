#!/usr/bin/env node
// Photo pipeline for the game's scenes.
//
//   node scripts/photos.mjs search [key ...]   download candidates from Openverse
//                                              (CC0 / PDM / CC BY / CC BY-SA only)
//                                              into photo-candidates/<key>/
//   node scripts/photos.mjs pick key=2 other=0 install chosen candidates into
//                                              public/photos (resized, compressed)
//                                              and record credits in the manifest
//   node scripts/photos.mjs add key path/to.jpg "Author" "License"
//                                              install your own photo for a scene
//
// Scene keys match the "scene" field of events plus: title, intro_1..3,
// stadium_football / stadium_basketball, field_football / field_basketball.

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const CANDIDATES = join(ROOT, 'photo-candidates');
const OUT = join(ROOT, 'public', 'photos');
const MANIFEST = join(ROOT, 'src', 'data', 'photoManifest.json');
const ALLOWED = new Set(['cc0', 'pdm', 'by', 'by-sa']);

export const QUERIES = {
  title: 'empty football pitch sunset bench',
  intro_1: 'young man sitting football field sunset',
  intro_2: 'amateur football training evening',
  intro_3: 'football stadium crowd night lights',
  fb_1v1: 'soccer striker goalkeeper one on one',
  fb_penalty: 'soccer penalty kick goalkeeper',
  fb_freekick: 'soccer free kick wall',
  fb_header: 'soccer header jump ball',
  fb_cross: 'soccer winger cross',
  fb_tackle: 'soccer sliding tackle',
  fb_counter: 'soccer player dribbling ball',
  fb_defense: 'soccer defender duel',
  bb_three: 'basketball jump shot three pointer',
  bb_freethrow: 'basketball free throw',
  bb_pnr: 'basketball pick and roll screen',
  bb_fastbreak: 'basketball fast break',
  bb_block: 'basketball block shot',
  bb_post: 'basketball post player',
  bb_drive: 'basketball drive layup',
  stadium_football: 'football stadium night floodlights',
  stadium_basketball: 'basketball arena crowd',
  field_football: 'football training cones pitch',
  field_basketball: 'basketball court gym empty',
  fans: 'football supporters scarves stadium',
  locker: 'sports locker room',
  coach_board: 'coach tactics whiteboard',
  office: 'contract signing desk office',
  phone: 'smartphone social media notifications',
  press: 'press conference microphones',
  gym: 'gym weight training athlete',
  home: 'living room evening sofa',
  party: 'friends party lights night',
  shop: 'sports shoes store shelf',
  street: 'kids street football',
  work: 'delivery scooter city night',
  national: 'israel flag stadium',
  trophy: 'trophy celebration confetti',
};

async function search(keys) {
  const list = keys.length ? keys : Object.keys(QUERIES);
  for (const key of list) {
    const q = QUERIES[key];
    if (!q) throw new Error(`unknown key ${key}`);
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm,by,by-sa&extension=jpg&page_size=12`;
    const res = await fetch(url, { headers: { 'User-Agent': 'liga-gimel-to-pro photo script' } });
    if (!res.ok) throw new Error(`${key}: Openverse ${res.status}`);
    const { results } = await res.json();
    const dir = join(CANDIDATES, key);
    await mkdir(dir, { recursive: true });
    const meta = [];
    for (const r of results) {
      if (!ALLOWED.has(r.license) || meta.length >= 6) continue;
      try {
        const img = await fetch(r.url);
        if (!img.ok) continue;
        const buf = Buffer.from(await img.arrayBuffer());
        const i = meta.length;
        await sharp(buf).resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(join(dir, `${i}.jpg`));
        meta.push({
          i,
          url: r.url,
          title: r.title,
          author: r.creator,
          license: `CC ${r.license.toUpperCase()} ${r.license_version ?? ''}`.trim(),
          licenseUrl: r.license_url,
          source: r.foreign_landing_url,
        });
      } catch {
        /* skip broken candidates */
      }
    }
    await writeFile(join(dir, 'candidates.json'), JSON.stringify(meta, null, 2));
    console.log(`${key}: ${meta.length} candidates`);
  }
}

async function loadManifest() {
  return existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
}

async function install(key, buffer, info) {
  await mkdir(OUT, { recursive: true });
  const manifest = await loadManifest();
  const n = (manifest[key] ?? []).length;
  const file = `${key}-${n}.jpg`;
  const portrait = key === 'title' || key.startsWith('intro_');
  await sharp(buffer)
    .resize(portrait ? { width: 900, height: 1600, fit: 'cover' } : { width: 1000, height: 560, fit: 'cover' })
    .jpeg({ quality: 74, mozjpeg: true })
    .toFile(join(OUT, file));
  manifest[key] = [...(manifest[key] ?? []), { file, ...info }];
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`installed ${file}`);
}

async function pick(pairs) {
  for (const pair of pairs) {
    const [key, idx] = pair.split('=');
    const dir = join(CANDIDATES, key);
    const meta = JSON.parse(await readFile(join(dir, 'candidates.json'), 'utf8')).find((m) => String(m.i) === idx);
    if (!meta) throw new Error(`no candidate ${pair}`);
    const res = await fetch(meta.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const { title, author, license, licenseUrl, source } = meta;
    await install(key, buffer, { title, author, license, licenseUrl, source });
  }
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'search') await search(args);
else if (cmd === 'pick') await pick(args);
else if (cmd === 'add') {
  const [key, path, author = '', license = ''] = args;
  await install(key, await readFile(path), { author, license });
} else if (cmd === 'list') {
  console.log((await readdir(OUT).catch(() => [])).join('\n'));
} else {
  console.log('usage: node scripts/photos.mjs search [keys] | pick key=i ... | add key file [author] [license]');
}
