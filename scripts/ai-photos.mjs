// Generates AI images for every scene in scripts/ai-photo-prompts.json and
// installs them in public/photos + src/data/photoManifest.json, so the game
// shows them instead of fetching real photos.
//
//   OPENAI_API_KEY=... node scripts/ai-photos.mjs            all missing scenes
//   OPENAI_API_KEY=... node scripts/ai-photos.mjs fb_penalty  only these keys
//   node scripts/ai-photos.mjs --list                         show prompts
//   options: --count 2 (images per scene), --force (regenerate existing)

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'photos');
const MANIFEST = join(ROOT, 'src', 'data', 'photoManifest.json');
const PROMPTS = JSON.parse(await readFile(join(ROOT, 'scripts', 'ai-photo-prompts.json'), 'utf8'));
const MODEL = process.env.AI_IMAGE_MODEL ?? 'gpt-image-1';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const count = Number(args[args.indexOf('--count') + 1]) || 1;
const keys = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--count');

const portrait = (key) => PROMPTS.portrait.includes(key);
const promptFor = (key) => `${PROMPTS.scenes[key]} ${PROMPTS.style}`;

async function loadManifest() {
  return existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : {};
}

async function generate(key) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: promptFor(key), size: portrait(key) ? '1024x1536' : '1536x1024', n: 1 }),
  });
  if (!res.ok) throw new Error(`${key}: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Buffer.from(json.data[0].b64_json, 'base64');
}

async function install(manifest, key, buffer) {
  const n = (manifest[key] ?? []).length;
  const file = `ai/${key}-${n}.webp`;
  await mkdir(join(OUT, 'ai'), { recursive: true });
  await sharp(buffer)
    .resize(portrait(key) ? { width: 900, height: 1600, fit: 'cover' } : { width: 1200, height: 675, fit: 'cover' })
    .webp({ quality: 72 })
    .toFile(join(OUT, file));
  manifest[key] = [...(manifest[key] ?? []), { file, title: PROMPTS.scenes[key], author: 'תמונת AI', license: 'AI', source: MODEL }];
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`installed ${file}`);
}

if (flag('--list')) {
  for (const key of Object.keys(PROMPTS.scenes)) console.log(`${key}${portrait(key) ? ' (portrait)' : ''}: ${PROMPTS.scenes[key]}`);
  process.exit(0);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY (the environment needs network access to api.openai.com).');
  process.exit(1);
}

const manifest = await loadManifest();
const todo = (keys.length ? keys : Object.keys(PROMPTS.scenes)).filter((key) => {
  if (!PROMPTS.scenes[key]) throw new Error(`unknown scene ${key}`);
  if (flag('--force')) {
    delete manifest[key];
    return true;
  }
  return !(manifest[key] ?? []).some((p) => p.file.startsWith('ai/'));
});
console.log(`${todo.length} scenes x ${count}`);
for (const key of todo) {
  for (let i = 0; i < count; i++) {
    try {
      await install(manifest, key, await generate(key));
    } catch (err) {
      console.error(String(err));
    }
  }
}
