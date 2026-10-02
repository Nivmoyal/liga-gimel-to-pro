import type { GameState } from '../types/game';
import { SAVE_VERSION } from './gameLogic';

const KEY = 'liga-gimel-to-pro:save';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed?.version !== SAVE_VERSION || !parsed.player) return null;
    return { ...parsed, toast: null };
  } catch {
    return null;
  }
}

export function saveGame(state: GameState | null) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage may be unavailable (private mode); the game still works in memory.
  }
}
