import { useEffect, useState } from 'react';
import { Camera, ChevronLeft, Play, Plus, Trophy } from 'lucide-react';
import type { GameState } from '../types/game';
import { SPORT_LABEL, divisionName } from '../data/sports';
import { calcOvr } from '../services/playerUtils';
import { ScenePhoto } from './art/ScenePhoto';
import { Crest } from './art/Crest';
import { CaptainBadge } from './ui/CaptainBadge';
import { prefetchPhotos } from '../services/photoService';
import { PHOTO_QUERIES, PORTRAIT_KEYS } from '../data/photoQueries';

interface TitleScreenProps {
  save: GameState | null;
  onContinue: () => void;
  onNewGame: () => void;
  onCredits: () => void;
}

/** Opening screen: full-bleed photo, game title, continue / new career. */
export function TitleScreen({ save, onContinue, onNewGame, onCredits }: TitleScreenProps) {
  const [confirm, setConfirm] = useState(false);
  const p = save?.player;
  // Warm the photo cache in the background so match scenes appear instantly.
  useEffect(() => {
    const sport = p?.sport ?? 'football';
    const keys = Object.keys(PHOTO_QUERIES).filter((k) => !k.endsWith(sport === 'football' ? '_basketball' : '_football'));
    const first = ['title', 'intro_1', 'intro_2', 'intro_3'];
    void prefetchPhotos([...first, ...keys.filter((k) => !first.includes(k))], PORTRAIT_KEYS);
  }, [p?.sport]);
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden">
      <ScenePhoto scene="title" sport={p?.sport ?? 'football'} height="100dvh" className="!absolute inset-0" fade={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/95" />

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/60 bg-black/40 text-brand backdrop-blur">
            <Trophy size={28} />
          </div>
          <h1 className="gold-text text-[2.6rem] font-black leading-none drop-shadow">מליגה ג׳</h1>
          <h1 className="gold-text text-[2.6rem] font-black leading-tight drop-shadow">למקצוענות</h1>
          <p className="mt-2 text-sm font-semibold text-white/80">קריירה ישראלית בכדורגל ובכדורסל</p>
        </div>

        <div className="mt-auto space-y-3">
          {p && (
            <div className="rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-md">
              <div className="mb-1 text-[11px] font-bold text-brand">קריירה שמורה</div>
              <div className="flex items-center gap-3">
                <Crest name={p.club} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-white">
                    <span className="truncate">{p.name}</span>
                    <span className="text-brand">#{p.shirtNumber}</span>
                    {p.isCaptain && <CaptainBadge size={16} />}
                  </div>
                  <div className="truncate text-xs text-white/70">
                    {p.club} | {divisionName(p.sport, p.division)} | {SPORT_LABEL[p.sport]}
                  </div>
                  <div className="text-xs text-white/70">
                    עונה {save!.season} | מחזור {Math.min(save!.matchday + 1, 12)} | OVR {calcOvr(p)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {p && (
            <button onClick={onContinue} className="btn-gold flex w-full items-center justify-center gap-2 rounded-md py-4 text-lg font-black">
              <Play size={20} fill="currentColor" />
              המשך קריירה
            </button>
          )}

          {confirm ? (
            <div className="rounded-2xl border border-rose-500/40 bg-black/70 p-3 text-center backdrop-blur">
              <p className="mb-2 text-sm text-white">קריירה חדשה תמחק את השמירה הקיימת כשתתחיל לשחק. להמשיך?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onNewGame} className="btn-gold chamfer rounded-md py-2.5 font-black">
                  כן, קריירה חדשה
                </button>
                <button onClick={() => setConfirm(false)} className="rounded-md border border-white/30 py-2.5 font-bold text-white">
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => (p ? setConfirm(true) : onNewGame())}
              className={`flex w-full items-center justify-center gap-2 rounded-md py-4 text-lg font-black ${
                p ? 'border border-brand/70 bg-black/40 text-brand backdrop-blur' : 'btn-gold'
              }`}
            >
              <Plus size={20} />
              קריירה חדשה
            </button>
          )}

          <button onClick={onCredits} className="mx-auto flex items-center gap-1 text-xs text-white/55 hover:text-white">
            <Camera size={13} />
            קרדיטים לתמונות
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
