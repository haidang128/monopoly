/**
 * Default / web storage backend resolver. On web (and any platform without a
 * `.native` override) there is no MMKV, so we keep the in-memory backend.
 * Metro loads `native-backend.native.ts` instead on iOS/Android.
 */
import type { KeyValueBackend } from './index';

export function createNativeBackend(): KeyValueBackend | null {
  return null;
}
