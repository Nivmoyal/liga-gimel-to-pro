// Live photos from Wikimedia Commons (all content there is freely licensed).
// The browser queries the Commons API (CORS enabled with origin=*), keeps only
// photos under CC0 / CC BY / CC BY-SA / public domain, and caches results.

import { PHOTO_QUERIES } from '../data/photoQueries';
import type { SportType } from '../types/game';

export interface RemotePhoto {
  url: string;
  title: string;
  author: string;
  license: string;
  page: string;
}

const CACHE_KEY = 'liga-gimel-to-pro:photos:v1';
const TTL = 1000 * 60 * 60 * 24 * 14;
const API = 'https://commons.wikimedia.org/w/api.php';
const BLOCKED = /(nude|naked|sex|logo|map|diagram|chart|drawing|painting|poster|stamp|coin|banknote|svg|icon|crest|kit|uniform design|screenshot)/i;
const LICENSE_OK = /^(cc0|cc[- ]by(-sa)?([- ][0-9.]+)?|public domain|pd)/i;

type CacheEntry = { at: number; photos: RemotePhoto[] };
let cache: Record<string, CacheEntry> | null = null;
const inflight = new Map<string, Promise<RemotePhoto[]>>();

function readCache(): Record<string, CacheEntry> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    cache = {};
  }
  return cache!;
}

function writeCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or unavailable: keep in memory */
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Resolves which query key to use for a scene. */
export function photoKey(scene: string, sport: SportType): string | null {
  if (PHOTO_QUERIES[`${scene}_${sport}`]) return `${scene}_${sport}`;
  if (PHOTO_QUERIES[scene]) return scene;
  return null;
}

export function cachedPhotos(key: string): RemotePhoto[] | null {
  const entry = readCache()[key];
  if (!entry || Date.now() - entry.at > TTL || entry.photos.length === 0) return null;
  return entry.photos;
}

interface CommonsPage {
  title: string;
  imageinfo?: Array<{
    thumburl?: string;
    url: string;
    width: number;
    height: number;
    mime: string;
    descriptionurl: string;
    extmetadata?: Record<string, { value: string }>;
  }>;
}

async function searchCommons(query: string, portrait: boolean): Promise<RemotePhoto[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '30',
    gsrsearch: `${query} filetype:bitmap`,
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: portrait ? '900' : '1100',
  });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(data.query?.pages ?? {});
  const out: RemotePhoto[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || info.mime !== 'image/jpeg' || info.width < 800) continue;
    const ratio = info.width / info.height;
    if (!portrait && (ratio < 1.2 || ratio > 2.4)) continue;
    if (BLOCKED.test(page.title)) continue;
    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    if (!LICENSE_OK.test(license)) continue;
    out.push({
      url: info.thumburl ?? info.url,
      title: stripHtml(meta.ObjectName?.value ?? page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')),
      author: stripHtml(meta.Artist?.value ?? '').slice(0, 80) || 'Wikimedia Commons',
      license,
      page: info.descriptionurl,
    });
  }
  return out;
}

/** Loads (and caches) photos for a key. Never throws: returns [] on failure. */
export function loadPhotos(key: string, portrait = false): Promise<RemotePhoto[]> {
  const hit = cachedPhotos(key);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const queries = PHOTO_QUERIES[key] ?? [];
  const job = (async () => {
    const all: RemotePhoto[] = [];
    for (const q of queries) {
      try {
        all.push(...(await searchCommons(q, portrait)));
      } catch {
        /* offline or blocked: fall back to backdrop */
      }
      if (all.length >= 24) break;
    }
    const unique = [...new Map(all.map((p) => [p.url, p])).values()].slice(0, 24);
    if (unique.length) {
      readCache()[key] = { at: Date.now(), photos: unique };
      writeCache();
    }
    inflight.delete(key);
    return unique;
  })();
  inflight.set(key, job);
  return job;
}

/** Warms the cache in the background (used on the title screen). */
export async function prefetchPhotos(keys: string[], portraitKeys: Set<string>) {
  for (const key of keys) {
    if (cachedPhotos(key)) continue;
    await loadPhotos(key, portraitKeys.has(key));
  }
}

export function allRemotePhotos(): Array<RemotePhoto & { key: string }> {
  return Object.entries(readCache()).flatMap(([key, entry]) => entry.photos.map((p) => ({ ...p, key })));
}
