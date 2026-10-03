import { Brain, Car, CarFront, Dumbbell, Footprints, Gift, HandHeart, HeartPulse, House, Building2, ShoppingBag, Target, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { SHOP_ITEMS } from '../../data/shop';
import type { ShopId, ShopItem, ShopKind } from '../../data/shop';
import { formatMoney } from '../../services/playerUtils';
import { leagueLevel } from '../../services/eventEngine';
import { shopOf } from '../../state/gameLogic';
import { Sheet } from '../ui/Sheet';

const ICONS: Record<ShopId, LucideIcon> = {
  boots: Footprints,
  car: Car,
  home_gym: Dumbbell,
  apartment: Building2,
  fitness_coach: Dumbbell,
  skills_coach: Target,
  physio: HeartPulse,
  mental_coach: Brain,
  family_help: HandHeart,
  kids_gear: Gift,
  luxury_car: CarFront,
  foundation: Trophy,
  parents_house: House,
};

const SECTIONS: Array<{ kind: ShopKind; title: string; note: string }> = [
  { kind: 'weekly', title: 'שירותים שבועיים', note: 'משלמים בסוף כל מחזור. אפשר לבטל מתי שרוצים, ואם אין מספיק כסף השירות נעצר לבד.' },
  { kind: 'own', title: 'קניות לתמיד', note: 'משלמים פעם אחת, נשאר לכל הקריירה.' },
  { kind: 'gift', title: 'לתת לאחרים', note: 'פעם אחת בכל עונה.' },
];

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function ShopSheet({ state, dispatch, onClose }: Props) {
  const { player } = state;
  const shop = shopOf(state);
  const level = leagueLevel(player);
  const weeklyTotal = shop.weekly.reduce((sum, id) => sum + (SHOP_ITEMS.find((i) => i.id === id)?.price ?? 0), 0);

  const status = (item: ShopItem): { label: string; active: boolean } => {
    if (item.kind === 'own' && shop.owned.includes(item.id)) return { label: 'שלך', active: true };
    if (item.kind === 'weekly' && shop.weekly.includes(item.id)) return { label: 'פעיל', active: true };
    if (item.kind === 'gift' && shop.gifts[item.id] === state.season) return { label: 'ניתן העונה', active: true };
    return { label: '', active: false };
  };

  return (
    <Sheet title="קניות והשקעות" subtitle={`בתקציב: ${formatMoney(player.budget)}${weeklyTotal ? ` | שירותים: ${formatMoney(weeklyTotal)} למחזור` : ''}`} icon={ShoppingBag} onClose={onClose}>
      <div className="space-y-5">
        {SECTIONS.map((section) => {
          const items = SHOP_ITEMS.filter((i) => i.kind === section.kind && (i.minLevel === undefined || level >= i.minLevel));
          return (
            <section key={section.kind}>
              <h3 className="font-extrabold">{section.title}</h3>
              <p className="mb-2 text-xs text-muted">{section.note}</p>
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = ICONS[item.id];
                  const { label, active } = status(item);
                  const canCancel = item.kind === 'weekly' && active;
                  const cantAfford = !active && player.budget < item.price;
                  return (
                    <div key={item.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${active ? 'border-brand/50 bg-brand/5' : 'border-line bg-card'}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{item.title}</div>
                        <div className="text-xs text-muted">{item.description}</div>
                        <div className="mt-0.5 text-xs text-emerald-400">{item.effect}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="text-xs font-bold text-amber-300">
                          {formatMoney(item.price)}
                          {item.kind === 'weekly' ? ' למחזור' : ''}
                        </div>
                        {canCancel ? (
                          <button onClick={() => dispatch({ type: 'CANCEL_ITEM', id: item.id })} className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold hover:border-rose-400">
                            לבטל
                          </button>
                        ) : active ? (
                          <span className="rounded-lg bg-brand/15 px-2.5 py-1 text-xs font-bold text-brand">{label}</span>
                        ) : (
                          <button
                            disabled={cantAfford}
                            onClick={() => dispatch({ type: 'BUY_ITEM', id: item.id })}
                            className="btn-gold rounded-lg px-2.5 py-1 text-xs font-black disabled:opacity-40"
                          >
                            {item.kind === 'weekly' ? 'להפעיל' : item.kind === 'gift' ? 'לתת' : 'לקנות'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}
