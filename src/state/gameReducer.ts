import type { GameState, JobId, SetupData } from '../types/game';
import type { LifestyleId, SocialPostId, TrainingId } from '../data/activities';
import type { ShopId } from '../data/shop';
import * as logic from './gameLogic';

export type GameAction =
  | { type: 'NEW_GAME'; setup: SetupData }
  | { type: 'RESET' }
  | { type: 'LOAD_SAVE'; state: GameState }
  | { type: 'TRAIN'; option: TrainingId }
  | { type: 'LIFESTYLE'; option: LifestyleId }
  | { type: 'WORK_SHIFT' }
  | { type: 'CHOOSE_JOB'; jobId: JobId }
  | { type: 'QUIT_JOB' }
  | { type: 'ASK_RAISE' }
  | { type: 'SOCIAL_POST'; option: SocialPostId }
  | { type: 'SIGN_AGENT'; agentId: string }
  | { type: 'FIRE_AGENT' }
  | { type: 'AGENT_PUSH' }
  | { type: 'SIGN_SPONSOR'; sponsorId: string }
  | { type: 'DROP_SPONSOR'; sponsorId: string }
  | { type: 'ACCEPT_CALLUP' }
  | { type: 'DECLINE_CALLUP' }
  | { type: 'LIFE_CHOICE'; index: number }
  | { type: 'LIFE_DISMISS' }
  | { type: 'START_MATCHDAY' }
  | { type: 'PRE_CHOICE'; index: number }
  | { type: 'PRE_CONTINUE' }
  | { type: 'LIVE_ADVANCE' }
  | { type: 'INGAME_CHOICE'; index: number }
  | { type: 'INGAME_CONTINUE' }
  | { type: 'SUMMARY_CONTINUE' }
  | { type: 'POST_CHOICE'; index: number }
  | { type: 'POST_CONTINUE' }
  | { type: 'ACCEPT_OFFER'; offerId: string }
  | { type: 'DECLINE_OFFERS' }
  | { type: 'SEASON_CONTINUE' }
  | { type: 'CUP_PLAY' }
  | { type: 'RETIRE' }
  | { type: 'BUY_ITEM'; id: ShopId }
  | { type: 'CANCEL_ITEM'; id: ShopId }
  | { type: 'CLEAR_TOAST' };

/** `null` state means the setup screen is shown. */
export function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  const next = reduce(state, action);
  // Achievements unlock whenever the career reaches them.
  return next && action.type !== 'CLEAR_TOAST' ? logic.unlockAchievements(next) : next;
}

function reduce(state: GameState | null, action: GameAction): GameState | null {
  if (action.type === 'NEW_GAME') return logic.createNewGame(action.setup);
  if (action.type === 'RESET') return null;
  if (action.type === 'LOAD_SAVE') return action.state;
  if (!state) return state;

  switch (action.type) {
    case 'TRAIN':
      return logic.train(state, action.option);
    case 'LIFESTYLE':
      return logic.lifestyle(state, action.option);
    case 'WORK_SHIFT':
      return logic.workShift(state);
    case 'RETIRE':
      return logic.retire(state);
    case 'CUP_PLAY':
      return logic.startCupMatch(state);
    case 'BUY_ITEM':
      return logic.buyItem(state, action.id);
    case 'CANCEL_ITEM':
      return logic.cancelItem(state, action.id);
    case 'CHOOSE_JOB':
      return logic.chooseJob(state, action.jobId);
    case 'QUIT_JOB':
      return logic.quitJob(state);
    case 'ASK_RAISE':
      return logic.askRaise(state);
    case 'SOCIAL_POST':
      return logic.socialPost(state, action.option);
    case 'SIGN_AGENT':
      return logic.signAgent(state, action.agentId);
    case 'FIRE_AGENT':
      return logic.fireAgent(state);
    case 'AGENT_PUSH':
      return logic.agentPush(state);
    case 'SIGN_SPONSOR':
      return logic.signSponsor(state, action.sponsorId);
    case 'DROP_SPONSOR':
      return logic.dropSponsor(state, action.sponsorId);
    case 'ACCEPT_CALLUP':
      return logic.acceptCallUp(state);
    case 'DECLINE_CALLUP':
      return logic.declineCallUp(state);
    case 'LIFE_CHOICE':
      return logic.chooseLife(state, action.index);
    case 'LIFE_DISMISS':
      return logic.dismissLife(state);
    case 'START_MATCHDAY':
      return logic.startMatchday(state);
    case 'PRE_CHOICE':
      return logic.choosePreMatch(state, action.index);
    case 'PRE_CONTINUE':
      return logic.continuePreMatch(state);
    case 'LIVE_ADVANCE':
      return logic.advanceLive(state);
    case 'INGAME_CHOICE':
      return logic.chooseInGame(state, action.index);
    case 'INGAME_CONTINUE':
      return logic.continueInGame(state);
    case 'SUMMARY_CONTINUE':
      return logic.continueSummary(state);
    case 'POST_CHOICE':
      return logic.choosePostMatch(state, action.index);
    case 'POST_CONTINUE':
      return logic.continuePostMatch(state);
    case 'ACCEPT_OFFER':
      return logic.acceptOffer(state, action.offerId);
    case 'DECLINE_OFFERS':
      return logic.declineOffers(state);
    case 'SEASON_CONTINUE':
      return logic.continueSeasonEnd(state);
    case 'CLEAR_TOAST':
      return state.toast ? { ...state, toast: null } : state;
    default:
      return state;
  }
}
