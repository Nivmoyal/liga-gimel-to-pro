// Installs ready-made scene images (e.g. AI images made by hand) from a folder:
// files named <scene>.jpg/.png/.webp as listed in scripts/ai-photo-prompts.json
// (<scene>-2.jpg and so on add extra variants of a scene).
// Thin white frame lines and slivers of neighbouring pictures (left over from
// cutting a contact sheet) are trimmed, then each image is saved as
// public/images/<scene>.jpg and registered in src/data/photoManifest.json.
//
//   node scripts/import-images.mjs <folder>

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'images');
const MANIFEST = join(ROOT, 'src', 'data', 'photoManifest.json');
const PROMPTS = JSON.parse(await readFile(join(ROOT, 'scripts', 'ai-photo-prompts.json'), 'utf8'));

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/import-images.mjs <folder>');
  process.exit(1);
}

/** Share of bright (near white) pixels in each row and column. */
function brightness(data, width, height, channels) {
  const rows = new Float64Array(height);
  const cols = new Float64Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i] > 175 && data[i + 1] > 175 && data[i + 2] > 175) {
        rows[y] += 1 / width;
        cols[x] += 1 / height;
      }
    }
  }
  return { rows, cols };
}

/** Longest run of indexes whose line is not a white divider. */
function widestSegment(lines) {
  // A divider is a thin (at most 5px) line that is almost entirely white;
  // wider bright bands are picture content such as white shirts or sky.
  const divider = new Array(lines.length).fill(false);
  for (let i = 0; i < lines.length; ) {
    if (lines[i] <= 0.85) { i++; continue; }
    let j = i;
    while (j < lines.length && lines[j] > 0.85) j++;
    if (j - i <= 5) for (let k = i; k < j; k++) divider[k] = true;
    i = j;
  }
  let best = [0, lines.length];
  let bestLen = 0;
  let start = null;
  for (let i = 0; i <= lines.length; i++) {
    const cut = i === lines.length || divider[i];
    if (!cut && start === null) start = i;
    if (cut && start !== null) {
      if (i - start > bestLen) {
        bestLen = i - start;
        best = [start, i];
      }
      start = null;
    }
  }
  return best;
}

async function clean(path) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { rows, cols } = brightness(data, info.width, info.height, info.channels);
  const [x0, x1] = widestSegment(cols);
  const [y0, y1] = widestSegment(rows);
  // Two more pixels on each side drop the anti-aliased edge of a divider.
  const inset = (a, b, size) => [Math.min(a + (a > 0 ? 2 : 0), size - 1), Math.max(b - (b < size ? 2 : 0), a + 1)];
  const [left, right] = inset(x0, x1, info.width);
  const [top, bottom] = inset(y0, y1, info.height);
  return sharp(path).extract({ left, top, width: right - left, height: bottom - top });
}

await mkdir(OUT, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
const files = (await readdir(dir)).filter((f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()));
let installed = 0;
for (const file of files) {
  // "<scene>.jpg" is the main image; "<scene>-2.jpg", "<scene>-3.jpg" add variants
  // that the game picks between per situation.
  const name = file.slice(0, -extname(file).length);
  const variant = /^(.+)-(\d+)$/.exec(name);
  const key = variant && PROMPTS.scenes[variant[1]] ? variant[1] : name;
  if (!PROMPTS.scenes[key]) {
    console.warn(`skipped ${file}: unknown scene`);
    continue;
  }
  const image = await clean(join(dir, file));
  const { width } = await image.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  // Small sources are enlarged a little (smooth Lanczos) so phones do not show blocky pixels.
  const sized = width < 768 ? image.resize({ width: 768, kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }) : image.resize({ width: Math.min(width, 1280), withoutEnlargement: true });
  await sized
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(OUT, `${name}.jpg`));
  const entry = { file: `images/${name}.jpg`, title: PROMPTS.scenes[key], author: 'תמונת AI', license: 'AI' };
  const others = (manifest[key] ?? []).filter((p) => p.file !== entry.file);
  manifest[key] = name === key ? [entry, ...others] : [...others, entry];
  installed += 1;
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
const missing = Object.keys(PROMPTS.scenes).filter((k) => !manifest[k]);
console.log(`installed ${installed} images${missing.length ? `; still missing: ${missing.join(', ')}` : ''}`);
