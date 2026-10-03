import { useEffect, useReducer, useState } from 'react';
import { Info } from 'lucide-react';
import { gameReducer } from './state/gameReducer';
import { loadGame, saveGame } from './state/storage';
import { SetupScreen } from './components/SetupScreen';
import { HeaderStats } from './components/HeaderStats';
import { SportIndicator } from './components/SportIndicator';
import { DecisionBox } from './components/DecisionBox';
import { MainActionGrid } from './components/MainActionGrid';
import type { ActionSheetId } from './components/MainActionGrid';
import { SocialFeed } from './components/SocialFeed';
import { MainCTA } from './components/MainCTA';
import { BottomNav } from './components/BottomNav';
import type { ViewId } from './components/BottomNav';
import { PreMatchModal } from './components/PreMatchModal';
import { InGameEventModal } from './components/InGameEventModal';
import { MatchSummaryModal } from './components/MatchSummaryModal';
import { PostMatchInterview } from './components/PostMatchInterview';
import { TransferWindowModal } from './components/TransferWindowModal';
import { SeasonEndModal } from './components/SeasonEndModal';
import { CallUpModal } from './components/CallUpModal';
import { CupDrawModal } from './components/CupDrawModal';
import { LiveMatchScreen } from './components/LiveMatchScreen';
import { TitleScreen } from './components/TitleScreen';
import { IntroStory } from './components/IntroStory';
import { CreditsScreen } from './components/CreditsScreen';
import { JobSheet } from './components/sheets/JobSheet';
import { AgentSheet } from './components/sheets/AgentSheet';
import { ShopSheet } from './components/sheets/ShopSheet';
import { SocialSheet } from './components/sheets/SocialSheet';
import { StatsView } from './components/views/StatsView';
import { CareerView } from './components/views/CareerView';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null, loadGame);
  const [view, setView] = useState<ViewId>('home');
  const [sheet, setSheet] = useState<ActionSheetId | null>(null);
  /** Out-of-game screens. The saved career stays untouched until a new one starts. */
  const [screen, setScreen] = useState<'title' | 'intro' | 'setup' | 'credits' | 'game'>('title');

  useEffect(() => {
    saveGame(state);
  }, [state]);

  // Every screen change starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, screen]);

  // Auto-hide action feedback
  useEffect(() => {
    if (!state?.toast) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2800);
    return () => clearTimeout(t);
  }, [state?.toast]);

  // Close any open action sheet as soon as a match phase takes over the screen
  useEffect(() => {
    if (state && state.phase !== 'dashboard') setSheet(null);
  }, [state?.phase]);

  if (screen !== 'game' || !state) {
    return (
      <div dir="rtl" className="min-h-dvh bg-pitch text-ink">
        {screen === 'intro' && <IntroStory onDone={() => setScreen('setup')} />}
        {screen === 'setup' && (
          <SetupScreen
            onBack={() => setScreen('title')}
            onStart={(setup) => {
              setView('home');
              dispatch({ type: 'NEW_GAME', setup });
              setScreen('game');
            }}
          />
        )}
        {screen === 'credits' && <CreditsScreen onBack={() => setScreen('title')} />}
        {(screen === 'title' || screen === 'game') && (
          <TitleScreen
            save={state}
            onContinue={() => {
              setView('home');
              setScreen('game');
            }}
            onNewGame={() => setScreen('intro')}
            onCredits={() => setScreen('credits')}
          />
        )}
      </div>
    );
  }

  const openSheet = (id: ActionSheetId) => {
    if (id === 'stats') {
      setView('table');
      return;
    }
    setSheet(id);
  };
  const closeSheet = () => setSheet(null);

  return (
    <div dir="rtl" className="min-h-dvh bg-pitch text-ink">
      <div className="mx-auto max-w-md">
        <HeaderStats state={state} />

        <main className={`space-y-3 px-4 pt-3 ${view === 'home' ? 'pb-48' : 'pb-24'}`}>
          {view === 'home' && (
            <>
              <SportIndicator state={state} />
              <DecisionBox state={state} dispatch={dispatch} />
              <MainActionGrid state={state} onOpen={openSheet} />
              <SocialFeed news={state.news} limit={6} />
            </>
          )}
          {view === 'table' && <StatsView state={state} />}
          {view === 'news' && <SocialFeed news={state.news} title="חדשות ורשתות" />}
          {view === 'career' && (
            <CareerView
              state={state}
              onReset={() => {
                dispatch({ type: 'RESET' });
                setScreen('title');
              }}
              onHome={() => setScreen('title')}
            />
          )}
        </main>
      </div>

      {view === 'home' && state.phase === 'dashboard' && <MainCTA state={state} onStart={() => dispatch({ type: 'START_MATCHDAY' })} />}
      <BottomNav view={view} onChange={setView} />

      {/* Action sheets */}
      {state.phase === 'dashboard' && sheet === 'job' && <JobSheet state={state} dispatch={dispatch} onClose={closeSheet} />}
      {state.phase === 'dashboard' && sheet === 'agent' && <AgentSheet state={state} dispatch={dispatch} onClose={closeSheet} />}
      {state.phase === 'dashboard' && sheet === 'shop' && <ShopSheet state={state} dispatch={dispatch} onClose={closeSheet} />}
      {state.phase === 'dashboard' && sheet === 'social' && <SocialSheet state={state} dispatch={dispatch} onClose={closeSheet} />}

      {/* Matchday flow */}
      {state.phase === 'preMatch' && <PreMatchModal state={state} dispatch={dispatch} />}
      {(state.phase === 'live' || state.phase === 'inGame') && state.currentMatch && (
        <LiveMatchScreen state={state} dispatch={dispatch} paused={state.phase !== 'live'} />
      )}
      {state.phase === 'inGame' && <InGameEventModal state={state} dispatch={dispatch} />}
      {state.phase === 'matchSummary' && <MatchSummaryModal state={state} dispatch={dispatch} />}
      {state.phase === 'postMatch' && <PostMatchInterview state={state} dispatch={dispatch} />}
      {state.phase === 'transfer' && <TransferWindowModal state={state} dispatch={dispatch} />}
      {state.phase === 'seasonEnd' && <SeasonEndModal state={state} dispatch={dispatch} />}
      {state.phase === 'callUp' && <CallUpModal state={state} dispatch={dispatch} />}
      {state.phase === 'cupDraw' && <CupDrawModal state={state} dispatch={dispatch} />}

      {state.toast && (
        <div className="pointer-events-none fixed inset-x-0 top-[max(5.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
          <div className="animate-sheet flex max-w-sm items-center gap-2 rounded-2xl border border-brand/40 bg-card-2 px-4 py-3 text-sm font-semibold shadow-2xl">
            <Info size={16} className="shrink-0 text-brand" />
            {state.toast}
          </div>
        </div>
      )}
    </div>
  );
}
