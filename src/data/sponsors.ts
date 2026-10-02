// Personal sponsorship deals. All brands are fictional.

export type SponsorCategory = 'food' | 'drink' | 'apparel' | 'telecom' | 'finance' | 'auto';

export interface Sponsor {
  id: string;
  name: string;
  category: SponsorCategory;
  tagline: string;
  /** Weekly payment in NIS before agent commission. */
  weekly: number;
  signingBonus: number;
  seasons: number;
  color: string;
  requires: { followers?: number; fanRep?: number; ovr?: number; division?: number; nationalCaps?: number };
}

export const SPONSOR_CATEGORY_LABEL: Record<SponsorCategory, string> = {
  food: 'מזון',
  drink: 'משקאות',
  apparel: 'ציוד ספורט',
  telecom: 'תקשורת',
  finance: 'פיננסים',
  auto: 'רכב',
};

export const SPONSORS: Sponsor[] = [
  {
    id: 'sp_pizza',
    name: 'פיצה השכונה',
    category: 'food',
    tagline: 'מגש משפחתי אחרי כל ניצחון',
    weekly: 120,
    signingBonus: 200,
    seasons: 1,
    color: '#e8452c',
    requires: { fanRep: 30 },
  },
  {
    id: 'sp_water',
    name: 'מעיין הצפון',
    category: 'drink',
    tagline: 'מים מינרליים מהגולן',
    weekly: 180,
    signingBonus: 300,
    seasons: 1,
    color: '#1aa3d9',
    requires: { followers: 300 },
  },
  {
    id: 'sp_gym',
    name: 'פאוור ג׳ים',
    category: 'apparel',
    tagline: 'רשת חדרי כושר שכונתיים',
    weekly: 220,
    signingBonus: 400,
    seasons: 1,
    color: '#7c3aed',
    requires: { fanRep: 40, followers: 500 },
  },
  {
    id: 'sp_energy',
    name: 'ספרינט אנרג׳י',
    category: 'drink',
    tagline: 'משקה האנרגיה של הליגות הנמוכות',
    weekly: 420,
    signingBonus: 800,
    seasons: 1,
    color: '#16a34a',
    requires: { followers: 900, fanRep: 45 },
  },
  {
    id: 'sp_boots',
    name: 'סטרייק ספורט',
    category: 'apparel',
    tagline: 'נעליים ובגדי ספורט ישראליים',
    weekly: 650,
    signingBonus: 1200,
    seasons: 2,
    color: '#f97316',
    requires: { ovr: 55, followers: 1200 },
  },
  {
    id: 'sp_telecom',
    name: 'גל-נט סלולר',
    category: 'telecom',
    tagline: 'גלישה בלי הגבלה, כמו הריצות שלך',
    weekly: 1500,
    signingBonus: 3000,
    seasons: 2,
    color: '#0ea5e9',
    requires: { followers: 3000, division: 2 },
  },
  {
    id: 'sp_bank',
    name: 'בנק הגפן',
    category: 'finance',
    tagline: 'הבנק של הספורטאים',
    weekly: 2400,
    signingBonus: 5000,
    seasons: 2,
    color: '#1d4ed8',
    requires: { fanRep: 70, followers: 5000 },
  },
  {
    id: 'sp_car',
    name: 'אוטו-סטאר',
    category: 'auto',
    tagline: 'רכב חדש לשחקן הנבחרת',
    weekly: 2000,
    signingBonus: 4000,
    seasons: 2,
    color: '#111827',
    requires: { nationalCaps: 1, followers: 2500 },
  },
];

export const MAX_SPONSORS = 3;

export function getSponsor(id: string): Sponsor | null {
  return SPONSORS.find((s) => s.id === id) ?? null;
}
