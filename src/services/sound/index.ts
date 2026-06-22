/**
 * Sound seam. Centralizes SFX behind semantic verbs so the store/screens never
 * import `expo-audio` directly (mirrors `services/haptics` + `services/analytics`).
 *
 * **No-op until assets exist.** Drop royalty-free one-shots into `assets/sounds/`
 * and register them in `ASSETS` below; every cue is a safe no-op while the slot
 * is empty, so callers can fire them from day one. Failures are swallowed — a
 * missing/!decodable file can never break a gameplay action.
 *
 * Cues are emitted centrally from the pass-and-play store's derived-event hook so
 * both local and (later) online clients share one trigger point.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundName = 'roll' | 'buy' | 'card' | 'trade' | 'win';

/**
 * Registry of sound assets. Uncomment + point at real files to enable, e.g.:
 *   roll: require('../../../assets/sounds/roll.mp3'),
 * Each value is a Metro asset module id (the return of `require`).
 */
const ASSETS: Partial<Record<SoundName, number>> = {
  roll: require('../../../assets/sounds/roll.wav'),
  buy: require('../../../assets/sounds/buy.wav'),
  card: require('../../../assets/sounds/card.wav'),
  trade: require('../../../assets/sounds/trade.wav'),
  win: require('../../../assets/sounds/win.wav'),
};

const players = new Map<SoundName, AudioPlayer>();
let configured = false;
let muted = false;

/** Mix with other audio (don't steal focus / pause the user's music) — set once. */
function ensureConfigured(): void {
  if (configured) return;
  configured = true;
  setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: false }).catch(() => {});
}

function playerFor(name: SoundName): AudioPlayer | null {
  const asset = ASSETS[name];
  if (asset == null) return null;
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(asset);
    players.set(name, p);
  }
  return p;
}

function play(name: SoundName): void {
  if (muted) return;
  try {
    ensureConfigured();
    const p = playerFor(name);
    if (!p) return;
    // Restart from the top so rapid repeats (back-to-back rolls) re-trigger.
    Promise.resolve(p.seekTo(0))
      .then(() => p.play())
      .catch(() => {});
  } catch {
    /* never break gameplay over a sound */
  }
}

/** Toggle all SFX (wire to a settings switch later). */
export function setSoundMuted(value: boolean): void {
  muted = value;
}

export const sound = {
  /** Dice settle. */
  roll: () => play('roll'),
  /** Property purchased. */
  buy: () => play('buy'),
  /** Cơ Hội / Khí Vận card revealed. */
  card: () => play('card'),
  /** Trade completed. */
  trade: () => play('trade'),
  /** Game over fanfare. */
  win: () => play('win'),
};
