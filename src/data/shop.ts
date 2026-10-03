// Things money buys. Owned items last for the whole career, weekly services are
// paid after every matchday until cancelled, gifts can be given once a season.

export type ShopId =
  | 'boots'
  | 'car'
  | 'home_gym'
  | 'apartment'
  | 'fitness_coach'
  | 'skills_coach'
  | 'physio'
  | 'mental_coach'
  | 'family_help'
  | 'kids_gear'
  | 'luxury_car'
  | 'foundation'
  | 'parents_house';

export type ShopKind = 'own' | 'weekly' | 'gift';

export interface ShopItem {
  id: ShopId;
  kind: ShopKind;
  title: string;
  description: string;
  /** What it does, in one short line. */
  effect: string;
  price: number;
  /** Only shown from this league level up (0 = ליגה ג׳). */
  minLevel?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'boots', kind: 'own', title: 'נעליים מקצועיות', description: 'נעליים ובגדים של מקצוענים.', effect: '+1 טכניקה, +1 התקפה, ביטחון', price: 900 },
  { id: 'car', kind: 'own', title: 'רכב משומש', description: 'בלי אוטובוסים ובלי טרמפים לאימונים.', effect: 'חצי מהעייפות של הנסיעה', price: 9000 },
  { id: 'home_gym', kind: 'own', title: 'פינת כושר בבית', description: 'משקולות, מתח ואופני כושר במרפסת.', effect: 'שיפור קבוע בכושר הגופני כל שבוע', price: 4500 },
  { id: 'apartment', kind: 'weekly', title: 'דירה ליד המועדון', description: 'שכירות ליד המגרש. ישנים יותר, נוסעים פחות.', effect: 'בלי עייפות מנסיעה, +5 אנרגיה בשבוע', price: 650 },
  { id: 'fitness_coach', kind: 'weekly', title: 'מאמן כושר אישי', description: 'שלושה בקרים בשבוע, תוכנית אישית.', effect: 'שיפור בכושר הגופני, +5 אנרגיה', price: 400 },
  { id: 'skills_coach', kind: 'weekly', title: 'מאמן מקצועי אישי', description: 'עבודה אחד על אחד על מה שהעמדה שלך צריכה.', effect: 'שיפור בשתי התכונות החשובות לעמדה', price: 700 },
  { id: 'physio', kind: 'weekly', title: 'פיזיותרפיסט צמוד', description: 'טיפול אחרי כל משחק ואחרי כל אימון קשה.', effect: '+10 אנרגיה בשבוע, חזרה מהירה מפציעות', price: 350 },
  { id: 'mental_coach', kind: 'weekly', title: 'פסיכולוג ספורט', description: 'שיחה שבועית על לחץ, ריכוז ושגרות.', effect: '+3 ביטחון בשבוע, שיפור במנטליות', price: 300 },
  { id: 'family_help', kind: 'gift', title: 'עזרה למשפחה', description: 'לשלם להורים חשבון או שניים החודש.', effect: '+6 ביטחון, פעם בעונה', price: 1000 },
  { id: 'kids_gear', kind: 'gift', title: 'ציוד לילדים בשכונה', description: 'כדורים וחולצות למגרש שבו התחלת.', effect: '+5 אהדה, עוקבים חדשים, פעם בעונה', price: 800 },
  { id: 'luxury_car', kind: 'own', title: 'רכב יוקרה', description: 'כל העיר רואה אותך מגיע לאימון.', effect: 'עוקבים, ביטחון, אבל קצת פחות אהדה', price: 80000, minLevel: 3 },
  { id: 'foundation', kind: 'weekly', title: 'קרן לילדים בפריפריה', description: 'מימון חוגי ספורט לילדים שאין להם.', effect: '+2 אהדה ועוקבים חדשים כל שבוע', price: 2500, minLevel: 3 },
  { id: 'parents_house', kind: 'own', title: 'בית להורים', description: 'הבית שהבטחת לאמא כשהיית בן עשר.', effect: '+10 ביטחון, רגע שלא שוכחים', price: 250000, minLevel: 3 },
];

export function getShopItem(id: ShopId): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}
