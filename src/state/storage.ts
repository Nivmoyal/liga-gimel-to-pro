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

// ------------------------------------------------------------------
// Backup code: the whole career as text that can be copied and pasted back
// ------------------------------------------------------------------

const PLAIN = 'OLIM1:';
const PACKED = 'OLIM2:';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** A text code with the whole career (compressed when the browser can). */
export async function exportSave(state: GameState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...state, toast: null }));
  if (typeof CompressionStream !== 'undefined') {
    try {
      return PACKED + toBase64(await pipe(bytes, new CompressionStream('gzip')));
    } catch {
      // Fall back to the plain code below.
    }
  }
  return PLAIN + toBase64(bytes);
}

/** Reads a backup code; returns null when the code is not a valid career. */
export async function importSave(code: string): Promise<GameState | null> {
  const text = code.trim().replace(/\s+/g, '');
  try {
    let bytes: Uint8Array;
    if (text.startsWith(PACKED)) bytes = await pipe(fromBase64(text.slice(PACKED.length)), new DecompressionStream('gzip'));
    else if (text.startsWith(PLAIN)) bytes = fromBase64(text.slice(PLAIN.length));
    else return null;
    const migrated = migrateSave(JSON.parse(new TextDecoder().decode(bytes)) as GameState);
    return migrated ? { ...migrated, toast: null } : null;
  } catch {
    return null;
  }
}
