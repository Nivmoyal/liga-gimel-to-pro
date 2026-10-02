import { Flag, Mail, Plane } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { NATIONAL_BODY, NATIONAL_TEAM_NAME } from '../data/national';
import { Sheet } from './ui/Sheet';
import { GoldButton } from './ui/GoldButton';
import { ScenePhoto } from './art/ScenePhoto';
import { Crest } from './art/Crest';
import { Jersey } from './art/Jersey';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

/** National team call-up letter during an international break. */
export function CallUpModal({ state, dispatch }: Props) {
  const callUp = state.nationalCallUp;
  if (!callUp) return null;
  const { player } = state;
  const team = NATIONAL_TEAM_NAME[callUp.level];
  const caps = callUp.level === 'senior' ? player.national.caps : player.national.u21Caps;
  return (
    <Sheet
      title="זימון לנבחרת!"
      subtitle={`פגרת נבחרות | ${NATIONAL_BODY[player.sport]}`}
      icon={Flag}
      footer={
        <div className="space-y-2">
          <GoldButton onClick={() => dispatch({ type: 'ACCEPT_CALLUP' })}>
            <Plane size={18} />
            מתייצב ל{team}
          </GoldButton>
          <GoldButton variant="ghost" onClick={() => dispatch({ type: 'DECLINE_CALLUP' })}>
            לבקש לוותר הפעם (מנוחה)
          </GoldButton>
        </div>
      }
    >
      <ScenePhoto scene="national" sport={player.sport} height={170} className="mb-4 rounded-2xl" />
      <div className="mb-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-brand">
          <Mail size={16} />
          מכתב רשמי מ{NATIONAL_BODY[player.sport]}
        </div>
        <p className="leading-relaxed">
          {player.name}, על סמך ההופעות שלך ב{player.club} החליט המאמן הלאומי לזמן אותך ל<b>{team}</b> לקראת המשחק מול{' '}
          <b>{callUp.opponent}</b>.
          {caps === 0 ? ' זו תהיה ההופעה הראשונה שלך במדי הנבחרת.' : ` עד היום: ${caps} הופעות.`}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3">
        <div className="flex items-center gap-2">
          <Crest name="ישראל" size={36} />
          <span className="font-black">ישראל</span>
        </div>
        <Jersey primary="#ffffff" secondary="#0038b8" name={player.name} number={player.shirtNumber} sport={player.sport} width={64} />
        <div className="flex items-center gap-2">
          <span className="font-black">{callUp.opponent}</span>
          <Crest name={callUp.opponent} size={36} />
        </div>
      </div>
    </Sheet>
  );
}
