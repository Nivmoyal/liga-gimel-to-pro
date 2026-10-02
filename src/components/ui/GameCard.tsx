import type { ReactNode } from 'react';
import type { SportType } from '../../types/game';
import { ScenePhoto } from '../art/ScenePhoto';

interface GameCardProps {
  scene: string;
  seed?: string;
  sport: SportType;
  /** Gold outline pill on the photo, e.g. "34׳ הזדמנות". */
  badge?: ReactNode;
  /** Small line above the title (speaker / fixture). */
  kicker?: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
  footer?: ReactNode;
  label: string;
}

/** Centered match-moment card: photo on top, gold title, gold answers below. */
export function GameCard({ scene, seed, sport, badge, kicker, title, text, children, footer, label }: GameCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={label}>
      <div className="animate-sheet flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/70 bg-card shadow-2xl shadow-black">
        <div className="overflow-y-auto">
          <ScenePhoto scene={scene} sport={sport} seed={seed} height={250}>
            {badge && (
              <span className="absolute left-4 top-4 rounded-full border-2 border-brand bg-black/55 px-4 py-1.5 text-sm font-black text-brand backdrop-blur">
                {badge}
              </span>
            )}
          </ScenePhoto>
          <div className="relative -mt-4 px-5 pb-5 text-center">
            {kicker && <div className="mb-1 text-xs font-semibold text-muted">{kicker}</div>}
            <h2 className="gold-text text-3xl font-black leading-tight">{title}</h2>
            {text && <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink/75">{text}</p>}
            <div className="mt-4 text-right">{children}</div>
          </div>
        </div>
        {footer && <div className="border-t border-line bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
