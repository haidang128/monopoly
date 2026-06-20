/**
 * Native (iOS/Android) storage backend: MMKV. Used on native only — Metro picks
 * the `.native.ts` variant here and the `.ts` web fallback elsewhere, so the
 * web bundle never imports `react-native-mmkv`.
 *
 * Returns `null` (→ keep the in-memory backend) if MMKV can't initialize, e.g.
 * in Expo Go where the native module isn't linked. The dev client / EAS build
 * gets real persistence.
 */
import { createMMKV } from 'react-native-mmkv';

import type { KeyValueBackend } from './index';

export function createNativeBackend(): KeyValueBackend | null {
  try {
    const mmkv = createMMKV({ id: 'cotyphu' });
    return {
      getString: (k) => mmkv.getString(k) ?? null,
      set: (k, v) => mmkv.set(k, v),
      delete: (k) => {
        mmkv.remove(k);
      },
    };
  } catch {
    return null;
  }
}
