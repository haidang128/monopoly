/**
 * Default / web storage backend resolver. On web there is no MMKV, so we back
 * persistence with the browser's `localStorage` — this survives tab close and
 * reload, so the Home "Rejoin room" card (and saved prefs) come back. During
 * static rendering (Node, no DOM) `localStorage` is undefined, so we return null
 * and the caller keeps the in-memory backend. Metro loads
 * `native-backend.native.ts` (MMKV) instead on iOS/Android.
 */
import type { KeyValueBackend } from './index';

export function createNativeBackend(): KeyValueBackend | null {
  if (typeof localStorage === 'undefined') return null;
  return {
    getString: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Quota exceeded / storage blocked (private mode) — persistence is best-effort.
      }
    },
    delete: (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
