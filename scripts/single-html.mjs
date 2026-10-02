// Packs the production build into one self-contained HTML file
// (dist/liga-gimel.html): CSS and JS inline, and every installed image from
// the photo manifest embedded as a compressed data URI, so the game works
// from a single file with no external requests except the web font.
//
//   npm run build && node scripts/single-html.mjs

import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const manifest = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'photoManifest.json'), 'utf8'));

const assets = await readdir(join(DIST, 'assets'));
const css = await readFile(join(DIST, 'assets', assets.find((f) => f.endsWith('.css'))), 'utf8');
let js = await readFile(join(DIST, 'assets', assets.find((f) => f.endsWith('.js'))), 'utf8');
if (js.toLowerCase().includes('</script')) throw new Error('bundle contains </script');

let embedded = 0;
let bytes = 0;
for (const list of Object.values(manifest)) {
  for (const { file } of list) {
    const path = join(ROOT, 'public', file);
    // The minifier may quote the path with ", ' or `.
    const quoted = new RegExp(`(["'\`])${file.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\1`, 'g');
    if (!existsSync(path) || !quoted.test(js)) continue;
    const meta = await sharp(path).metadata();
    const portrait = (meta.height ?? 0) > (meta.width ?? 0);
    const webp = await sharp(path).resize(portrait ? { width: 720, withoutEnlargement: true } : { width: 1024, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const uri = `data:image/webp;base64,${webp.toString('base64')}`;
    js = js.replace(quoted, (_m, q) => `${q}${uri}${q}`);
    embedded += 1;
    bytes += webp.length;
  }
}

const html = `<title>עולים ליגה</title>
<meta name="theme-color" content="#080c0a" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
<style>
:root { color-scheme: dark; background: #080c0a; }
html, body { background: #080c0a; color: #f2f5f3; }
${css}
</style>
<div id="root" dir="rtl" lang="he"></div>
<script type="module">
${js}
</script>
`;
await writeFile(join(DIST, 'liga-gimel.html'), html);
console.log(`dist/liga-gimel.html: ${(html.length / 1e6).toFixed(1)} MB, ${embedded} images (${(bytes / 1e6).toFixed(1)} MB)`);
