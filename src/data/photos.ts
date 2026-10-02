// Real photos for scenes. Files live in public/photos and are listed in
// photoManifest.json (written by scripts/photos.mjs) together with credits.

import type { SportType } from '../types/game';
import manifest from './photoManifest.json';
import { hashString } from './clubIdentity';

export interface PhotoInfo {
  file: string;
  title?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  source?: string;
}

const PHOTOS = manifest as Record<string, PhotoInfo[]>;

/**
 * Finds a photo for a scene. Sport-specific keys win ("stadium_basketball"),
 * then the generic key. `seed` picks between several photos deterministically.
 */
export function photoFor(scene: string, sport: SportType, seed = ''): PhotoInfo | null {
  const list = PHOTOS[`${scene}_${sport}`] ?? PHOTOS[scene];
  if (!list || list.length === 0) return null;
  return list[hashString(seed || scene) % list.length];
}

export function allPhotoCredits(): Array<PhotoInfo & { key: string }> {
  return Object.entries(PHOTOS).flatMap(([key, list]) => list.map((p) => ({ ...p, key })));
}

/** Backdrop family used when a scene has no photo yet. */
export type Backdrop = 'pitch' | 'court' | 'indoor' | 'night' | 'street' | 'national';

export function backdropFor(scene: string, sport: SportType): Backdrop {
  if (scene.startsWith('fb_')) return 'pitch';
  if (scene.startsWith('bb_')) return 'court';
  if (['field', 'fans'].includes(scene)) return sport === 'football' ? 'pitch' : 'court';
  if (['stadium', 'trophy', 'title', 'intro_1', 'intro_2', 'intro_3'].includes(scene)) return 'night';
  if (['street', 'work'].includes(scene)) return 'street';
  if (scene === 'national') return 'national';
  return 'indoor';
}
