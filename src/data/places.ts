// ===================================================================
// Israeli places: a small gazetteer so the player can type where they
// live (or want to live) and get the nearest starting clubs.
// Coordinates are approximate town centres.
// ===================================================================

import type { HomePlace, SportType } from '../types/game';
import { CLUB_POOLS } from './clubs';
import { clubCity } from '../services/rosterEngine';

interface Place {
  name: string;
  lat: number;
  lon: number;
  aliases?: string[];
}

export const PLACES: Place[] = [
  // Golan & Upper Galilee
  { name: 'מטולה', lat: 33.28, lon: 35.58 },
  { name: 'קריית שמונה', lat: 33.21, lon: 35.57 },
  { name: 'גליל עליון', lat: 33.17, lon: 35.61, aliases: ['כפר בלום', 'מועצה אזורית גליל עליון'] },
  { name: 'יסוד המעלה', lat: 33.06, lon: 35.6 },
  { name: 'מג׳דל שמס', lat: 33.27, lon: 35.77 },
  { name: 'מסעדה', lat: 33.23, lon: 35.76 },
  { name: 'צפון הגולן', lat: 33.13, lon: 35.77, aliases: ['רמת הגולן', 'הגולן', 'גולן'] },
  { name: 'קצרין', lat: 32.99, lon: 35.69 },
  { name: 'חספין', lat: 32.84, lon: 35.79 },
  { name: 'ראש פינה', lat: 32.97, lon: 35.54 },
  { name: 'חצור הגלילית', lat: 32.98, lon: 35.55, aliases: ['חצור'] },
  { name: 'צפת', lat: 32.96, lon: 35.5 },
  { name: 'טבריה', lat: 32.79, lon: 35.53 },
  { name: 'יבנאל', lat: 32.7, lon: 35.5 },
  { name: 'כפר תבור', lat: 32.69, lon: 35.42 },
  // Western Galilee & Haifa bay
  { name: 'שלומי', lat: 33.08, lon: 35.15 },
  { name: 'נהריה', lat: 33.01, lon: 35.1 },
  { name: 'מעלות-תרשיחא', lat: 33.02, lon: 35.27, aliases: ['מעלות', 'תרשיחא'] },
  { name: 'כפר ורדים', lat: 32.99, lon: 35.27 },
  { name: 'עכו', lat: 32.93, lon: 35.08 },
  { name: 'כרמיאל', lat: 32.92, lon: 35.3 },
  { name: 'מגאר', lat: 32.89, lon: 35.41 },
  { name: 'סכנין', lat: 32.86, lon: 35.3 },
  { name: 'עראבה', lat: 32.85, lon: 35.34 },
  { name: 'טמרה', lat: 32.85, lon: 35.2 },
  { name: 'שפרעם', lat: 32.81, lon: 35.17 },
  { name: 'קריית ים', lat: 32.85, lon: 35.07 },
  { name: 'קריית מוצקין', lat: 32.84, lon: 35.08 },
  { name: 'קריית ביאליק', lat: 32.83, lon: 35.09, aliases: ['צור שלום'] },
  { name: 'קריית אתא', lat: 32.81, lon: 35.11 },
  { name: 'חיפה', lat: 32.79, lon: 34.99 },
  { name: 'נשר', lat: 32.77, lon: 35.04 },
  { name: 'טירת כרמל', lat: 32.76, lon: 34.97 },
  { name: 'עתלית', lat: 32.69, lon: 34.94 },
  // Lower Galilee & valleys
  { name: 'ביר אל מכסור', lat: 32.77, lon: 35.22 },
  { name: 'זרזיר', lat: 32.73, lon: 35.21 },
  { name: 'כפר כנא', lat: 32.75, lon: 35.34 },
  { name: 'נצרת', lat: 32.7, lon: 35.3 },
  { name: 'נוף הגליל', lat: 32.71, lon: 35.33, aliases: ['נצרת עילית'] },
  { name: 'ריינה', lat: 32.72, lon: 35.31 },
  { name: 'עין מאהל', lat: 32.72, lon: 35.35 },
  { name: 'קריית טבעון', lat: 32.72, lon: 35.13, aliases: ['טבעון'] },
  { name: 'יקנעם', lat: 32.66, lon: 35.11, aliases: ['יוקנעם', 'יקנעם עילית'] },
  { name: 'מגדל העמק', lat: 32.68, lon: 35.24 },
  { name: 'עמק יזרעאל', lat: 32.64, lon: 35.25, aliases: ['העמק'] },
  { name: 'עפולה', lat: 32.61, lon: 35.29 },
  { name: 'בית שאן', lat: 32.5, lon: 35.5 },
  // Coast & Wadi Ara
  { name: 'זכרון יעקב', lat: 32.57, lon: 34.95 },
  { name: 'בנימינה', lat: 32.52, lon: 34.95 },
  { name: 'גבעת עדה', lat: 32.52, lon: 35.0 },
  { name: 'אור עקיבא', lat: 32.51, lon: 34.92 },
  { name: 'קיסריה', lat: 32.5, lon: 34.9 },
  { name: 'פרדס חנה-כרכור', lat: 32.47, lon: 34.97, aliases: ['פרדס חנה', 'כרכור'] },
  { name: 'חריש', lat: 32.46, lon: 35.04 },
  { name: 'חדרה', lat: 32.44, lon: 34.92 },
  { name: 'אום אל פחם', lat: 32.52, lon: 35.15 },
  { name: 'ערערה', lat: 32.5, lon: 35.1 },
  // Sharon
  { name: 'עמק חפר', lat: 32.36, lon: 34.91 },
  { name: 'נתניה', lat: 32.33, lon: 34.86 },
  { name: 'כפר יונה', lat: 32.32, lon: 34.94 },
  { name: 'קלנסווה', lat: 32.29, lon: 34.98 },
  { name: 'קדימה-צורן', lat: 32.28, lon: 34.92, aliases: ['קדימה', 'צורן'] },
  { name: 'טייבה', lat: 32.27, lon: 35.01 },
  { name: 'אבן יהודה', lat: 32.27, lon: 34.89 },
  { name: 'תל מונד', lat: 32.25, lon: 34.92 },
  { name: 'טירה', lat: 32.23, lon: 34.95 },
  { name: 'כפר סבא', lat: 32.18, lon: 34.91 },
  { name: 'רעננה', lat: 32.18, lon: 34.87 },
  { name: 'הוד השרון', lat: 32.15, lon: 34.89 },
  { name: 'הרצליה', lat: 32.16, lon: 34.84 },
  { name: 'רמת השרון', lat: 32.15, lon: 34.84 },
  { name: 'כפר קאסם', lat: 32.11, lon: 34.98 },
  { name: 'ראש העין', lat: 32.1, lon: 34.96 },
  // Samaria
  { name: 'קרני שומרון', lat: 32.17, lon: 35.1, aliases: ['שומרון'] },
  { name: 'אריאל', lat: 32.1, lon: 35.17 },
  // Gush Dan
  { name: 'פתח תקווה', lat: 32.09, lon: 34.89, aliases: ['פתח תקוה', 'פת'] },
  { name: 'בני ברק', lat: 32.08, lon: 34.83 },
  { name: 'גבעת שמואל', lat: 32.08, lon: 34.85 },
  { name: 'רמת גן', lat: 32.07, lon: 34.82, aliases: ['רמת חן'] },
  { name: 'גבעתיים', lat: 32.07, lon: 34.81 },
  { name: 'תל אביב', lat: 32.08, lon: 34.78, aliases: ['תל אביב יפו', 'תא', 'כפר שלם'] },
  { name: 'יפו', lat: 32.05, lon: 34.75 },
  { name: 'קריית אונו', lat: 32.06, lon: 34.86 },
  { name: 'אור יהודה', lat: 32.03, lon: 34.85 },
  { name: 'יהוד', lat: 32.03, lon: 34.89, aliases: ['יהוד מונוסון'] },
  { name: 'אלעד', lat: 32.05, lon: 34.95 },
  { name: 'שהם', lat: 31.99, lon: 34.95 },
  { name: 'בת ים', lat: 32.02, lon: 34.75 },
  { name: 'חולון', lat: 32.01, lon: 34.78 },
  { name: 'ראשון לציון', lat: 31.97, lon: 34.8, aliases: ['ראשלצ', 'ראשון'] },
  { name: 'באר יעקב', lat: 31.94, lon: 34.84 },
  { name: 'נס ציונה', lat: 31.93, lon: 34.8 },
  { name: 'לוד', lat: 31.95, lon: 34.89 },
  { name: 'רמלה', lat: 31.93, lon: 34.87 },
  { name: 'מודיעין', lat: 31.9, lon: 35.01, aliases: ['מודיעין מכבים רעות'] },
  { name: 'רחובות', lat: 31.89, lon: 34.81, aliases: ['שעריים', 'מרמורק'] },
  { name: 'מזכרת בתיה', lat: 31.85, lon: 34.84 },
  { name: 'קריית עקרון', lat: 31.86, lon: 34.82 },
  { name: 'יבנה', lat: 31.88, lon: 34.74 },
  { name: 'גדרה', lat: 31.81, lon: 34.78 },
  { name: 'גן יבנה', lat: 31.79, lon: 34.71 },
  // Jerusalem area
  { name: 'גבעת זאב', lat: 31.86, lon: 35.17 },
  { name: 'מבשרת ציון', lat: 31.8, lon: 35.15, aliases: ['מבשרת'] },
  { name: 'ירושלים', lat: 31.78, lon: 35.22 },
  { name: 'מעלה אדומים', lat: 31.78, lon: 35.3 },
  { name: 'בית שמש', lat: 31.75, lon: 34.99 },
  { name: 'ביתר עילית', lat: 31.7, lon: 35.12 },
  { name: 'אפרת', lat: 31.66, lon: 35.15 },
  { name: 'קריית ארבע', lat: 31.53, lon: 35.12 },
  // South
  { name: 'אשדוד', lat: 31.8, lon: 34.65 },
  { name: 'קריית מלאכי', lat: 31.73, lon: 34.75 },
  { name: 'אשקלון', lat: 31.67, lon: 34.57 },
  { name: 'קריית גת', lat: 31.61, lon: 34.76 },
  { name: 'שדרות', lat: 31.52, lon: 34.6 },
  { name: 'נתיבות', lat: 31.42, lon: 34.59 },
  { name: 'רהט', lat: 31.39, lon: 34.75 },
  { name: 'להבים', lat: 31.37, lon: 34.81 },
  { name: 'אופקים', lat: 31.31, lon: 34.62 },
  { name: 'עומר', lat: 31.27, lon: 34.85 },
  { name: 'באר שבע', lat: 31.25, lon: 34.79, aliases: ['בש', 'בירת הנגב'] },
  { name: 'ערד', lat: 31.26, lon: 35.21 },
  { name: 'דימונה', lat: 31.07, lon: 35.03 },
  { name: 'ירוחם', lat: 30.99, lon: 34.93 },
  { name: 'מצפה רמון', lat: 30.61, lon: 34.8 },
  { name: 'אילת', lat: 29.56, lon: 34.95 },
];

// ------------------------------------------------------------------
// Text search
// ------------------------------------------------------------------

/** Folds spelling variants: geresh/quotes, hyphens, full/short spelling of קריה. */
export function normalizePlace(text: string): string {
  return text
    .replace(/["'״׳`]/g, '')
    .replace(/[-־–,.]/g, ' ')
    .replace(/(^|\s)קרית(?=\s|$)/g, '$1קריית')
    .replace(/\s+/g, ' ')
    .trim();
}

interface IndexedName {
  key: string;
  place: Place;
}

const INDEX: IndexedName[] = PLACES.flatMap((place) =>
  [place.name, ...(place.aliases ?? [])].map((n) => ({ key: normalizePlace(n), place })),
);

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function toHome(place: Place): HomePlace {
  return { name: place.name, lat: place.lat, lon: place.lon };
}

/** Best matching places for free text: exact, prefix, contains, then near-misspellings. */
export function searchPlaces(query: string, limit = 6): HomePlace[] {
  const q = normalizePlace(query);
  if (q.length < 2) return [];
  const scored = new Map<Place, number>();
  for (const { key, place } of INDEX) {
    let score: number | null = null;
    if (key === q) score = 0;
    else if (key.startsWith(q)) score = 1;
    else if (key.split(' ').some((w) => w.startsWith(q))) score = 2;
    else if (key.includes(q)) score = 3;
    else if (q.length >= 3) {
      const dist = Math.min(levenshtein(q, key), levenshtein(q, key.slice(0, q.length)) + 1);
      if (dist <= (q.length >= 6 ? 2 : 1)) score = 4 + dist;
    }
    if (score !== null && (!scored.has(place) || score < scored.get(place)!)) scored.set(place, score);
  }
  // Spelling-mistake guesses only when nothing actually matches the text
  const entries = [...scored.entries()];
  const direct = entries.filter(([, score]) => score <= 3);
  return (direct.length > 0 ? direct : entries)
    .sort((a, b) => a[1] - b[1] || a[0].name.length - b[0].name.length)
    .slice(0, limit)
    .map(([place]) => toHome(place));
}

export function findPlace(name: string): HomePlace | null {
  const q = normalizePlace(name);
  const hit = INDEX.find((entry) => entry.key === q);
  return hit ? toHome(hit.place) : null;
}

// ------------------------------------------------------------------
// Distances & clubs
// ------------------------------------------------------------------

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Club names whose town is not literally in the name. */
const CLUB_TOWN: Record<string, string> = {
  'הפועל גליל עליון/קצרין': 'קצרין',
  'הפועל באר שבע/דימונה': 'באר שבע',
  'הפועל רמת גן גבעתיים': 'רמת גן',
  'השקמה רמת חן': 'רמת גן',
  'הפועל צור שלום': 'קריית ביאליק',
  'בני יהודה': 'תל אביב',
  'הפועל כפר שלם': 'תל אביב',
  'מכבי שעריים': 'רחובות',
  'הפועל מרמורק': 'רחובות',
  'מכבי אחי נצרת': 'נצרת',
  'מכבי בני ריינה': 'ריינה',
  'אליצור שומרון': 'קרני שומרון',
  'הפועל העמק': 'עמק יזרעאל',
};

/** Home town of a club, when it is in the gazetteer. */
export function clubPlace(club: string): HomePlace | null {
  const town = CLUB_TOWN[club] ?? clubCity(club);
  return findPlace(town) ?? findPlace(town.split(' ').slice(-1)[0]);
}

export function clubDistance(home: HomePlace | null | undefined, club: string): number | null {
  const place = clubPlace(club);
  if (!home || !place) return null;
  return Math.round(distanceKm(home, place));
}

export interface StartingClub {
  name: string;
  division: number;
  km: number;
}

/** Clubs a newcomer can join: the bottom tier (and the one above it in basketball). */
export function startingClubs(sport: SportType): Array<{ name: string; division: number }> {
  const divisions = sport === 'football' ? [0] : [0, 1];
  return divisions.flatMap((division) => CLUB_POOLS[sport][division].map((name) => ({ name, division })));
}

/** Starting clubs sorted by distance from home (nearest first). */
export function nearestStartingClubs(sport: SportType, home: HomePlace): StartingClub[] {
  return startingClubs(sport)
    .map((c) => ({ ...c, km: clubDistance(home, c.name) ?? 999 }))
    .sort((a, b) => a.km - b.km || a.division - b.division);
}

/**
 * Weekly cost of the drive to training and back. Full professionals get housing
 * near the club, so it only matters while still semi-pro or amateur.
 */
export function commuteCost(km: number | null): { energy: number; budget: number; label: string } {
  if (km === null || km <= 15) return { energy: 0, budget: 0, label: 'קרוב לבית' };
  if (km <= 40) return { energy: 2, budget: 60, label: 'נסיעה קצרה' };
  if (km <= 80) return { energy: 4, budget: 120, label: 'נסיעה ארוכה' };
  return { energy: 6, budget: 200, label: 'נסיעה מתישה' };
}
