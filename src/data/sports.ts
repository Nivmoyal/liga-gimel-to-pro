import type { AttrKey, BasketballPosition, FootballPosition, Position, SportType } from '../types/game';

export const SPORT_LABEL: Record<SportType, string> = {
  football: 'כדורגל',
  basketball: 'כדורסל',
};

/** The playing surface used in texts and the main CTA. */
export const SURFACE_LABEL: Record<SportType, string> = {
  football: 'כר הדשא',
  basketball: 'הפרקט',
};

export const CTA_LABEL: Record<SportType, string> = {
  football: 'עולים לכר הדשא',
  basketball: 'עולים לפרקט',
};

export const FOOTBALL_POSITIONS: { id: FootballPosition; label: string; short: string }[] = [
  { id: 'GK', label: 'שוער (GK)', short: 'שוער' },
  { id: 'LB', label: 'מגן שמאלי (LB)', short: 'מגן שמאלי' },
  { id: 'CB', label: 'בלם (CB)', short: 'בלם' },
  { id: 'RB', label: 'מגן ימני (RB)', short: 'מגן ימני' },
  { id: 'LWB', label: 'מגן כנף שמאלי (LWB)', short: 'מגן כנף שמאלי' },
  { id: 'RWB', label: 'מגן כנף ימני (RWB)', short: 'מגן כנף ימני' },
  { id: 'CDM', label: 'קשר אחורי (CDM)', short: 'קשר אחורי' },
  { id: 'CM', label: 'קשר מרכזי (CM)', short: 'קשר מרכזי' },
  { id: 'CAM', label: 'קשר התקפי (CAM)', short: 'קשר התקפי' },
  { id: 'LW', label: 'כנף שמאל (LW)', short: 'כנף שמאל' },
  { id: 'RW', label: 'כנף ימין (RW)', short: 'כנף ימין' },
  { id: 'ST', label: 'חלוץ (ST)', short: 'חלוץ' },
];

export const BASKETBALL_POSITIONS: { id: BasketballPosition; label: string; short: string }[] = [
  { id: 'PG', label: 'רכז (PG)', short: 'רכז' },
  { id: 'SG', label: 'קלעי (SG)', short: 'קלעי' },
  { id: 'SF', label: 'סמול פורוורד (SF)', short: 'סמול פורוורד' },
  { id: 'PF', label: 'פאוור פורוורד (PF)', short: 'פאוור פורוורד' },
  { id: 'C', label: 'סנטר (C)', short: 'סנטר' },
];

export function positionsFor(sport: SportType) {
  return sport === 'football' ? FOOTBALL_POSITIONS : BASKETBALL_POSITIONS;
}

export function positionLabel(position: Position): string {
  const all = [...FOOTBALL_POSITIONS, ...BASKETBALL_POSITIONS];
  return all.find((p) => p.id === position)?.label ?? position;
}

export const DIVISIONS: Record<SportType, string[]> = {
  football: ['ליגה ג׳', 'ליגה ב׳', 'ליגה א׳', 'ליגה לאומית', 'ליגת העל'],
  basketball: ['ליגה ב׳', 'ליגה א׳', 'ליגה לאומית', 'ליגת העל'],
};

/** First division index that counts as a full professional league (לאומית / ליגת העל). */
export const PRO_DIVISION_FROM: Record<SportType, number> = {
  football: 3,
  basketball: 2,
};

export function divisionName(sport: SportType, division: number): string {
  return DIVISIONS[sport][division] ?? DIVISIONS[sport][0];
}

export function topDivision(sport: SportType): number {
  return DIVISIONS[sport].length - 1;
}

export function isProDivision(sport: SportType, division: number): boolean {
  return division >= PRO_DIVISION_FROM[sport];
}

/** Average team strength per division. */
export const DIVISION_STRENGTH: Record<SportType, number[]> = {
  football: [38, 47, 56, 65, 74],
  basketball: [40, 50, 61, 72],
};

/** Typical weekly salary (in NIS) per division. */
export const DIVISION_SALARY: Record<SportType, number[]> = {
  football: [250, 600, 1400, 3800, 8000],
  basketball: [300, 900, 3500, 8500],
};

export const ATTR_KEYS: AttrKey[] = ['attack', 'technique', 'playmaking', 'defense', 'physical', 'mental'];

export const ATTR_LABEL: Record<SportType, Record<AttrKey, string>> = {
  football: {
    attack: 'גימור',
    technique: 'טכניקה',
    playmaking: 'מסירה',
    defense: 'הגנה',
    physical: 'כושר גופני',
    mental: 'מנטליות',
  },
  basketball: {
    attack: 'קליעה',
    technique: 'כדרור',
    playmaking: 'ראיית משחק',
    defense: 'הגנה',
    physical: 'אתלטיות',
    mental: 'מנטליות',
  },
};

/** Goalkeepers use the same six attributes under keeper names. */
const GK_ATTR_LABEL: Record<AttrKey, string> = {
  attack: 'בעיטות',
  technique: 'תפיסה',
  playmaking: 'משחק רגל',
  defense: 'הצלות',
  physical: 'זריזות',
  mental: 'ריכוז',
};

/** Attribute names for a player (keepers get their own). */
export function attrLabels(sport: SportType, position?: Position): Record<AttrKey, string> {
  return sport === 'football' && position === 'GK' ? GK_ATTR_LABEL : ATTR_LABEL[sport];
}

/** OVR weights per position. Each row sums to 1. */
export const OVR_WEIGHTS: Record<Position, Record<AttrKey, number>> = {
  GK: { attack: 0, technique: 0.15, playmaking: 0.1, defense: 0.4, physical: 0.17, mental: 0.18 },
  LB: { attack: 0.05, technique: 0.15, playmaking: 0.15, defense: 0.3, physical: 0.25, mental: 0.1 },
  RB: { attack: 0.05, technique: 0.15, playmaking: 0.15, defense: 0.3, physical: 0.25, mental: 0.1 },
  CB: { attack: 0.02, technique: 0.08, playmaking: 0.1, defense: 0.45, physical: 0.22, mental: 0.13 },
  LWB: { attack: 0.12, technique: 0.15, playmaking: 0.15, defense: 0.2, physical: 0.28, mental: 0.1 },
  RWB: { attack: 0.12, technique: 0.15, playmaking: 0.15, defense: 0.2, physical: 0.28, mental: 0.1 },
  CDM: { attack: 0.03, technique: 0.12, playmaking: 0.22, defense: 0.33, physical: 0.17, mental: 0.13 },
  CM: { attack: 0.15, technique: 0.22, playmaking: 0.3, defense: 0.1, physical: 0.1, mental: 0.13 },
  CAM: { attack: 0.27, technique: 0.25, playmaking: 0.28, defense: 0.02, physical: 0.06, mental: 0.12 },
  LW: { attack: 0.3, technique: 0.27, playmaking: 0.15, defense: 0.02, physical: 0.16, mental: 0.1 },
  RW: { attack: 0.3, technique: 0.27, playmaking: 0.15, defense: 0.02, physical: 0.16, mental: 0.1 },
  ST: { attack: 0.35, technique: 0.2, playmaking: 0.1, defense: 0.02, physical: 0.18, mental: 0.15 },
  PG: { attack: 0.2, technique: 0.25, playmaking: 0.3, defense: 0.1, physical: 0.05, mental: 0.1 },
  SG: { attack: 0.35, technique: 0.2, playmaking: 0.1, defense: 0.12, physical: 0.1, mental: 0.13 },
  SF: { attack: 0.25, technique: 0.15, playmaking: 0.12, defense: 0.18, physical: 0.18, mental: 0.12 },
  PF: { attack: 0.2, technique: 0.08, playmaking: 0.08, defense: 0.24, physical: 0.28, mental: 0.12 },
  C: { attack: 0.15, technique: 0.05, playmaking: 0.05, defense: 0.3, physical: 0.35, mental: 0.1 },
};

/** Weekly cost of living, deducted after every matchday. */
export const LIVING_COST: Record<'amateur' | 'semi' | 'pro', number> = {
  amateur: 750,
  semi: 1000,
  pro: 1800,
};

export const CONTRACT_LABEL: Record<'amateur' | 'semi' | 'pro', string> = {
  amateur: 'חוזה חובבני',
  semi: 'חוזה חצי מקצועני',
  pro: 'חוזה מקצועני מלא',
};

export const SEASON_MATCHDAYS = 12;
export const TRANSFER_WINDOW_MATCHDAY = 6;
export const WEEK_SLOTS = 3;
