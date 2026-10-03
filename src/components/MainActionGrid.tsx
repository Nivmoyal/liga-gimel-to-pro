import { ChartNoAxesColumn, Briefcase, CircleHelp, Lock, ShoppingBag, Smartphone, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../types/game';
import { getJob } from '../data/jobs';
import { getAgent } from '../data/agents';
import { formatFollowers } from '../services/playerUtils';
import { availableSponsorCount, shopOf } from '../state/gameLogic';

export type ActionSheetId = 'shop' | 'job' | 'agent' | 'social' | 'stats' | 'help';

interface GridItem {
  id: ActionSheetId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  locked?: boolean;
  alert?: boolean;
}

interface MainActionGridProps {
  state: GameState;
  onOpen: (id: ActionSheetId) => void;
}

export function MainActionGrid({ state, onOpen }: MainActionGridProps) {
  const { player, flags } = state;
  const job = getJob(player.jobId);
  const agent = getAgent(player.agentId);
  const agentLocked = !agent && !flags.agentDiscovered;
  const needsJob = player.contract !== 'pro' && !job;

  const items: GridItem[] = [
    { id: 'shop', title: 'קניות והשקעות', subtitle: shopOf(state).weekly.length ? `${shopOf(state).weekly.length} שירותים פעילים` : 'מה הכסף יכול לקנות', icon: ShoppingBag },
    {
      id: 'job',
      title: 'עבודה',
      subtitle: player.contract === 'pro' ? 'מקצוען, בלי עבודה' : job ? job.name : 'חובה לבחור עבודה',
      icon: Briefcase,
      alert: needsJob || (Boolean(job) && player.contract !== 'pro' && flags.shiftsThisWeek === 0 && flags.jobWarnings > 0),
    },
    {
      id: 'agent',
      title: 'הסוכן שלי',
      subtitle: agent ? agent.name : agentLocked ? 'עוד אף סוכן לא התקשר' : 'סוכן מתעניין בך',
      icon: agentLocked ? Lock : UserRound,
      locked: agentLocked,
      alert: !agent && flags.agentDiscovered,
    },
    {
      id: 'social',
      title: 'מדיה ורשתות',
      subtitle: availableSponsorCount(player) > 0 ? 'ספונסר מחכה לך' : `${formatFollowers(player.followers)} עוקבים`,
      icon: Smartphone,
      alert: availableSponsorCount(player) > 0,
    },
    { id: 'stats', title: 'סטטיסטיקות', subtitle: 'טבלה ונתונים', icon: ChartNoAxesColumn },
    { id: 'help', title: 'איך משחקים', subtitle: 'הסבר על המדדים', icon: CircleHelp, alert: state.season === 1 && state.matchday === 0 },
  ];

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onOpen(item.id)}
            className={`relative flex items-center gap-3 rounded-2xl border p-3 text-right transition active:scale-[0.98] ${
              item.locked ? 'border-line bg-card/50 text-muted' : 'border-line bg-card hover:border-brand/50'
            }`}
          >
            {item.alert && <span className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500" />}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                item.locked ? 'bg-line text-muted' : 'bg-brand/10 text-brand'
              }`}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold leading-tight">{item.title}</div>
              <div className="truncate text-xs text-muted">{item.subtitle}</div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
