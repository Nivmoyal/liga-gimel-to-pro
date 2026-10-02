import type { GameState } from '../types/game';
import { migrateSave } from './gameLogic';

const KEY = 'liga-gimel-to-pro:save';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const migrated = migrateSave(JSON.parse(raw) as GameState);
    return migrated ? { ...migrated, toast: null } : null;
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
