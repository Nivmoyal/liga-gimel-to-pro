import type { SportType } from '../types/game';

export type NationalLevel = 'u21' | 'senior';

export const NATIONAL_TEAM_NAME: Record<NationalLevel, string> = {
  senior: 'נבחרת ישראל',
  u21: 'נבחרת ישראל עד גיל 21',
};

export const NATIONAL_BODY: Record<SportType, string> = {
  football: 'ההתאחדות לכדורגל',
  basketball: 'איגוד הכדורסל',
};

/** International breaks: right after these matchdays. */
export const INTERNATIONAL_WINDOWS = [4, 9];

/** Team strength of Israel per sport/level and the OVR + form needed for a call-up. */
export const NATIONAL_SETUP: Record<SportType, Record<NationalLevel, { strength: number; minOvr: number; minForm: number; maxAge?: number }>> = {
  football: {
    u21: { strength: 56, minOvr: 49, minForm: 6.7, maxAge: 21 },
    senior: { strength: 68, minOvr: 60, minForm: 6.8 },
  },
  basketball: {
    u21: { strength: 60, minOvr: 56, minForm: 6.8, maxAge: 21 },
    senior: { strength: 72, minOvr: 66, minForm: 6.8 },
  },
};

export const NATIONAL_OPPONENTS: Record<SportType, Array<{ name: string; colors: [string, string]; strength: number }>> = {
  football: [
    { name: 'נורווגיה', colors: ['#c8102e', '#ffffff'], strength: 70 },
    { name: 'אוסטריה', colors: ['#ed2939', '#ffffff'], strength: 72 },
    { name: 'סקוטלנד', colors: ['#0b2a5b', '#ffffff'], strength: 69 },
    { name: 'רומניה', colors: ['#fcd116', '#002b7f'], strength: 66 },
    { name: 'סלובניה', colors: ['#ffffff', '#005da4'], strength: 64 },
    { name: 'קפריסין', colors: ['#ffffff', '#d57800'], strength: 58 },
    { name: 'אלבניה', colors: ['#e41e20', '#111111'], strength: 63 },
    { name: 'איטליה', colors: ['#0066b3', '#ffffff'], strength: 80 },
  ],
  basketball: [
    { name: 'ליטא', colors: ['#fdb913', '#006a44'], strength: 78 },
    { name: 'יוון', colors: ['#0d5eaf', '#ffffff'], strength: 79 },
    { name: 'גרמניה', colors: ['#ffffff', '#111111'], strength: 80 },
    { name: 'פולין', colors: ['#ffffff', '#dc143c'], strength: 70 },
    { name: 'צ׳כיה', colors: ['#11457e', '#d7141a'], strength: 71 },
    { name: 'אסטוניה', colors: ['#0072ce', '#111111'], strength: 64 },
    { name: 'בריטניה', colors: ['#012169', '#c8102e'], strength: 66 },
    { name: 'ספרד', colors: ['#c60b1e', '#ffc400'], strength: 82 },
  ],
};
