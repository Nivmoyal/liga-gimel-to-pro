// Visual identity per club: colors, crest pattern, abbreviation and shirt sponsor.
// Derived deterministically from the club name, with overrides for well-known clubs.

export interface ClubColors {
  primary: string;
  secondary: string;
  /** Text color that reads well on the primary color. */
  text: string;
}

export interface ClubIdentity {
  colors: ClubColors;
  abbr: string;
  pattern: 'halves' | 'stripe' | 'band' | 'solid';
  shape: 'shield' | 'round' | 'crest';
  shirtSponsor: string;
}

const RED = '#d7263d';
const YELLOW = '#f6c21c';
const BLUE = '#1f5fd1';
const GREEN = '#169b62';
const BLACK = '#1d1f24';
const WHITE = '#ffffff';
const ORANGE = '#f28c28';
const PURPLE = '#6d3fc0';
const SKY = '#2fa8e0';
const MAROON = '#8c1d3c';

const OVERRIDES: Record<string, [string, string]> = {
  'מכבי חיפה': [GREEN, WHITE],
  'מכבי תל אביב': [YELLOW, BLUE],
  'בית״ר ירושלים': [YELLOW, BLACK],
  'בני יהודה': [ORANGE, BLACK],
  'מכבי נתניה': [YELLOW, BLACK],
  'מ.ס. אשדוד': [YELLOW, RED],
  'בני סכנין': [RED, WHITE],
  'מכבי פתח תקווה': [BLUE, WHITE],
  'הפועל חולון': [YELLOW, RED],
  'בני הרצליה': [ORANGE, BLUE],
  'עירוני קריית שמונה': [BLUE, WHITE],
  'עירוני נס ציונה': [WHITE, BLUE],
  'אליצור נתניה': [GREEN, YELLOW],
};

const PREFIX_COLORS: Array<[string, [string, string]]> = [
  ['הפועל', [RED, WHITE]],
  ['מכבי', [YELLOW, BLUE]],
  ['בית״ר', [YELLOW, BLACK]],
  ['אליצור', [BLUE, WHITE]],
  ['השקמה', [GREEN, WHITE]],
  ['צעירי', [GREEN, YELLOW]],
  ['אס״א', [SKY, WHITE]],
];

const FALLBACK: Array<[string, string]> = [
  [PURPLE, WHITE],
  [ORANGE, BLACK],
  [SKY, WHITE],
  [MAROON, YELLOW],
  [GREEN, WHITE],
  [BLACK, YELLOW],
];

const SHIRT_SPONSORS = [
  'חומוס אבו גול',
  'מאפיית הכיכר',
  'חשמל ישיר',
  'גלידה של פעם',
  'מוסך הדרום',
  'ירקות השדה',
  'פלאפל הקפטן',
  'שיפוצי רימון',
  'טכנו-בית',
  'קפה פינה',
  'מסעדת הנמל',
  'הובלות הגליל',
];

const PRO_SHIRT_SPONSORS = ['גל-נט סלולר', 'בנק הגפן', 'אוטו-סטאר', 'ספרינט אנרג׳י', 'ביטוח מגן', 'אור תקשורת'];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#13233a' : '#ffffff';
}

function colorsFor(name: string): [string, string] {
  if (OVERRIDES[name]) return OVERRIDES[name];
  const prefix = PREFIX_COLORS.find(([p]) => name.startsWith(p));
  if (prefix) return prefix[1];
  return FALLBACK[hashString(name) % FALLBACK.length];
}

/** Hebrew-style club abbreviation, e.g. "הפועל קצרין" -> "ה״ק". */
export function clubAbbr(name: string): string {
  const words = name
    .replace(/\//g, ' ')
    .split(/\s+/)
    .filter((w) => /[֐-׿]/.test(w));
  if (words.length === 0) return name.slice(0, 2);
  const first = words[0].replace(/[.״׳]/g, '')[0];
  if (words.length === 1) return words[0].slice(0, 2);
  const last = words[words.length - 1].replace(/[.״׳]/g, '')[0];
  return `${first}״${last}`;
}

const cache = new Map<string, ClubIdentity>();

export function clubIdentity(name: string, pro = false): ClubIdentity {
  const key = `${name}|${pro}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [primary, secondary] = colorsFor(name);
  const h = hashString(name);
  const sponsors = pro ? PRO_SHIRT_SPONSORS : SHIRT_SPONSORS;
  const identity: ClubIdentity = {
    colors: { primary, secondary, text: readableOn(primary) },
    abbr: clubAbbr(name),
    pattern: (['halves', 'stripe', 'band', 'solid'] as const)[h % 4],
    shape: (['shield', 'round', 'crest'] as const)[(h >>> 3) % 3],
    shirtSponsor: sponsors[(h >>> 5) % sponsors.length],
  };
  cache.set(key, identity);
  return identity;
}

/** Colors of the Israeli national teams. */
export const ISRAEL_COLORS: ClubColors = { primary: '#ffffff', secondary: '#0038b8', text: '#0038b8' };
