import type { AttrKey, SportType } from '../types/game';

export type TrainingId = 'fitness' | 'skills' | 'tactical' | 'mental' | 'private';

export interface TrainingOption {
  id: TrainingId;
  label: Record<SportType, string>;
  description: string;
  energyCost: number;
  budgetCost: number;
  /** Fraction of a point per session (before potential, age and fatigue). Empty = position-based. */
  gains: Partial<Record<AttrKey, number>>;
  coachApproval: number;
  confidence: number;
}

export const TRAINING_OPTIONS: TrainingOption[] = [
  {
    id: 'fitness',
    label: { football: 'אימון כושר וספרינטים', basketball: 'אימון כושר וקפיצות' },
    description: 'ריצות, חדר כושר ועבודה על הגוף.',
    energyCost: 16,
    budgetCost: 0,
    gains: { physical: 0.55 },
    coachApproval: 1,
    confidence: 0,
  },
  {
    id: 'skills',
    label: { football: 'אימון גימור וטכניקה', basketball: 'סדרות קליעה וכדרור' },
    description: 'מאות חזרות על אותה תנועה עד שהיא אוטומטית.',
    energyCost: 14,
    budgetCost: 0,
    gains: { attack: 0.4, technique: 0.4 },
    coachApproval: 1,
    confidence: 2,
  },
  {
    id: 'tactical',
    label: { football: 'אימון טקטי עם המאמן', basketball: 'ניתוח וידאו ומהלכים' },
    description: 'עבודה על מיקום, קריאת משחק ומסירות. המאמן שם לב.',
    energyCost: 12,
    budgetCost: 0,
    gains: { playmaking: 0.35, defense: 0.35 },
    coachApproval: 4,
    confidence: 0,
  },
  {
    id: 'mental',
    label: { football: 'מפגש עם פסיכולוג ספורט', basketball: 'מפגש עם פסיכולוג ספורט' },
    description: 'עבודה על ריכוז, לחץ ושגרות. עולה כסף, חוסך כוח.',
    energyCost: 4,
    budgetCost: 250,
    gains: { mental: 0.5 },
    coachApproval: 0,
    confidence: 5,
  },
  {
    id: 'private',
    label: { football: 'מאמן אישי', basketball: 'מאמן סקילס אישי' },
    description: 'שעתיים אחד על אחד על התכונות החשובות לעמדה שלך.',
    energyCost: 24,
    budgetCost: 600,
    gains: {},
    coachApproval: 2,
    confidence: 3,
  },
];

export type LifestyleId = 'rest' | 'physio' | 'nutrition' | 'friends' | 'family' | 'gear';

export interface LifestyleOption {
  id: LifestyleId;
  label: string;
  description: string;
  budgetCost: number;
  energy: number;
  confidence: number;
  fanRep: number;
  attributes: Partial<Record<AttrKey, number>>;
  /** Fraction of a point towards these attributes (gradual, like training). */
  progress?: Partial<Record<AttrKey, number>>;
  oneTime?: boolean;
}

export const LIFESTYLE_OPTIONS: LifestyleOption[] = [
  { id: 'rest', label: 'מנוחה בבית', description: 'ספה, סדרה ושינה ארוכה.', budgetCost: 0, energy: 30, confidence: 0, fanRep: 0, attributes: {} },
  { id: 'physio', label: 'טיפול פיזיותרפיה', description: 'עיסוי עמוק ושחרור שרירים.', budgetCost: 350, energy: 45, confidence: 1, fanRep: 0, attributes: {} },
  { id: 'nutrition', label: 'תזונאי ספורט', description: 'תפריט מסודר, פחות שווארמה.', budgetCost: 400, energy: 10, confidence: 1, fanRep: 0, attributes: {}, progress: { physical: 0.35 } },
  { id: 'friends', label: 'ערב עם החברים', description: 'לנקות את הראש מהלחץ.', budgetCost: 200, energy: -8, confidence: 6, fanRep: 1, attributes: {} },
  { id: 'family', label: 'ארוחת שישי אצל המשפחה', description: 'אוכל של אמא ושקט נפשי.', budgetCost: 0, energy: 15, confidence: 5, fanRep: 0, attributes: {} },
  {
    id: 'gear',
    label: 'ציוד מקצועי חדש',
    description: 'נעליים ובגדים של מקצוענים. קנייה חד פעמית.',
    budgetCost: 900,
    energy: 0,
    confidence: 4,
    fanRep: 0,
    attributes: { technique: 1, attack: 1 },
    oneTime: true,
  },
];

export type SocialPostId = 'training' | 'fans' | 'lifestyle' | 'sponsored';

export interface SocialPostOption {
  id: SocialPostId;
  label: string;
  description: string;
  minFollowers: number;
}

export const SOCIAL_POSTS: SocialPostOption[] = [
  { id: 'training', label: 'סרטון מהאימון', description: 'עבודה קשה מושכת עוקבים ומרשימה אוהדים.', minFollowers: 0 },
  { id: 'fans', label: 'פוסט תודה לאוהדים', description: 'פחות עוקבים חדשים, הרבה יותר אהבה ביציע.', minFollowers: 0 },
  { id: 'lifestyle', label: 'סטורי מהחיים', description: 'הרבה צפיות. המאמן לא תמיד אוהב.', minFollowers: 0 },
  { id: 'sponsored', label: 'פוסט ממומן', description: 'כסף אמיתי מהרשת. האוהדים קצת פחות.', minFollowers: 1000 },
];
