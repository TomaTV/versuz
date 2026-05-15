#!/usr/bin/env node

/**
 * Versuz Manifesto — sound design generator (event-driven, no bed)
 *
 * Real motion sound design : SFX placed precisely on every visual event in
 * the scene, with breathing room between. No constant music bed (that's
 * what makes synth audio sound like "highway noise"). Pure event-driven.
 *
 * What it generates :
 *   - Risers      : building tension before each act break
 *   - Impacts     : sub-kick + crash on logo reveals, crown moments
 *   - Stamps      : punchy plucks when pillars / tiers / lines appear
 *   - Pips        : terminal command + bench output beeps
 *   - Sweeps      : ascending sine sweeps timed to bench bar fills
 *   - Bells       : bright bell stacks on payoff moments (aggregate, crown)
 *   - Pad accents : SHORT warm pad swells (only at logo reveal + CTA, not
 *                   sustained — that's the bug we just fixed)
 *   - Hi-hats     : sparse filtered-noise ticks for rhythmic punctuation
 *
 * NO VO is rendered. Record on ElevenLabs, mux in 3-input at the end.
 *
 * Run :
 *   node scripts/generate-manifesto-audio.mjs
 *
 * Output : .ads/exports/manifesto/manifesto-audio.wav  (48 kHz stereo · 42s)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".ads", "exports", "manifesto");
const TMP_DIR = path.join(OUT_DIR, "_audio_tmp");

const argMap = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v === undefined ? true : v];
  })
);
const OUT_FILE = path.resolve(argMap.out || path.join(OUT_DIR, "manifesto-audio.wav"));

// ─── ffmpeg helpers ───────────────────────────────────────────────────
function which(bin) {
  const cmd = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(cmd, [bin], { stdio: "pipe" });
  return r.status === 0;
}
if (!which("ffmpeg")) {
  console.error("❌ ffmpeg not in PATH. Install : winget install ffmpeg / brew install ffmpeg");
  process.exit(1);
}

function runFF(args, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg [${label}] exit ${code}\n${stderr.slice(-600)}`))
    );
  });
}

// Synthesize a sound to a file via a single lavfi filter chain.
// `filter` = anything that starts with a lavfi source (sine, anoisesrc,
// aevalsrc...) and ends with a stereo signal. `dur` is the target duration.
async function synth(file, filter, dur) {
  await runFF(["-f", "lavfi", "-i", filter, "-t", String(dur), "-ac", "2", "-ar", "48000", file], path.basename(file));
}

// ─── SFX primitives ───────────────────────────────────────────────────

// PLUCK : sine fundamental + octave + 5th, fast exponential decay → marimba/pluck.
// Stack mimics a percussive instrument harmonics envelope.
async function pluck(file, { freq, dur = 0.7, gain = -12 }) {
  const o = freq;
  const f =
    `sine=frequency=${o}:sample_rate=48000:duration=${dur}[s1];` +
    `sine=frequency=${o * 2}:sample_rate=48000:duration=${dur}[s2];` +
    `sine=frequency=${o * 3}:sample_rate=48000:duration=${dur}[s3];` +
    `[s1][s2][s3]amix=inputs=3:normalize=0,` +
    `volume='exp(-t*${(6 / dur).toFixed(2)})':eval=frame,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// SUB KICK : 90Hz → 40Hz pitch slide with exponential decay. Real kick feel.
async function kick(file, { dur = 0.5, gain = -4 }) {
  const f =
    `aevalsrc='sin(2*PI*(40 + 50*exp(-t*18))*t)':sample_rate=48000:duration=${dur}:channel_layout=mono,` +
    `volume='exp(-t*${(5 / dur).toFixed(2)})':eval=frame,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// CLICK / STAMP : kick + bright transient (hi sine spike) on top.
async function stamp(file, { dur = 0.5, freq = 220, gain = -8 }) {
  const f =
    // sub body
    `aevalsrc='sin(2*PI*(50 + 60*exp(-t*16))*t)':sample_rate=48000:duration=${dur}:channel_layout=mono,` +
    `volume='exp(-t*${(5 / dur).toFixed(2)})':eval=frame[body];` +
    // bright click
    `sine=frequency=${freq * 4}:sample_rate=48000:duration=0.04,volume='exp(-t*60)':eval=frame[click];` +
    // mid tone
    `sine=frequency=${freq}:sample_rate=48000:duration=${dur * 0.7},` +
    `volume='exp(-t*${(8 / dur).toFixed(2)})':eval=frame[tone];` +
    `[body][click][tone]amix=inputs=3:normalize=0:duration=longest,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// PIP / UI BEEP : short sine with sharp envelope. For terminal output.
// Default freq dropped from 1200 → 700 Hz : less piercing, still readable.
async function pip(file, { freq = 700, dur = 0.08, gain = -18 }) {
  const f =
    `sine=frequency=${freq}:sample_rate=48000:duration=${dur},` +
    `volume='min(t*40, exp(-(t-0.02)*${(6 / dur).toFixed(2)}))':eval=frame,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// TAC (mechanical click) : the proper replacement for high-freq "data ticks".
// Layered : brown-noise transient (the "thump" of contact) + brief mid-sine
// resonance (the "body"). Sounds like a wood/key click, not a digital pip.
async function tac(file, { freq = 480, dur = 0.06, gain = -22 }) {
  const f =
    // brown noise transient — the wood impact
    `anoisesrc=color=brown:duration=0.04:sample_rate=48000,` +
    `bandpass=f=1200:width_type=h:w=2400,` +
    `volume='exp(-t*60)':eval=frame[click];` +
    // body resonance — short decaying sine
    `sine=frequency=${freq}:sample_rate=48000:duration=${dur},` +
    `volume='exp(-t*40)':eval=frame[body];` +
    `[click][body]amix=inputs=2:normalize=0:duration=longest,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// CRASH / IMPACT WASH : pink noise (not white — less harsh), highpassed
// at 1000 Hz only (was 2000, which was the sibilant range). Lowpassed at
// 5500 to cut piercing top. Faster decay = less ear fatigue.
async function snare(file, { dur = 0.35, gain = -10 }) {
  const f =
    `anoisesrc=color=pink:duration=${dur}:sample_rate=48000,` +
    `highpass=f=1000,lowpass=f=5500,` +
    `volume='exp(-t*${(10 / dur).toFixed(2)})':eval=frame[n];` +
    `sine=frequency=180:sample_rate=48000:duration=${dur * 0.5},` +
    `volume='exp(-t*14)':eval=frame[body];` +
    `[n][body]amix=inputs=2:normalize=0:duration=longest,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// RISER (up) : LOW-only build — sub-bass swell + low-pass brown noise.
// NO high-freq chirp. The "rise" feeling comes from volume + sub-bass
// frequency lift (40→90Hz), not from a piercing top end. Cinema-style
// air pressure build, not synth movie trailer.
async function riserUp(file, { dur = 1.2, gain = -10 }) {
  const f =
    // sub-bass body sweep 40→90 Hz (felt more than heard)
    `aevalsrc='sin(2*PI*(40 + 50*pow(t/${dur},2))*t)':sample_rate=48000:duration=${dur}:channel_layout=mono,` +
    `volume='pow(t/${dur},1.4)':eval=frame[sub];` +
    // low rumble — brown noise heavily low-passed
    `anoisesrc=color=brown:duration=${dur}:sample_rate=48000,` +
    `lowpass=f=400,` +
    `volume='pow(t/${dur},1.6)*0.8':eval=frame[rumble];` +
    // mid air — pink noise capped at 1.2 kHz (NO top end)
    `anoisesrc=color=pink:duration=${dur}:sample_rate=48000,` +
    `lowpass=f=1200,` +
    `volume='pow(t/${dur},2)*0.3':eval=frame[air];` +
    `[sub][rumble][air]amix=inputs=3:normalize=0,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// DOWN-WHOOSH : descending chirp + low-passed pink noise. Triangular envelope
// so it hits hardest mid-way and dies at the end.
async function whooshDown(file, { dur = 0.7, gain = -12 }) {
  const f =
    `aevalsrc='sin(2*PI*(800 - 600*t/${dur})*t)':sample_rate=48000:duration=${dur}:channel_layout=mono,` +
    `volume='sin(t/${dur}*3.14159)*0.5':eval=frame[tone];` +
    `anoisesrc=color=pink:duration=${dur}:sample_rate=48000,` +
    `lowpass=f=4000,` +
    `volume='sin(t/${dur}*3.14159)':eval=frame[noise];` +
    `[tone][noise]amix=inputs=2:normalize=0,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// SIDE-WHOOSH : pink noise with band-pass (static center), stereo pan for motion.
async function whooshSide(file, { dur = 0.55, gain = -12, panRight = false }) {
  const f =
    `anoisesrc=color=pink:duration=${dur}:sample_rate=48000,` +
    `bandpass=f=2500:width_type=h:w=4000,` +
    `volume='sin(t/${dur}*3.14159)':eval=frame,` +
    (panRight
      ? `pan=stereo|c0=0.25*c0|c1=1.0*c0`
      : `pan=stereo|c0=1.0*c0|c1=0.25*c0`) + "," +
    `volume=${gain}dB`;
  await synth(file, f, dur);
}

// BELL : multi-partial sine stack. Lower default fundamental + softer
// inharmonics + low-passed top partials so it doesn't pierce.
async function bell(file, { freq = 660, dur = 1.4, gain = -18 }) {
  const f =
    `sine=frequency=${freq}:sample_rate=48000:duration=${dur},volume='exp(-t*3)':eval=frame[a];` +
    `sine=frequency=${freq * 2.0}:sample_rate=48000:duration=${dur},volume='exp(-t*4)*0.45':eval=frame[b];` +
    `sine=frequency=${freq * 2.4}:sample_rate=48000:duration=${dur},volume='exp(-t*5)*0.22':eval=frame[c];` +
    // top partial heavily damped — was the source of the piercing edge
    `sine=frequency=${freq * 3.6}:sample_rate=48000:duration=${dur},volume='exp(-t*9)*0.10':eval=frame[d];` +
    `[a][b][c][d]amix=inputs=4:normalize=0,` +
    `lowpass=f=4500,` +
    `aecho=0.6:0.55:80|160:0.35|0.15,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// PAD ACCENT : short warm pad swell (1-2s max, NOT the constant bed of doom).
// Filtered pink noise + low sine, with attack/decay shape.
async function padAccent(file, { dur = 2.0, gain = -22, note = 92.50 }) {
  const f =
    `sine=frequency=${note}:sample_rate=48000:duration=${dur}[lo];` +
    `sine=frequency=${note * 1.5}:sample_rate=48000:duration=${dur},volume=0.5[mid];` +
    `[lo][mid]amix=inputs=2:normalize=0,` +
    `volume='min(t/0.8, max(0, 1-(t-${(dur - 0.6).toFixed(2)})/0.6))':eval=frame,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// SWEEP (up) : single sine tone with frequency sweeping up.
// Used for bench bar fills (ascending = filling up).
async function sweepUp(file, { freqStart = 220, freqEnd = 880, dur = 1.0, gain = -18 }) {
  const f =
    `aevalsrc='sin(2*PI*(${freqStart} + (${freqEnd} - ${freqStart})*t/${dur})*t)':sample_rate=48000:duration=${dur}:channel_layout=mono,` +
    `volume='sin(t/${dur} * 3.14159)^0.7':eval=frame,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// AMBIENT TEXTURE : very quiet filtered noise — only used during act 1 for
// "in space" feel. 4 seconds, fades in/out.
async function ambient(file, { dur = 4, gain = -32 }) {
  const f =
    `anoisesrc=color=brown:duration=${dur}:sample_rate=48000,` +
    `lowpass=f=400,` +
    `volume='min(t/1.5, max(0, 1-(t-${(dur - 1.5).toFixed(2)})/1.5))':eval=frame,` +
    `volume=${gain}dB,aformat=channel_layouts=stereo`;
  await synth(file, f, dur);
}

// ─── Main composition ────────────────────────────────────────────────
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const f = (name) => path.join(TMP_DIR, name + ".wav");

  console.log("🔨 Synthesizing SFX library…");

  // Build the SFX library — every sound the timeline will reference.
  const lib = {};

  // Tension elements
  await ambient(lib.amb1 = f("amb_act1"), { dur: 4.5, gain: -30 });
  await riserUp(lib.riser_long = f("riser_long"), { dur: 1.4, gain: -10 });
  await riserUp(lib.riser_mid = f("riser_mid"), { dur: 0.9, gain: -14 });

  // Impacts — the big moments
  await kick(lib.kick_big = f("kick_big"), { dur: 0.8, gain: -2 });
  await kick(lib.kick_mid = f("kick_mid"), { dur: 0.6, gain: -6 });
  await snare(lib.crash = f("crash"), { dur: 0.45, gain: -8 });
  await padAccent(lib.pad_reveal = f("pad_reveal"), { dur: 3.5, gain: -20, note: 92.5 }); // F#2
  await padAccent(lib.pad_cta = f("pad_cta"), { dur: 5.0, gain: -19, note: 92.5 });

  // Stamps — pillars / tiers / payoffs
  await stamp(lib.stamp_lo = f("stamp_lo"), { freq: 185, dur: 0.5, gain: -8 });
  await stamp(lib.stamp_mid = f("stamp_mid"), { freq: 246, dur: 0.5, gain: -8 });
  await stamp(lib.stamp_hi = f("stamp_hi"), { freq: 330, dur: 0.5, gain: -8 });

  // Plucks — sparse melodic moments. Boosted ~3 dB so they cut through.
  await pluck(lib.pluck_f3 = f("pluck_f3"), { freq: 185, dur: 0.6, gain: -13 });   // F#3
  await pluck(lib.pluck_a3 = f("pluck_a3"), { freq: 233, dur: 0.6, gain: -13 });   // A#3
  await pluck(lib.pluck_c4 = f("pluck_c4"), { freq: 277, dur: 0.6, gain: -13 });   // C#4
  await pluck(lib.pluck_f4 = f("pluck_f4"), { freq: 370, dur: 0.9, gain: -11 });   // F#4

  // Bells — payoff chimes. bell_hi dropped from 880 → 700 Hz fundamental.
  // Both passed through a -3 dB lowshelf style softening inside bell().
  await bell(lib.bell_hi = f("bell_hi"), { freq: 700, dur: 1.6, gain: -14 });
  await bell(lib.bell_lo = f("bell_lo"), { freq: 500, dur: 1.4, gain: -15 });

  // Pips — terminal UI, mid-low frequencies, audible without piercing.
  await pip(lib.pip_ok = f("pip_ok"), { freq: 700, dur: 0.08, gain: -16 });
  await pip(lib.pip_alert = f("pip_alert"), { freq: 480, dur: 0.10, gain: -16 });

  // Tacs — mechanical clicks. Boosted further so they're clearly audible
  // through the master compression / low-pass cap.
  await tac(lib.tac_lo = f("tac_lo"), { freq: 380, dur: 0.06, gain: -18 });
  await tac(lib.tac_hi = f("tac_hi"), { freq: 540, dur: 0.05, gain: -19 });

  // Counter tacs — 6 ascending pitches to convey "number going UP".
  // Each pair of counter ticks uses the next pitch up : 240 → 280 → 330 →
  // 390 → 460 → 540 Hz. Reads as a clear ascending sequence in 3.4s.
  await tac(lib.counter_1 = f("counter_1"), { freq: 240, dur: 0.06, gain: -20 });
  await tac(lib.counter_2 = f("counter_2"), { freq: 280, dur: 0.06, gain: -20 });
  await tac(lib.counter_3 = f("counter_3"), { freq: 330, dur: 0.06, gain: -19 });
  await tac(lib.counter_4 = f("counter_4"), { freq: 390, dur: 0.06, gain: -19 });
  await tac(lib.counter_5 = f("counter_5"), { freq: 460, dur: 0.06, gain: -18 });
  await tac(lib.counter_6 = f("counter_6"), { freq: 540, dur: 0.07, gain: -17 });
  // Counter "lock" — the final tick when the number settles. Slightly
  // longer body sine + soft kick for satisfying landing.
  await stamp(lib.counter_lock = f("counter_lock"), { freq: 220, dur: 0.45, gain: -14 });

  // Whooshes — transitions
  await whooshDown(lib.whoosh_down = f("whoosh_down"), { dur: 0.65, gain: -12 });
  await whooshSide(lib.whoosh_L = f("whoosh_L"), { dur: 0.5, gain: -14, panRight: false });
  await whooshSide(lib.whoosh_R = f("whoosh_R"), { dur: 0.5, gain: -14, panRight: true });

  // Sweeps — bench bar fills (different start/end pitches per bar)
  await sweepUp(lib.sweep_b1 = f("sweep_b1"), { freqStart: 220, freqEnd: 440, dur: 1.0, gain: -20 });
  await sweepUp(lib.sweep_b2 = f("sweep_b2"), { freqStart: 277, freqEnd: 554, dur: 1.1, gain: -20 });
  await sweepUp(lib.sweep_b3 = f("sweep_b3"), { freqStart: 330, freqEnd: 660, dur: 1.2, gain: -20 });
  await sweepUp(lib.sweep_b4 = f("sweep_b4"), { freqStart: 370, freqEnd: 880, dur: 1.3, gain: -18 });

  // Tonal rises — climb (4 ascending notes)
  await sweepUp(lib.climb_1 = f("climb_1"), { freqStart: 277, freqEnd: 370, dur: 0.4, gain: -18 });
  await sweepUp(lib.climb_2 = f("climb_2"), { freqStart: 330, freqEnd: 440, dur: 0.4, gain: -16 });
  await sweepUp(lib.climb_3 = f("climb_3"), { freqStart: 415, freqEnd: 554, dur: 0.4, gain: -14 });
  await sweepUp(lib.climb_4 = f("climb_4"), { freqStart: 494, freqEnd: 740, dur: 0.5, gain: -12 });

  console.log("🎚 Composing timeline (event-driven, no constant bed)…");

  // ── THE TIMELINE ──
  // Each entry : { at: seconds, file: path, gain?: dB-tweak }
  // gain is an additional offset applied at mix time (in addition to the
  // gain that was baked into the file by synthesis).
  const timeline = [];

  // ═════ ACT 1 — THE PROBLEM (0–4s) ═════
  timeline.push({ at: 0.0, file: lib.amb1 });                       // ambient hum starts
  // Counter ticks — ASCENDING pitch sequence reads as "number going UP".
  // 12 ticks across 0.4 → 3.35s : 6 pitches × 2 ticks each.
  // Ticks accelerate subtly at the end (last 4 spaced 0.20s vs 0.25s
  // earlier) → conveys "approaching final value".
  const counterTicks = [
    lib.counter_1, lib.counter_1,
    lib.counter_2, lib.counter_2,
    lib.counter_3, lib.counter_3,
    lib.counter_4, lib.counter_4,
    lib.counter_5, lib.counter_5,
    lib.counter_6, lib.counter_6,
  ];
  let counterT = 0.4;
  for (let i = 0; i < 12; i++) {
    timeline.push({ at: counterT, file: counterTicks[i] });
    counterT += i < 8 ? 0.26 : 0.20;                                 // slight accel at the end
  }
  // Lock — the final settle sound when the counter visually stops at 3.4s
  timeline.push({ at: 3.40, file: lib.counter_lock });
  timeline.push({ at: 2.4, file: lib.riser_long });                 // headline reveal + tension toward act 2

  // ═════ ACT 2 — THE REVEAL (4–9s) ═════
  // Big silence 3.8-5.4 (only riser tail) — anticipation
  timeline.push({ at: 5.40, file: lib.kick_big });                  // IMPACT
  timeline.push({ at: 5.40, file: lib.crash });                     // crash on top
  timeline.push({ at: 5.45, file: lib.pad_reveal });                // warm pad SHORT swell (3.5s)
  // 4-note minor arpeggio on the mark assemble
  timeline.push({ at: 5.70, file: lib.pluck_f3 });
  timeline.push({ at: 6.10, file: lib.pluck_a3 });
  timeline.push({ at: 6.55, file: lib.pluck_c4 });
  timeline.push({ at: 7.00, file: lib.pluck_f4, gain: -2 });        // wordmark — clear
  timeline.push({ at: 7.00, file: lib.bell_hi, gain: -3 });         // shimmer on wordmark
  timeline.push({ at: 8.50, file: lib.pluck_a3, gain: -8 });        // soft tagline accent (was hat_open — too sibilant)

  // ═════ ACT 3 — HOW IT WORKS (9–15s) ═════
  timeline.push({ at: 8.85, file: lib.whoosh_down });               // transition into act 3
  // 3 stamps when pillars appear (ascending pitch = building structure)
  timeline.push({ at: 9.80, file: lib.stamp_lo });                  // pillar 1
  timeline.push({ at: 10.02, file: lib.stamp_mid });                // pillar 2
  timeline.push({ at: 10.24, file: lib.stamp_hi });                 // pillar 3
  // sparse low pulse during the explainer — heart-beat like, not hi-hats.
  // Pluck at very low gain provides ambient rhythm without piercing top end.
  for (let i = 0; i < 4; i++) {
    timeline.push({ at: 11.0 + i * 1.0, file: lib.pluck_f3, gain: -22 });
  }

  // ═════ ACT 4 — LIVE BENCH (15–22s) ═════
  timeline.push({ at: 14.85, file: lib.whoosh_L });                 // wipe into terminal
  // typewriter ticks — proper mechanical tacs, not piercing pips
  for (let i = 0; i < 30; i++) {
    timeline.push({ at: 15.0 + i * 0.04, file: i % 2 ? lib.tac_lo : lib.tac_hi });
  }
  // confirm pips on each output line (offsets 0.45, 0.85, 1.20 after cmd end at ~16.4)
  timeline.push({ at: 16.85, file: lib.pip_ok });                   // skill packaged
  timeline.push({ at: 17.25, file: lib.pip_ok });                   // uploaded
  timeline.push({ at: 17.60, file: lib.pip_alert });                // running 4 suites…
  // 4 bench bars filling (scene timecodes : 17.0+2.0, 17.0+2.3, 17.0+2.6, 17.0+2.9)
  timeline.push({ at: 17.0, file: lib.sweep_b1 });
  timeline.push({ at: 17.3, file: lib.sweep_b2 });
  timeline.push({ at: 17.6, file: lib.sweep_b3 });
  timeline.push({ at: 17.9, file: lib.sweep_b4 });
  // bar-complete ticks
  timeline.push({ at: 18.0, file: lib.pip_ok });
  timeline.push({ at: 18.4, file: lib.pip_ok });
  timeline.push({ at: 18.8, file: lib.pip_ok });
  timeline.push({ at: 19.2, file: lib.pip_ok });
  // payoff : aggregate reveals at scene t=19.6
  timeline.push({ at: 19.55, file: lib.kick_mid });
  timeline.push({ at: 19.55, file: lib.bell_lo });

  // ═════ ACT 5 — CLIMB (22–28s) ═════
  timeline.push({ at: 21.85, file: lib.whoosh_R });                 // wipe into climb
  // climb starts at scene t=23.2, 4 ascending tonal rises as ranks shuffle
  timeline.push({ at: 23.2, file: lib.climb_1 });
  timeline.push({ at: 23.8, file: lib.climb_2 });
  timeline.push({ at: 24.4, file: lib.climb_3 });
  timeline.push({ at: 25.0, file: lib.climb_4 });
  // CROWN payoff at scene t=25.5
  timeline.push({ at: 25.45, file: lib.kick_big, gain: -4 });
  timeline.push({ at: 25.45, file: lib.bell_hi });

  // ═════ ACT 6 — TIERS (28–34s) ═════
  timeline.push({ at: 27.85, file: lib.whoosh_L });                 // wipe
  // 3 tier cards reveal ascending
  timeline.push({ at: 28.80, file: lib.stamp_lo });
  timeline.push({ at: 28.98, file: lib.stamp_mid });
  timeline.push({ at: 29.16, file: lib.stamp_hi });
  // sparse low pulse instead of hi-hat groove (warmer, doesn't pierce)
  for (let i = 0; i < 4; i++) {
    timeline.push({ at: 30.0 + i * 1.0, file: lib.pluck_a3, gain: -22 });
  }

  // ═════ ACT 7 — CTA (34–42s) ═════
  timeline.push({ at: 33.75, file: lib.riser_mid });                // build into CTA
  timeline.push({ at: 34.30, file: lib.kick_big, gain: -3 });       // CTA impact
  timeline.push({ at: 34.30, file: lib.pad_cta });                  // warm pad held through CTA
  // 4-note ascending closure (F# minor scale arpeggio)
  timeline.push({ at: 34.60, file: lib.pluck_f3 });
  timeline.push({ at: 35.00, file: lib.pluck_a3 });
  timeline.push({ at: 35.50, file: lib.pluck_c4 });
  timeline.push({ at: 36.10, file: lib.pluck_f4 });                 // wordmark — softer payoff
  timeline.push({ at: 36.40, file: lib.bell_lo, gain: -6 });        // gentle shimmer (was bell_hi, too sharp)
  timeline.push({ at: 37.20, file: lib.pluck_f3, gain: -4 });       // cmd reveal — warm pluck not hat
  timeline.push({ at: 38.50, file: lib.bell_lo, gain: -8 });        // domain reveal — softest bell
  // final tail : warm low pluck instead of high pip (which was piercing)
  timeline.push({ at: 40.50, file: lib.pluck_f3, gain: -10 });

  console.log(`   ${timeline.length} sound events placed across 42s`);

  // ── Build the final amix filter graph ──
  // Each timeline entry becomes one input. adelay places it at its time.
  const inputs = timeline.map((t) => t.file);
  const labels = timeline.map((_, i) => `[e${i}]`);
  const filterParts = [];

  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];
    const ms = Math.round(t.at * 1000);
    const gainAdj = t.gain != null ? `,volume=${t.gain}dB` : "";
    const inputLabel = `[${i}:a]`;
    if (ms === 0) {
      filterParts.push(`${inputLabel}aformat=channel_layouts=stereo${gainAdj}${labels[i]}`);
    } else {
      filterParts.push(`${inputLabel}aformat=channel_layouts=stereo,adelay=${ms}|${ms}${gainAdj}${labels[i]}`);
    }
  }

  // Sum + master bus :
  //   1. amix everything
  //   2. light compression to glue elements together
  //   3. SHORT room reverb (aecho with 3 taps) — adds depth, no obvious echo
  //   4. lowpass at 12kHz — tames any residual sibilance from hi-hats
  //   5. high-shelf attenuation around 8kHz — softens piercing edge
  //   6. brick-wall limiter at 0.95
  filterParts.push(
    `${labels.join("")}amix=inputs=${labels.length}:duration=longest:dropout_transition=0:normalize=0[sum]`
  );
  filterParts.push(
    `[sum]` +
    // Less aggressive comp so transients (kicks, plucks) keep their punch
    `acompressor=threshold=0.6:ratio=2.5:attack=20:release=200:makeup=3,` +
    // Short room reverb — adds depth, no obvious tail
    `aecho=0.6:0.4:30|60|120:0.30|0.15|0.07,` +
    // De-harshness band : -2.5 dB notch at 3.5 kHz (sibilance zone)
    `equalizer=f=3500:t=q:w=1.0:g=-2.5,` +
    // Tame the top — lowpass at 9 kHz hard cuts anything piercing
    // (legitimate musical content lives below 8 kHz; above is mostly
    //  sibilance / hat residue)
    `lowpass=f=9000,` +
    // Brick-wall the peaks
    `alimiter=limit=0.95:level=disabled,` +
    `atrim=duration=42,aformat=channel_layouts=stereo[out]`
  );

  const ffArgs = [];
  for (const inp of inputs) ffArgs.push("-i", inp);
  ffArgs.push(
    "-filter_complex", filterParts.join(";"),
    "-map", "[out]",
    "-c:a", "pcm_s16le",
    "-ar", "48000",
    OUT_FILE
  );

  console.log(`   Rendering master → ${path.relative(ROOT, OUT_FILE)}…`);
  await runFF(ffArgs, "master");

  console.log("");
  console.log(`✓ Sound design rendered : ${path.relative(ROOT, OUT_FILE)}`);
  console.log("");
  console.log("Preview (bed + video, no VO yet) :");
  console.log("");
  const vid = path.relative(ROOT, path.join(OUT_DIR, "manifesto.mp4")).replace(/\\/g, "/");
  const bed = path.relative(ROOT, OUT_FILE).replace(/\\/g, "/");
  const prev = path.relative(ROOT, path.join(OUT_DIR, "manifesto-bed-only.mp4")).replace(/\\/g, "/");
  // IMPORTANT : explicit -map flags + matching -ar/-ac. Without them, ffmpeg's
  // auto-stream-selection picks the audio at 0 kb/s and the AAC encoder
  // produces silence. Don't apply `loudnorm` here either — single-pass
  // loudnorm on near-clipping input (our wav peaks at -0.4 dB) over-attenuates
  // to -91 dB. The bed is already mastered with acompressor + alimiter.
  console.log(`  ffmpeg -y -i ${vid} -i ${bed} \\`);
  console.log(`    -map 0:v:0 -map 1:a:0 \\`);
  console.log(`    -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest \\`);
  console.log(`    ${prev}`);
  console.log("");
  console.log("Then record VO on ElevenLabs (script in .ads/manifesto-sound-design.md)");
  console.log("and use the 3-input mux command in that doc for the final master.");
  console.log("");
}

main().catch((err) => {
  console.error(`\n❌ ${err.stack || err.message}\n`);
  process.exit(1);
});
