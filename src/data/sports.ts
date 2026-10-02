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
  { id: 'striker', label: 'חלוץ', short: 'חלוץ' },
  { id: 'midfielder', label: 'קשר', short: 'קשר' },
  { id: 'centerBack', label: 'בלם', short: 'בלם' },
  { id: 'fullBack', label: 'מגן', short: 'מגן' },
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

/** OVR weights per position. Each row sums to 1. */
export const OVR_WEIGHTS: Record<Position, Record<AttrKey, number>> = {
  striker: { attack: 0.35, technique: 0.2, playmaking: 0.1, defense: 0.02, physical: 0.18, mental: 0.15 },
  midfielder: { attack: 0.15, technique: 0.22, playmaking: 0.3, defense: 0.1, physical: 0.1, mental: 0.13 },
  centerBack: { attack: 0.02, technique: 0.08, playmaking: 0.1, defense: 0.45, physical: 0.22, mental: 0.13 },
  fullBack: { attack: 0.05, technique: 0.15, playmaking: 0.15, defense: 0.3, physical: 0.25, mental: 0.1 },
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
