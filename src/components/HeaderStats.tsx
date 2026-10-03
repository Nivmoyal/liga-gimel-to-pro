import { Activity, Briefcase, Coins, Gauge, Handshake, Zap } from 'lucide-react';
import { Crest } from './art/Crest';
import { CaptainBadge } from './ui/CaptainBadge';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../types/game';
import { getJob } from '../data/jobs';
import { getAgent } from '../data/agents';
import { SEASON_MATCHDAYS, divisionName } from '../data/sports';
import { calcOvrExact, formatMoney } from '../services/playerUtils';

interface ChipProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'gold';
}

function StatChip({ icon: Icon, label, value, tone = 'default' }: ChipProps) {
  const toneClass = {
    default: 'text-ink',
    good: 'text-emerald-400',
    warn: 'text-amber-300',
    bad: 'text-rose-400',
    gold: 'text-brand',
  }[tone];
  const dot = { default: 'bg-muted', good: 'bg-emerald-400', warn: 'bg-amber-300', bad: 'bg-rose-400', gold: 'bg-brand' }[tone];
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-line bg-card/80 px-2 py-2">
      <Icon size={14} className="shrink-0 text-brand/80" />
      <div className="min-w-0">
        <div className="flex items-center gap-1 truncate text-[10px] leading-tight text-muted">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          {label}
        </div>
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
  // One decimal so every training session visibly moves the rating.
  const ovr = calcOvrExact(player).toFixed(1);
  const jobLabel = player.contract === 'pro' ? 'מקצוען' : job ? job.name : 'מובטל';

  return (
    <header className="brand-gradient sticky top-0 z-30 rounded-b-3xl px-4 pb-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] text-ink border-b border-line shadow-lg shadow-black/40">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-xl bg-black/60 p-1 shadow-sm">
            <Crest name={player.club} size={30} />
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
          <div className="flex max-w-[9rem] items-center justify-end gap-1 text-sm font-bold">
            <span className="truncate">{player.name}</span>
            <span className="rounded bg-card-2 px-1 text-xs text-brand ring-1 ring-brand/40">{player.shirtNumber}</span>
            {player.isCaptain && <CaptainBadge size={17} />}
          </div>
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
