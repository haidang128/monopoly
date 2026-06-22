/**
 * Generates placeholder SFX one-shots into `assets/sounds/` as 16-bit PCM mono
 * WAVs — no dependencies, just synthesized sine tones with an exponential decay
 * envelope. These exist so the sound pipeline is audible end-to-end; replace the
 * files with real royalty-free SFX (same names) when you have them.
 *
 *   node scripts/gen-placeholder-sounds.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// Equal-tempered note frequencies (Hz).
const N = { E4: 329.63, G4: 392, A4: 440, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };

/** Render notes [{ freq, start, dur, decay, gain }] into a mono Float32 buffer. */
function render(notes, totalDur) {
  const n = Math.floor(SR * totalDur);
  const out = new Float32Array(n);
  for (const note of notes) {
    const start = Math.floor(SR * note.start);
    const len = Math.floor(SR * (note.dur ?? 0.25));
    const decay = note.decay ?? 8;
    const gain = note.gain ?? 0.35;
    for (let i = 0; i < len && start + i < n; i++) {
      const t = i / SR;
      out[start + i] += Math.sin(2 * Math.PI * note.freq * t) * Math.exp(-decay * t) * gain;
    }
  }
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i]); // soft-clip
  return out;
}

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits/sample
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

const cues = {
  // dice tumble: two short low blips
  roll: render(
    [
      { freq: 300, start: 0, dur: 0.08, decay: 28, gain: 0.4 },
      { freq: 240, start: 0.085, dur: 0.09, decay: 26, gain: 0.4 },
    ],
    0.2,
  ),
  // purchase: ascending two-note "cha-ching"
  buy: render(
    [
      { freq: N.C5, start: 0, dur: 0.12, decay: 9 },
      { freq: N.G5, start: 0.09, dur: 0.26, decay: 6 },
    ],
    0.36,
  ),
  // card flip: single soft pluck
  card: render([{ freq: N.A5, start: 0, dur: 0.28, decay: 7, gain: 0.3 }], 0.3),
  // trade done: ascending two-note
  trade: render(
    [
      { freq: N.E5, start: 0, dur: 0.12, decay: 9 },
      { freq: N.A5, start: 0.09, dur: 0.26, decay: 6 },
    ],
    0.36,
  ),
  // win fanfare: rising arpeggio C-E-G-C
  win: render(
    [
      { freq: N.C5, start: 0, dur: 0.18, decay: 5 },
      { freq: N.E5, start: 0.12, dur: 0.18, decay: 5 },
      { freq: N.G5, start: 0.24, dur: 0.22, decay: 5 },
      { freq: N.C6, start: 0.36, dur: 0.4, decay: 4 },
    ],
    0.85,
  ),
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(cues)) {
  const file = join(OUT, `${name}.wav`);
  writeFileSync(file, toWav(samples));
  console.log(`wrote ${file} (${(samples.length / SR).toFixed(2)}s)`);
}
