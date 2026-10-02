import { useState } from 'react';
import { BadgeDollarSign, Camera, CircleCheck, Heart, Lock, Megaphone, Smartphone, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { SOCIAL_POSTS } from '../../data/activities';
import type { SocialPostId } from '../../data/activities';
import { MAX_SPONSORS, SPONSORS, SPONSOR_CATEGORY_LABEL, getSponsor } from '../../data/sponsors';
import { getAgent } from '../../data/agents';
import { availableSponsorCount, sponsorBlocked, sponsorMissing, sponsorWeeklyNet } from '../../state/gameLogic';
import { formatFollowers, formatMoney } from '../../services/playerUtils';
import { Sheet } from '../ui/Sheet';
import { SocialFeed } from '../SocialFeed';
import { SponsorLogo } from '../art/SponsorLogo';

const ICONS: Record<SocialPostId, LucideIcon> = {
  training: Camera,
  fans: Heart,
  lifestyle: Sparkles,
  sponsored: Megaphone,
};

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function SocialSheet({ state, dispatch, onClose }: Props) {
  const [tab, setTab] = useState<'posts' | 'sponsors'>('posts');
  const { player } = state;
  const offers = availableSponsorCount(player);
  return (
    <Sheet title="מדיה ורשתות" subtitle="פוסטים, עוקבים וספונסרים" icon={Smartphone} onClose={onClose}>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-line bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted">
            <Users size={13} />
            עוקבים
          </div>
          <div className="text-xl font-black text-brand">{formatFollowers(player.followers)}</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted">
            <Heart size={13} />
            מוניטין
          </div>
          <div className="text-xl font-black">{player.fanRep}</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted">
            <BadgeDollarSign size={13} />
            ספונסרים
          </div>
          <div className="text-xl font-black">
            {player.sponsors.length}/{MAX_SPONSORS}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-card-2 p-1">
        {(
          [
            ['posts', 'פוסטים וחדשות'],
            ['sponsors', `ספונסרים${offers ? ` (${offers} הצעות)` : ''}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg py-2 text-sm font-bold transition ${tab === id ? 'bg-card text-brand shadow-sm' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts' ? <PostsTab state={state} dispatch={dispatch} /> : <SponsorsTab state={state} dispatch={dispatch} />}
    </Sheet>
  );
}

function PostsTab({ state, dispatch }: { state: GameState; dispatch: (a: GameAction) => void }) {
  const { player, flags } = state;
  return (
    <>
      <div className="mb-4 space-y-2">
        {SOCIAL_POSTS.map((opt) => {
          const Icon = ICONS[opt.id];
          const locked = player.followers < opt.minFollowers;
          return (
            <button
              key={opt.id}
              disabled={flags.postedThisWeek || locked}
              onClick={() => dispatch({ type: 'SOCIAL_POST', option: opt.id })}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-right transition hover:border-brand/50 disabled:opacity-40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{opt.label}</div>
                <div className="text-xs text-muted">{locked ? `נפתח ב-${opt.minFollowers} עוקבים` : opt.description}</div>
              </div>
            </button>
          );
        })}
        {flags.postedThisWeek && <p className="text-center text-xs text-muted">כבר פרסמת השבוע. נתראה אחרי המחזור.</p>}
      </div>
      <SocialFeed news={state.news} limit={12} />
    </>
  );
}

function SponsorsTab({ state, dispatch }: { state: GameState; dispatch: (a: GameAction) => void }) {
  const { player } = state;
  const agent = getAgent(player.agentId);
  const weeklyTotal = player.sponsors.reduce((sum, s) => {
    const sponsor = getSponsor(s.id);
    return sponsor ? sum + sponsorWeeklyNet(sponsor, agent) : sum;
  }, 0);
  const activeIds = new Set(player.sponsors.map((s) => s.id));
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-extrabold">החסויות שלי</h3>
          <span className="text-sm font-bold text-emerald-600">+{formatMoney(weeklyTotal)} לשבוע</span>
        </div>
        {player.sponsors.length === 0 ? (
          <p className="text-sm text-muted">אין עדיין ספונסרים. עוקבים, מוניטין ודירוג פותחים מותגים חדשים.</p>
        ) : (
          <ul className="space-y-2">
            {player.sponsors.map((active) => {
              const sponsor = getSponsor(active.id);
              if (!sponsor) return null;
              return (
                <li key={active.id} className="flex items-center justify-between gap-2 rounded-xl bg-card-2 p-2.5">
                  <div className="min-w-0">
                    <SponsorLogo sponsor={sponsor} size="sm" />
                    <div className="mt-1 text-[11px] text-muted">
                      {formatMoney(sponsorWeeklyNet(sponsor, agent))} לשבוע | עד סוף עונה {active.untilSeason}
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'DROP_SPONSOR', sponsorId: sponsor.id })}
                    className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-muted hover:text-rose-600"
                  >
                    לבטל
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {agent && <p className="mt-2 text-[11px] text-brand">{agent.name} משפר את התנאים ב-{agent.level * 10}% (לפני עמלה)</p>}
      </section>

      <section className="space-y-2">
        <h3 className="font-extrabold">מותגים בשוק</h3>
        {SPONSORS.filter((s) => !activeIds.has(s.id)).map((sponsor) => {
          const missing = sponsorMissing(player, sponsor);
          const blocked = sponsorBlocked(player, sponsor);
          const ready = missing.length === 0 && !blocked;
          return (
            <div key={sponsor.id} className={`rounded-2xl border bg-card p-3 ${ready ? 'border-emerald-500/40' : 'border-line'}`}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <SponsorLogo sponsor={sponsor} />
                <span className="text-[11px] text-muted">{SPONSOR_CATEGORY_LABEL[sponsor.category]}</span>
              </div>
              <p className="mb-2 text-xs text-muted">{sponsor.tagline}</p>
              <div className="mb-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-md bg-card-2 px-2 py-1">{formatMoney(sponsorWeeklyNet(sponsor, agent))} לשבוע</span>
                <span className="rounded-md bg-card-2 px-2 py-1">מענק {formatMoney(sponsor.signingBonus)}</span>
                <span className="rounded-md bg-card-2 px-2 py-1">{sponsor.seasons === 1 ? 'עונה אחת' : `${sponsor.seasons} עונות`}</span>
              </div>
              {ready ? (
                <button
                  onClick={() => dispatch({ type: 'SIGN_SPONSOR', sponsorId: sponsor.id })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-sm font-bold text-white hover:bg-brand-600"
                >
                  <CircleCheck size={16} />
                  לחתום על חסות
                </button>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl bg-card-2 px-3 py-2 text-xs text-muted">
                  <Lock size={13} />
                  {blocked ?? `דרוש: ${missing.join(', ')}`}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
