import type { Job, JobId } from '../types/game';

export const JOBS: Job[] = [
  {
    id: 'pizza',
    name: 'שליח פיצה',
    description: 'משמרות ערב על קטנוע. שעות גמישות, הרבה עלייה וירידה במדרגות.',
    payPerShift: 420,
    energyCost: 16,
    perk: { label: 'כושר גופני +1 לפעמים', effects: { attributes: { physical: 1 } } },
  },
  {
    id: 'security',
    name: 'מאבטח',
    description: 'עמידה ארוכה בכניסה לקניון. משעמם, אבל מחשל את הראש.',
    payPerShift: 480,
    energyCost: 14,
    perk: { label: 'מנטליות +1 לפעמים', effects: { attributes: { mental: 1 } } },
  },
  {
    id: 'factory',
    name: 'עובד מפעל',
    description: 'משמרות כבדות בפס הייצור. המשכורת הכי טובה, הגוף משלם.',
    payPerShift: 620,
    energyCost: 24,
    perk: { label: 'משכורת גבוהה', effects: {} },
  },
  {
    id: 'mechanic',
    name: 'מוסכניק',
    description: 'עבודה במוסך של דוד. ידיים שחורות, ראש שקט.',
    payPerShift: 540,
    energyCost: 20,
    perk: { label: 'ביטחון עצמי +2', effects: { confidence: 2 } },
  },
  {
    id: 'instructor',
    name: 'מדריך חוגים',
    description: 'מאמן ילדים בחוג אחר הצהריים. פחות כסף, הרבה אהבה מהקהילה.',
    payPerShift: 360,
    energyCost: 10,
    perk: { label: 'מוניטין אוהדים +2', effects: { fanRep: 2 } },
  },
];

export function getJob(id: JobId | null | undefined): Job | null {
  if (!id) return null;
  return JOBS.find((j) => j.id === id) ?? null;
}
