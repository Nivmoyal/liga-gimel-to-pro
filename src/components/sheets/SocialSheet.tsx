import { Camera, Heart, Megaphone, Smartphone, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { SOCIAL_POSTS } from '../../data/activities';
import type { SocialPostId } from '../../data/activities';
import { formatFollowers } from '../../services/playerUtils';
import { Sheet } from '../ui/Sheet';
import { SocialFeed } from '../SocialFeed';

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
  const { player, flags } = state;
  return (
    <Sheet title="מדיה ורשתות" subtitle="פוסט אחד בשבוע, לא משבצת זמן" icon={Smartphone} onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-line bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted">
            <Users size={13} />
            עוקבים
          </div>
          <div className="text-2xl font-black text-gold">{formatFollowers(player.followers)}</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3">
          <div className="flex items-center gap-1 text-xs text-muted">
            <Heart size={13} />
            מוניטין אוהדים
          </div>
          <div className="text-2xl font-black">{player.fanRep}</div>
        </div>
      </div>
      <div className="mb-4 space-y-2">
        {SOCIAL_POSTS.map((opt) => {
          const Icon = ICONS[opt.id];
          const locked = player.followers < opt.minFollowers;
          return (
            <button
              key={opt.id}
              disabled={flags.postedThisWeek || locked}
              onClick={() => dispatch({ type: 'SOCIAL_POST', option: opt.id })}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-right transition hover:border-amber-500/60 disabled:opacity-40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-gold">
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
    </Sheet>
  );
}
