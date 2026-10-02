import { Activity, Briefcase, Coins, Gauge, Handshake, Shield, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../types/game';
import { getJob } from '../data/jobs';
import { getAgent } from '../data/agents';
import { SEASON_MATCHDAYS, divisionName } from '../data/sports';
import { calcOvr, formatMoney } from '../services/playerUtils';

interface ChipProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'gold';
}

function StatChip({ icon: Icon, label, value, tone = 'default' }: ChipProps) {
  const toneClass = {
    default: 'text-white',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-rose-400',
    gold: 'text-gold',
  }[tone];
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-line bg-card px-2 py-2">
      <Icon size={14} className="shrink-0 text-muted" />
      <div className="min-w-0">
        <div className="truncate text-[10px] leading-tight text-muted">{label}</div>
        <div className={`truncate text-[13px] font-bold leading-tight tabular-nums ${toneClass}`}>{value}</div>
      </div>
    </div>
  );
}

const levelTone = (v: number): ChipProps['tone'] => (v >= 65 ? 'good' : v >= 35 ? 'warn' : 'bad');

export function HeaderStats({ state }: { state: GameState }) {
  const { player } = state;
  const job = getJob(player.jobId);
  const agent = getAgent(player.agentId);
  const ovr = calcOvr(player);
  const jobLabel = player.contract === 'pro' ? 'מקצוען' : job ? job.name : 'מובטל';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-pitch/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black">
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-extrabold leading-tight">{player.club}</div>
            <div className="truncate text-xs text-muted">
              {divisionName(player.sport, player.division)} | עונה {state.season} | מחזור {Math.min(state.matchday + 1, SEASON_MATCHDAYS)}/{SEASON_MATCHDAYS}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-left">
          <div className="text-[10px] text-muted">שחקן</div>
          <div className="max-w-[8rem] truncate text-sm font-bold">{player.name}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <StatChip icon={Coins} label="תקציב" value={formatMoney(player.budget)} tone={player.budget < 0 ? 'bad' : 'gold'} />
        <StatChip icon={Briefcase} label="עבודה" value={jobLabel} tone={!job && player.contract !== 'pro' ? 'bad' : 'default'} />
        <StatChip icon={Activity} label="אמון המאמן" value={`${player.coachApproval}%`} tone={levelTone(player.coachApproval)} />
        <StatChip icon={Zap} label="אנרגיה" value={`${player.energy}%`} tone={levelTone(player.energy)} />
        <StatChip icon={Gauge} label="דירוג כללי" value={`${ovr} OVR`} tone="gold" />
        <StatChip icon={Handshake} label="סוכן" value={agent ? agent.name : 'ללא סוכן'} tone={agent ? 'good' : 'default'} />
      </div>
    </header>
  );
}
