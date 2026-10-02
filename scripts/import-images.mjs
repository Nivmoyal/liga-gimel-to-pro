// Installs ready-made scene images (e.g. AI images made by hand) from a folder:
// files named <scene>.jpg/.png/.webp as listed in scripts/ai-photo-prompts.json.
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
  let best = [0, lines.length];
  let bestLen = 0;
  let start = null;
  for (let i = 0; i <= lines.length; i++) {
    const divider = i === lines.length || lines[i] > 0.5;
    if (!divider && start === null) start = i;
    if (divider && start !== null) {
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
  const key = file.slice(0, -extname(file).length);
  if (!PROMPTS.scenes[key]) {
    console.warn(`skipped ${file}: unknown scene`);
    continue;
  }
  const image = await clean(join(dir, file));
  const { width } = await image.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  // Small sources are enlarged a little (smooth Lanczos) so phones do not show blocky pixels.
  await image
    .resize({ width: Math.max(width, 768), withoutEnlargement: false, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(OUT, `${key}.jpg`));
  manifest[key] = [{ file: `images/${key}.jpg`, title: PROMPTS.scenes[key], author: 'תמונת AI', license: 'AI' }];
  installed += 1;
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
const missing = Object.keys(PROMPTS.scenes).filter((k) => !manifest[k]);
console.log(`installed ${installed} images${missing.length ? `; still missing: ${missing.join(', ')}` : ''}`);
