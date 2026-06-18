/**
 * Local storage seam.
 *
 * All persistence goes through this interface so the concrete backend is
 * swappable: an in-memory backend is the default (works everywhere, including
 * tests and Expo Go), and the native build swaps in MMKV via
 * {@link setStorageBackend} without touching call sites.
 *
 * Saved game state is **versioned**. `GameState`'s shape will evolve; an
 * un-versioned save would corrupt every user's game on the next schema change.
 * On a version mismatch we discard (and could migrate) rather than crash.
 */
import type { GameState } from '@monopoly/engine';

export interface KeyValueBackend {
  getString(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
}

/** Default backend: in-memory. Survives a session, not a cold start. */
function createMemoryBackend(): KeyValueBackend {
  const map = new Map<string, string>();
  return {
    getString: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
    },
    delete: (k) => {
      map.delete(k);
    },
  };
}

let backend: KeyValueBackend = createMemoryBackend();

/**
 * Swap the storage backend. The native build calls this once at startup with an
 * MMKV-backed implementation:
 *
 *   import { MMKV } from 'react-native-mmkv';
 *   const mmkv = new MMKV();
 *   setStorageBackend({ getString: k => mmkv.getString(k) ?? null,
 *                        set: (k,v) => mmkv.set(k,v), delete: k => mmkv.delete(k) });
 */
export function setStorageBackend(next: KeyValueBackend): void {
  backend = next;
}

// --- typed key/value helpers ------------------------------------------------

export function getItem(key: string): string | null {
  return backend.getString(key);
}
export function setItem(key: string, value: string): void {
  backend.set(key, value);
}
export function removeItem(key: string): void {
  backend.delete(key);
}

// --- versioned pass-and-play save ------------------------------------------

const SAVE_KEY = 'game.passAndPlay';
const SAVE_SCHEMA_VERSION = 1;

interface SaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  state: GameState;
}

export function savePassAndPlay(state: GameState): void {
  const envelope: SaveEnvelope = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    state,
  };
  setItem(SAVE_KEY, JSON.stringify(envelope));
}

/** Returns the saved game, or null if absent / from an incompatible version. */
export function loadPassAndPlay(): GameState | null {
  const raw = getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION) {
      // No migration path defined yet → discard rather than risk a corrupt load.
      removeItem(SAVE_KEY);
      return null;
    }
    return envelope.state;
  } catch {
    removeItem(SAVE_KEY);
    return null;
  }
}

export function clearPassAndPlay(): void {
  removeItem(SAVE_KEY);
}

// --- preferences ------------------------------------------------------------

const LANG_KEY = 'prefs.language';
export function getSavedLanguage(): string | null {
  return getItem(LANG_KEY);
}
export function saveLanguage(lang: string): void {
  setItem(LANG_KEY, lang);
}
