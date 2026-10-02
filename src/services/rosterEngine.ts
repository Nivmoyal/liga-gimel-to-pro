// Deterministic squads and match-day conditions. Every club gets the same
// named roster every time (seeded by its name), so teammates and rivals
// become familiar faces over a career.

import type { SportType } from '../types/game';
import { hashString } from '../data/clubIdentity';

export interface RosterPlayer {
  name: string;
  pos: string;
  number: number;
  foreign: boolean;
}

/** Small seeded PRNG (mulberry32). */
export function seeded(seed: string | number) {
  let a = typeof seed === 'number' ? seed : hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: () => number, list: T[]) => list[Math.floor(rng() * list.length)];

const FIRST = [
  'אבי', 'יוסי', 'דניאל', 'עומר', 'איתי', 'נועם', 'מתן', 'אליה', 'רועי', 'עידו', 'אור', 'שגיא', 'טל', 'גיא', 'בן', 'ליאור',
  'דור', 'אלון', 'יונתן', 'אריאל', 'ניר', 'קובי', 'אופיר', 'רז', 'תום', 'ירדן', 'אוראל', 'שי', 'אסף', 'עדי', 'אלירן', 'מור',
  'מוחמד', 'אחמד', 'עלי', 'מאהר', 'ג׳ורג׳', 'סאמר', 'ויסאם', 'יוסף', 'חוסאם', 'מונס', 'דיא', 'אנאס',
  'אדמסו', 'ברהנו', 'טספאי', 'דימה', 'סשה', 'איגור', 'אלכס', 'ולדי', 'מקסים', 'שלומי', 'דודו', 'ששון', 'משה', 'אליאב',
];
const LAST = [
  'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אזולאי', 'דהן', 'אברהם', 'פרידמן', 'שפירא', 'חדד', 'עמר', 'אוחיון', 'גבאי',
  'בן חיים', 'אלמוג', 'שטרן', 'נחמיאס', 'שלום', 'מלכה', 'ברק', 'גולן', 'אבוטבול', 'טביב', 'חזן', 'קרמר', 'וולך',
  'חורי', 'עבאס', 'ח׳טיב', 'סלאמה', 'דאהר', 'נסאר', 'אבו סאלח', 'ג׳אבר', 'טסמה', 'וורקו', 'קוזלוב', 'איבנוב', 'גרשון',
  'אלמליח', 'סעדה', 'בוזגלו', 'יעקב', 'אדרי', 'בירנבאום', 'קנדיל', 'זריהן', 'רביבו', 'אטיאס', 'בכר', 'נגר',
];
const FOREIGN_FB_FIRST = ['לואיס', 'מרקו', 'ניקולה', 'פדרו', 'אנדריי', 'דניס', 'ז׳ואאו', 'מתיאס', 'אוסמן', 'קווסי'];
const FOREIGN_FB_LAST = ['סילבה', 'פרייטס', 'יובאנוביץ׳', 'מנדס', 'פטרוב', 'דיאלו', 'קואמה', 'רודריגס', 'מרטינס', 'אוביה'];
const FOREIGN_BB_FIRST = ['ג׳יילן', 'טרוויס', 'דמרקוס', 'קווין', 'ג׳ורדן', 'מרקוס', 'אנתוני', 'ג׳מאל', 'טיילר', 'דרייק'];
const FOREIGN_BB_LAST = ['ג׳ונסון', 'וויליאמס', 'בראון', 'דייוויס', 'האריס', 'תומפסון', 'ג׳קסון', 'ווקר', 'קרטר', 'מילר'];

const FB_SLOTS = ['שוער', 'שוער', 'בלם', 'בלם', 'בלם', 'מגן', 'מגן', 'מגן', 'קשר', 'קשר', 'קשר', 'קשר', 'קשר', 'קיצוני', 'קיצוני', 'חלוץ', 'חלוץ', 'חלוץ'];
const BB_SLOTS = ['רכז', 'רכז', 'קלעי', 'קלעי', 'סמול פורוורד', 'סמול פורוורד', 'פאוור פורוורד', 'פאוור פורוורד', 'סנטר', 'סנטר', 'קלעי', 'פורוורד'];

const rosterCache = new Map<string, RosterPlayer[]>();

/** A club's squad. `foreignCount` grows with the division. */
export function rosterFor(club: string, sport: SportType, division: number, international = false): RosterPlayer[] {
  const key = `${club}|${sport}|${division}|${international}`;
  const hit = rosterCache.get(key);
  if (hit) return hit;
  const rng = seeded(`${club}|${sport}`);
  const slots = sport === 'football' ? FB_SLOTS : BB_SLOTS;
  const foreignCount = international ? 0 : sport === 'basketball' ? (division >= 2 ? 4 : division >= 1 ? 1 : 0) : division >= 3 ? 4 : division >= 2 ? 1 : 0;
  const used = new Set<string>();
  const numbers = new Set<number>();
  const roster = slots.map((pos, i) => {
    const foreign = international || i >= slots.length - foreignCount;
    let name = '';
    do {
      name = foreign
        ? sport === 'football'
          ? `${pick(rng, FOREIGN_FB_FIRST)} ${pick(rng, FOREIGN_FB_LAST)}`
          : `${pick(rng, FOREIGN_BB_FIRST)} ${pick(rng, FOREIGN_BB_LAST)}`
        : `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    } while (used.has(name));
    used.add(name);
    let number = pos === 'שוער' ? (numbers.has(1) ? 22 : 1) : 2 + Math.floor(rng() * (sport === 'football' ? 30 : 40));
    while (numbers.has(number)) number = (number % 98) + 1;
    numbers.add(number);
    return { name, pos, number, foreign };
  });
  rosterCache.set(key, roster);
  return roster;
}

export function shortName(full: string): string {
  const parts = full.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : full;
}

// ------------------------------------------------------------------
// Match-day conditions
// ------------------------------------------------------------------

export type WeatherKind = 'clear' | 'hot' | 'rain' | 'wind' | 'cold' | 'hall_cold' | 'hall_loud' | 'hall_normal';

export interface MatchInfo {
  venue: string;
  city: string;
  attendance: number;
  weather: WeatherKind;
  weatherLabel: string;
  temperature: number;
  referee: string;
  kickoff: string;
  derby: boolean;
}

const PREFIXES = ['הפועל', 'מכבי', 'בית״ר', 'בני', 'עירוני', 'אליצור', 'מ.ס.', 'השקמה', 'צעירי', 'אס״א', 'מ.ס'];

export function clubCity(club: string): string {
  let words = club.replace(/\//g, ' ').split(/\s+/).filter((w) => /[֐-׿]/.test(w));
  while (words.length > 1 && PREFIXES.includes(words[0])) words = words.slice(1);
  return words.join(' ');
}

const FOOTBALL_STADIUMS: Record<string, string> = {
  חיפה: 'אצטדיון סמי עופר',
  ירושלים: 'אצטדיון טדי',
  'תל אביב': 'אצטדיון בלומפילד',
  יהודה: 'אצטדיון בלומפילד',
  'באר שבע': 'אצטדיון טרנר',
  נתניה: 'אצטדיון נתניה',
  'פתח תקווה': 'אצטדיון המושבה',
  אשדוד: 'אצטדיון הא״י',
  סכנין: 'אצטדיון דוחא',
  'קריית שמונה': 'האצטדיון העירוני קריית שמונה',
};
const ARENAS: Record<string, string> = {
  'תל אביב': 'היכל מנורה מבטחים',
  ירושלים: 'ארנה ירושלים',
  חולון: 'היכל טוטו חולון',
  'ראשון לציון': 'היכל בית מכבי ראשון',
  הרצליה: 'היכל הספורט הרצליה',
  חיפה: 'היכל רוממה',
};

const FOOTBALL_CROWD = [
  [60, 600],
  [150, 1500],
  [400, 3500],
  [1200, 9000],
  [5000, 30000],
];
const BASKETBALL_CROWD = [
  [40, 350],
  [150, 1000],
  [700, 3200],
  [2500, 10500],
];

/** Deterministic conditions for a fixture (same values in the CTA and the match). */
export function matchInfo(sport: SportType, division: number, home: string, away: string, season: number, matchday: number): MatchInfo {
  const rng = seeded(`${home}|${away}|${season}|${matchday}`);
  const city = clubCity(home);
  const derby = city === clubCity(away);
  const top = division >= (sport === 'football' ? 3 : 2);
  const venue =
    sport === 'football'
      ? (top && FOOTBALL_STADIUMS[city]) || (division >= 2 ? `האצטדיון העירוני ${city}` : `המגרש העירוני ${city}`)
      : (top && ARENAS[city]) || (division >= 1 ? `היכל הספורט ${city}` : `אולם הספורט ${city}`);
  const [lo, hi] = (sport === 'football' ? FOOTBALL_CROWD : BASKETBALL_CROWD)[division] ?? [100, 1000];
  let attendance = Math.round(lo + rng() * (hi - lo));
  if (derby) attendance = Math.round(attendance * 1.5);
  attendance = Math.round(attendance / 10) * 10;

  // Season runs autumn (matchdays 1-4) through winter (5-9) into spring (10-12)
  let weather: WeatherKind;
  let temperature: number;
  if (sport === 'football') {
    const r = rng();
    if (matchday < 4) {
      weather = r < 0.55 ? 'hot' : r < 0.85 ? 'clear' : 'wind';
      temperature = 27 + Math.round(rng() * 8);
    } else if (matchday < 9) {
      weather = r < 0.4 ? 'rain' : r < 0.6 ? 'wind' : r < 0.8 ? 'cold' : 'clear';
      temperature = 8 + Math.round(rng() * 9);
    } else {
      weather = r < 0.6 ? 'clear' : r < 0.8 ? 'wind' : 'hot';
      temperature = 18 + Math.round(rng() * 9);
    }
  } else {
    const r = rng();
    weather = division === 0 && r < 0.45 ? 'hall_cold' : attendance > (hi + lo) / 2 ? 'hall_loud' : 'hall_normal';
    temperature = weather === 'hall_cold' ? 12 + Math.round(rng() * 4) : 21 + Math.round(rng() * 3);
  }
  const weatherLabel = {
    clear: `נעים, ${temperature} מעלות`,
    hot: `שרב, ${temperature} מעלות`,
    rain: `גשם, ${temperature} מעלות`,
    wind: `רוח חזקה, ${temperature} מעלות`,
    cold: `קר, ${temperature} מעלות`,
    hall_cold: `אולם קר, ${temperature} מעלות`,
    hall_loud: 'אולם מלא ורועש',
    hall_normal: 'אולם',
  }[weather];

  const refRng = seeded(`ref|${season}|${matchday}|${home}`);
  const referee = `${pick(refRng, FIRST)} ${pick(refRng, LAST)}`;
  const kickoff =
    sport === 'football'
      ? `${pick(rng, division <= 1 ? ['שישי', 'שבת', 'שבת'] : ['שבת', 'שבת', 'ראשון', 'שני'])} ${pick(rng, matchday >= 4 && matchday < 9 ? ['14:00', '15:00', '16:00', '19:00'] : ['17:00', '18:30', '19:30', '20:30'])}`
      : `${pick(rng, ['ראשון', 'שני', 'שלישי', 'רביעי'])} ${pick(rng, ['19:00', '19:30', '20:00', '20:30'])}`;

  return { venue, city, attendance, weather, weatherLabel, temperature, referee, kickoff, derby };
}
