/**
 * Side-effect module: promotes storage to MMKV (native) as early as possible.
 *
 * Import this FIRST — before `@/i18n` or anything that reads a saved preference
 * or save — so those reads hit the persistent backend, not the transient
 * in-memory default.
 */
import { initPersistentStorage } from './index';

initPersistentStorage();
