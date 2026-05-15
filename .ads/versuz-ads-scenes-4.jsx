// =====================================================================
// Versuz Motion — Manifesto · Full anthem
// 1920×1080 · 42s · the showpiece presentation ad.
//
// Tells the full story :
//   ACT 1 (0–4s)    THE PROBLEM — "1M+ SKILL.md on GitHub. Which one works?"
//   ACT 2 (4–9s)    VERSUZ — files converge → brand reveal + tagline
//   ACT 3 (9–15s)   HOW IT WORKS — 3 numbered pillars (SUBMIT / JUDGE / RANK)
//   ACT 4 (15–22s)  LIVE BENCH — terminal + 4 bench bars filling
//   ACT 5 (22–28s)  CLIMB — leaderboard #4 → #1, crown
//   ACT 6 (28–34s)  WHAT YOU GET — three tiers (free / premium / featured)
//   ACT 7 (34–42s)  CTA — install command + versuz.dev
//
// Only 4 geometric shape primitives are used throughout : CIRCLE, SQUARE,
// TRIANGLE, SEMI-CIRCLE. No ribbons, no thin bars, no rays.
// =====================================================================

const {
  Stage, Sprite, useTime, useSprite,
  Easing, animate, clamp,
  VersuzMark, EmberStar, VersuzWordmark,
  EMBER_PATH, V_PATH,
} = window;

// ─── Palette ──────────────────────────────────────────────────────────
const BONE   = '#F2EEE6';
const PAPER  = '#ECE7DD';
const INK    = '#151411';
const INK_DEEP = '#0E0D0B';
const INK2   = '#6B6557';
const EMBER  = '#C2410C';
const SAGE   = '#3F7D4F';
const AMBER  = '#D69E2E';
const AZURE  = '#2A5FA8';
const CRIMSON = '#A52828';

// ─── Helpers ──────────────────────────────────────────────────────────
function seedRand(seed) {
  return function next() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// ─── Shape primitives (the only 4 brand shapes) ───────────────────────
function ShapeCircle({ size, color, opacity = 1 }) {
  return <div style={{
    width: size, height: size, borderRadius: '50%',
    background: color, opacity,
  }}/>;
}

function ShapeSquare({ size, color, rot = 0, opacity = 1 }) {
  return <div style={{
    width: size, height: size,
    background: color,
    transform: `rotate(${rot}deg)`,
    opacity,
  }}/>;
}

function ShapeTriangle({ size, color, rot = 0, opacity = 1 }) {
  const half = size / 2;
  return (
    <div style={{
      width: 0, height: 0,
      borderLeft: `${half}px solid transparent`,
      borderRight: `${half}px solid transparent`,
      borderBottom: `${size * 0.866}px solid ${color}`,
      transform: `rotate(${rot}deg)`,
      transformOrigin: `${half}px ${size * 0.5}px`,
      opacity,
    }}/>
  );
}

// Top half of a circle (flat side down). rot rotates around the flat-side
// midpoint so the half-circle can point any direction.
function ShapeSemiCircle({ size, color, rot = 0, opacity = 1 }) {
  return (
    <div style={{
      width: size, height: size / 2,
      background: color,
      borderRadius: `${size / 2}px ${size / 2}px 0 0`,
      transform: `rotate(${rot}deg)`,
      transformOrigin: `${size / 2}px ${size / 2}px`,
      opacity,
    }}/>
  );
}

function Shape({ type, size, color, rot = 0, opacity = 1 }) {
  if (type === 'circle')    return <ShapeCircle    size={size} color={color} opacity={opacity}/>;
  if (type === 'square')    return <ShapeSquare    size={size} color={color} rot={rot} opacity={opacity}/>;
  if (type === 'triangle')  return <ShapeTriangle  size={size} color={color} rot={rot} opacity={opacity}/>;
  if (type === 'semicircle')return <ShapeSemiCircle size={size} color={color} rot={rot} opacity={opacity}/>;
  return null;
}

// 24 shapes for swarm/converge sequences. Stable deterministic params.
const SWARM = (function build() {
  const rand = seedRand(20260515);
  const types = ['circle', 'square', 'triangle', 'semicircle'];
  const colors = [EMBER, AMBER, AZURE, SAGE];
  const arr = [];
  for (let i = 0; i < 24; i++) {
    arr.push({
      i,
      type: types[i % 4],
      color: colors[i % 4],
      angle: (i / 24) * Math.PI * 2 + rand() * 0.4,
      orbit: 360 + rand() * 380,
      size: 60 + rand() * 70,
      rotInit: rand() * 360,
      rotSpeed: (rand() - 0.5) * 200,
      delay: rand() * 0.6,
      speed: 0.35 + rand() * 0.5,
      offset: rand() * Math.PI * 2,
    });
  }
  return arr;
})();

// 20 file-icon "papers" that fall during Act 1 (the problem). Each one
// has a "filename" label like CLAUDE.md or SKILL.md.
const FALLING_FILES = (function build() {
  const rand = seedRand(778);
  const filenames = ['SKILL.md', 'CLAUDE.md', 'skill.md', 'AGENTS.md', 'SKILL.md', 'CLAUDE.md'];
  const arr = [];
  for (let i = 0; i < 18; i++) {
    arr.push({
      i,
      name: filenames[i % filenames.length],
      x: 80 + rand() * 1760,
      delay: rand() * 3.0,
      drift: (rand() - 0.5) * 60,
      rot: (rand() - 0.5) * 30,
      rotSpeed: (rand() - 0.5) * 24,
      size: 110 + rand() * 50,
      tone: rand() > 0.5 ? 'light' : 'dark',
    });
  }
  return arr;
})();

// ─── Small atoms ──────────────────────────────────────────────────────
function MonoCap({ text, x, y, size = 14, color = INK2, weight = 400, opacity = 1, right }) {
  return (
    <div style={{
      position: 'absolute',
      left: right == null ? x : undefined,
      right: right,
      top: y,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: size, fontWeight: weight,
      letterSpacing: '0.20em', textTransform: 'uppercase',
      color, opacity,
    }}>{text}</div>
  );
}

function BrandStripe({ progress = 1, top = 0, height = 12 }) {
  return (
    <div style={{
      position: 'absolute', top, left: 0, right: 0, height,
      display: 'flex',
      transform: `scaleX(${progress})`, transformOrigin: 'left',
    }}>
      <div style={{ flex: 1.4, background: EMBER }}/>
      <div style={{ flex: 1, background: AMBER }}/>
      <div style={{ flex: 1, background: AZURE }}/>
      <div style={{ flex: 1, background: SAGE }}/>
    </div>
  );
}

function FrameTicks({ inset = 36, color = INK, size = 18, thick = 2, opacity = 1 }) {
  const arms = [
    { top: inset, left: inset,    borderTop: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    { top: inset, right: inset,   borderTop: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
    { bottom: inset, left: inset, borderBottom: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    { bottom: inset, right: inset, borderBottom: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
  ];
  return (
    <>
      {arms.map((s, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', width: size, height: size, opacity, ...s,
        }}/>
      ))}
    </>
  );
}

// "Document icon" used during act 1 — a small rectangle styled like a file
// card with a filename label. NOT a generic shape : its visual purpose is
// to evoke "files on GitHub", a literal thing.
function FileCard({ name, size = 130, tone = 'dark' }) {
  const bg = tone === 'dark' ? '#1A1814' : '#EAE5DA';
  const fg = tone === 'dark' ? '#E2DACB' : INK;
  const accent = tone === 'dark' ? EMBER : EMBER;
  return (
    <div style={{
      width: size, height: size * 1.32,
      background: bg,
      border: `1px solid ${tone === 'dark' ? 'rgba(242,238,230,0.10)' : 'rgba(20,18,14,0.18)'}`,
      padding: 12,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
    }}>
      <div>
        <div style={{
          width: 16, height: 16,
          background: accent,
          marginBottom: 10,
        }}/>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: size * 0.10, fontWeight: 500,
          color: fg, letterSpacing: '0.02em',
          lineHeight: 1.15,
          wordBreak: 'break-word',
        }}>{name}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[0.8, 0.6, 0.7, 0.5].map((w, i) => (
          <div key={i} style={{
            height: 2,
            width: `${w * 100}%`,
            background: tone === 'dark' ? 'rgba(242,238,230,0.18)' : 'rgba(20,18,14,0.20)',
          }}/>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 1 — THE PROBLEM (0–4s)
// "1,247,832 SKILL.md files on GitHub. Which one actually works?"
// Visual : 18 file cards drift down from above, ticking counter, ember
// question mark glows in center.
// ═════════════════════════════════════════════════════════════════════
function ActProblem({ t }) {
  if (t > 4.4) return null;
  const exit = clamp((t - 4.0) / 0.4, 0, 1);
  const op = 1 - exit;

  // counter ticks 0.4 → 3.4: 47 → 1,247,832
  const counterP = Easing.easeOutCubic(clamp((t - 0.4) / 3.0, 0, 1));
  const value = Math.floor(47 + (1247832 - 47) * counterP);
  const valueText = value.toLocaleString('en-US');

  // headline reveal 2.4 → 3.4
  const headP = Easing.easeOutCubic(clamp((t - 2.4) / 1.0, 0, 1));

  // top caption
  const capP = Easing.easeOutCubic(clamp(t / 0.6, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, background: INK_DEEP, overflow: 'hidden' }}>
      {/* faint grid */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }}/>

      {/* falling file cards */}
      {FALLING_FILES.map((f) => {
        const enter = clamp((t - f.delay) / 0.6, 0, 1);
        if (enter <= 0) return null;
        const fall = (t - f.delay) * 120; // 120px/s drift down
        const y = -200 + fall;
        if (y > 1280) return null;
        const op = enter * (1 - clamp((y - 1000) / 280, 0, 1)) * 0.85;
        return (
          <div key={f.i} aria-hidden style={{
            position: 'absolute',
            left: f.x + Math.sin(t * 0.5 + f.i) * f.drift,
            top: y,
            transform: `rotate(${f.rot + f.rotSpeed * (t - f.delay)}deg)`,
            opacity: op,
          }}>
            <FileCard name={f.name} size={f.size} tone={f.tone}/>
          </div>
        );
      })}

      {/* center counter */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 360,
        textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
        fontSize: 200, lineHeight: 1, letterSpacing: '-0.03em',
        color: BONE,
        textShadow: '0 0 80px rgba(194,65,12,0.4)',
      }}>{valueText}</div>

      <div style={{
        position: 'absolute', left: 0, right: 0, top: 580,
        textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 24, letterSpacing: '0.32em', textTransform: 'uppercase',
        color: 'rgba(242,238,230,0.55)',
      }}>SKILL.md & CLAUDE.md on GitHub</div>

      {/* big question headline */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 140,
        textAlign: 'center',
        fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
        fontSize: 110, lineHeight: 1, letterSpacing: '-0.02em',
        color: BONE,
        opacity: headP,
        transform: `translateY(${(1 - headP) * 14}px)`,
      }}>
        Which one actually <span style={{ color: EMBER }}>works</span>?
      </div>

      <MonoCap text="versuz // the problem" x={80} y={80} size={14}
        color="rgba(242,238,230,0.45)" opacity={capP}/>
      <MonoCap text="open public benchmark" right={80} y={80} size={14}
        color="rgba(242,238,230,0.30)" opacity={capP}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 2 — VERSUZ (4–9s)
// Shapes converge from edges → impact → mark assembles → wordmark
// "Versuz. The arena for AI agent skills."
// ═════════════════════════════════════════════════════════════════════
function ActReveal({ t }) {
  if (t < 3.8 || t > 9.6) return null;
  const enter = clamp((t - 3.8) / 0.4, 0, 1);
  const exit  = clamp((t - 9.2) / 0.4, 0, 1);
  const op    = enter * (1 - exit);

  // shapes flying inward 4.0 → 5.4
  const convP = Easing.easeInQuart(clamp((t - 4.0) / 1.4, 0, 1));

  // impact flash 5.4 → 5.9
  const flashP = clamp((t - 5.4) / 0.5, 0, 1);
  const flashOp = flashP > 0 && flashP < 1 ? Math.sin(flashP * Math.PI) : 0;

  // shockwave rings 5.4 → 7.0
  const shockP = clamp((t - 5.4) / 1.6, 0, 1);

  // mark 5.5 → 7.5
  const markP = Easing.easeOutCubic(clamp((t - 5.5) / 2.0, 0, 1));

  // wordmark 7.0 → 8.0
  const wordP = Easing.easeOutCubic(clamp((t - 7.0) / 1.0, 0, 1));

  // tagline 7.8 → 8.6
  const tagP = Easing.easeOutCubic(clamp((t - 7.8) / 0.8, 0, 1));

  // shapes EXPLODING OUTWARD after impact (5.5 → 8.5)
  const burstP = clamp((t - 5.5) / 3.0, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, background: INK_DEEP, overflow: 'hidden' }}>
      {/* converging shapes — fly INTO the logo */}
      {convP > 0 && convP < 1 && SWARM.map((s) => {
        const localStart = clamp((t - 4.0 - s.delay * 0.5) / 1.0, 0, 1);
        if (localStart <= 0) return null;
        const r = s.orbit * (1 - Easing.easeInQuart(localStart));
        const x = 960 + Math.cos(s.angle) * r;
        const y = 540 + Math.sin(s.angle) * r * 0.78;
        const scale = 1 - 0.4 * localStart;
        const opS = (1 - localStart * 0.85);
        return (
          <div key={`c-${s.i}`} aria-hidden style={{
            position: 'absolute', left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: opS,
          }}>
            <Shape type={s.type} size={s.size} color={s.color} rot={s.rotInit + localStart * s.rotSpeed}/>
          </div>
        );
      })}

      {/* impact flash */}
      {flashOp > 0 && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(255,247,224,0.95) 0%, rgba(194,65,12,0.4) 30%, transparent 65%)',
          opacity: flashOp,
          mixBlendMode: 'screen',
        }}/>
      )}

      {/* shockwave rings */}
      {shockP > 0 && shockP < 1 && [0, 1, 2].map((ring) => {
        const local = clamp((shockP - ring * 0.18) / 0.6, 0, 1);
        if (local <= 0) return null;
        return (
          <div key={`ring-${ring}`} aria-hidden style={{
            position: 'absolute', left: 960, top: 540,
            width: 80, height: 80, marginLeft: -40, marginTop: -40,
            borderRadius: '50%',
            border: `${ring === 0 ? 3 : 1.5}px solid ${ring === 0 ? EMBER : (ring === 1 ? AMBER : AZURE)}`,
            opacity: (1 - local) * 0.65,
            transform: `scale(${1 + local * 24})`,
          }}/>
        );
      })}

      {/* shapes BURSTING outward after impact */}
      {burstP > 0 && SWARM.map((s) => {
        const local = clamp((burstP - s.delay * 0.1) / 0.95, 0, 1);
        if (local <= 0) return null;
        const r = local * 1200;
        const x = 960 + Math.cos(s.angle + Math.PI) * r;
        const y = 540 + Math.sin(s.angle + Math.PI) * r * 0.85;
        const opS = (1 - local * local) * 0.9;
        return (
          <div key={`b-${s.i}`} aria-hidden style={{
            position: 'absolute', left: x, top: y,
            transform: 'translate(-50%, -50%)',
            opacity: opS,
          }}>
            <Shape type={s.type} size={s.size * 0.85} color={s.color}
              rot={s.rotInit + local * s.rotSpeed * 2}/>
          </div>
        );
      })}

      {/* warm halo */}
      {markP > 0 && (
        <div aria-hidden style={{
          position: 'absolute', left: 960, top: 480,
          width: 900, height: 900, marginLeft: -450, marginTop: -450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194,65,12,0.5) 0%, transparent 62%)',
          opacity: markP * 0.75,
          filter: 'blur(20px)',
        }}/>
      )}

      {/* mark center */}
      {markP > 0 && (
        <div style={{
          position: 'absolute', left: 960, top: 440,
          transform: 'translate(-50%, -50%)',
        }}>
          <VersuzMark size={420} progress={markP} variant="dark"/>
        </div>
      )}

      {/* wordmark */}
      {wordP > 0 && (
        <div style={{
          position: 'absolute', left: 960, top: 740,
          transform: `translate(-50%, ${(1 - wordP) * 16}px)`,
          opacity: wordP,
        }}>
          <VersuzWordmark size={170} color={BONE} accent={EMBER} progress={wordP}/>
        </div>
      )}

      {/* tagline */}
      {tagP > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 900,
          textAlign: 'center',
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 44, color: BONE, opacity: tagP,
          transform: `translateY(${(1 - tagP) * 10}px)`,
        }}>
          The arena for <span style={{ color: EMBER }}>AI agent skills</span>.
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 3 — HOW IT WORKS (9–15s)
// Three numbered pillars : SUBMIT / JUDGE / RANK, each with a big
// geometric shape icon and a one-line description.
// ═════════════════════════════════════════════════════════════════════
function ActHowItWorks({ t }) {
  if (t < 8.8 || t > 15.4) return null;
  const enter = clamp((t - 8.8) / 0.5, 0, 1);
  const exit  = clamp((t - 15.0) / 0.4, 0, 1);
  const op    = enter * (1 - exit);

  const localT = t - 9.0;

  const stripeP = Easing.easeOutCubic(clamp(localT / 0.8, 0, 1));

  const headP = Easing.easeOutCubic(clamp((localT - 0.3) / 0.7, 0, 1));

  const pillars = [
    {
      num: '01',
      title: 'Submit',
      shape: 'circle',
      color: EMBER,
      desc: 'One-command publish.',
      cmd: '$ npx versuz submit',
    },
    {
      num: '02',
      title: 'Judge',
      shape: 'triangle',
      color: AZURE,
      desc: 'Three frontier models score it daily.',
      cmd: 'Haiku · DeepSeek · GPT-5',
    },
    {
      num: '03',
      title: 'Rank',
      shape: 'square',
      color: AMBER,
      desc: 'Public ELO leaderboard, every 24h.',
      cmd: '#1 → ★ Featured',
    },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, background: BONE }}>
      <BrandStripe progress={stripeP} top={0} height={8}/>

      <MonoCap text="how it works" x={100} y={70} size={16} color={INK2} weight={500} opacity={stripeP}/>
      <MonoCap text="open public benchmark" right={100} y={70} size={16} color={EMBER} weight={500} opacity={stripeP}/>

      <div style={{
        position: 'absolute', left: 100, top: 150,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 92, color: INK, letterSpacing: '-0.02em',
        opacity: headP,
        transform: `translateY(${(1 - headP) * 18}px)`,
      }}>
        Three steps. <em style={{ color: EMBER }}>That's it.</em>
      </div>

      <div style={{
        position: 'absolute', left: 100, right: 100, top: 360,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 36,
      }}>
        {pillars.map((p, i) => {
          const pStart = 0.8 + i * 0.22;
          const pP = Easing.easeOutCubic(clamp((localT - pStart) / 0.7, 0, 1));
          if (pP <= 0) return null;
          return (
            <div key={p.num} style={{
              padding: '40px 36px 36px',
              background: PAPER,
              border: '1px solid rgba(20,18,14,0.10)',
              borderTop: `4px solid ${p.color}`,
              opacity: pP,
              transform: `translateY(${(1 - pP) * 40}px)`,
              boxShadow: '0 24px 50px rgba(20,18,14,0.06)',
              display: 'flex', flexDirection: 'column', gap: 24,
              minHeight: 460,
            }}>
              {/* number */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14, letterSpacing: '0.24em', textTransform: 'uppercase',
                color: p.color, fontWeight: 500,
              }}>{p.num} · {p.title.toLowerCase()}</div>

              {/* big shape icon */}
              <div style={{
                height: 140,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shape type={p.shape} size={120} color={p.color} rot={0}/>
              </div>

              {/* title */}
              <div style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 70, color: INK, lineHeight: 1, letterSpacing: '-0.02em',
              }}>{p.title}</div>

              {/* desc */}
              <div style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 28, color: INK, lineHeight: 1.35, marginTop: 'auto',
              }}>{p.desc}</div>

              {/* cmd / detail */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 15, color: INK2, letterSpacing: '0.04em',
                paddingTop: 14, borderTop: '1px solid rgba(20,18,14,0.10)',
              }}>{p.cmd}</div>
            </div>
          );
        })}
      </div>

      <FrameTicks color={INK} opacity={0.30}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 4 — LIVE BENCH (15–22s)
// Terminal types `npx versuz submit` and 4 bench bars fill.
// ═════════════════════════════════════════════════════════════════════
function ActBench({ t }) {
  if (t < 14.8 || t > 22.4) return null;
  const enter = clamp((t - 14.8) / 0.5, 0, 1);
  const exit  = clamp((t - 22.0) / 0.4, 0, 1);
  const op    = enter * (1 - exit);

  const localT = t - 15.0;

  const CMD = '$ npx versuz submit ./pdf-extract';
  const cmdChars = clamp(Math.floor(localT / 0.04), 0, CMD.length);
  const cmdText = CMD.slice(0, cmdChars);
  const cmdEnd  = CMD.length * 0.04;

  const OUTPUT = [
    { offset: 0.45, text: 'skill packaged · 4.2KB',         icon: '✓', color: SAGE },
    { offset: 0.85, text: 'uploaded · cycle #184',          icon: '✓', color: SAGE },
    { offset: 1.20, text: 'running 4 benchmark suites…',    icon: '▸', color: AMBER },
  ];

  const benches = [
    { name: 'pdf-bench-200',    start: 2.0, dur: 1.0, score: 94.2 },
    { name: 'table-extract',    start: 2.3, dur: 1.1, score: 91.6 },
    { name: 'form-recognition', start: 2.6, dur: 1.2, score: 88.9 },
    { name: 'ocr-mix',          start: 2.9, dur: 1.3, score: 93.5 },
  ];

  const summP = Easing.easeOutCubic(clamp((localT - 4.6) / 0.6, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, background: BONE }}>
      <BrandStripe progress={1} top={0} height={8}/>

      <MonoCap text="04 // live bench" x={100} y={70} size={16} color={INK2} weight={500}/>
      <MonoCap text="cycle #184" right={100} y={70} size={16} color={EMBER} weight={500}/>

      {/* LEFT — terminal */}
      <div style={{
        position: 'absolute', left: 100, top: 160,
        width: 880, height: 750,
        background: '#15110D',
        border: '1px solid rgba(242,238,230,0.08)',
        borderRadius: 12,
        padding: '28px 32px',
        fontFamily: 'JetBrains Mono, monospace',
        color: '#E2DACB',
        boxShadow: '0 30px 80px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
          {[CRIMSON, AMBER, SAGE].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, opacity: 0.85 }}/>
          ))}
          <div style={{ marginLeft: 20, color: 'rgba(242,238,230,0.45)', fontSize: 13,
            letterSpacing: '0.14em', textTransform: 'uppercase' }}>versuz cli · v0.2</div>
        </div>

        <div style={{ fontSize: 22, lineHeight: 1.55 }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ whiteSpace: 'pre' }}>{cmdText}</span>
            {localT < cmdEnd + 0.2 && (Math.floor(localT * 2.5) % 2 === 0) && (
              <span style={{ display: 'inline-block', width: 12, height: 24, background: EMBER, marginLeft: 4, transform: 'translateY(4px)' }}/>
            )}
          </div>
          {OUTPUT.map((line, i) => {
            const showAt = cmdEnd + line.offset;
            const lineP = clamp((localT - showAt) / 0.3, 0, 1);
            if (lineP <= 0) return null;
            return (
              <div key={i} style={{
                marginTop: 16, fontSize: 18,
                opacity: lineP, color: 'rgba(242,238,230,0.85)',
                display: 'flex', gap: 14, alignItems: 'baseline',
              }}>
                <span style={{ color: line.color, width: 18, display: 'inline-block' }}>{line.icon}</span>
                <span>{line.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — bench bars */}
      <div style={{
        position: 'absolute', left: 1040, top: 160, width: 780,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 16, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: INK2, marginBottom: 26,
        }}>same 4 suites every day</div>

        {benches.map((b) => {
          const lp = clamp((localT - b.start) / b.dur, 0, 1);
          const eased = Easing.easeOutCubic(lp);
          const cur = (60 + (b.score - 60) * eased).toFixed(1);
          const barW = 620;
          return (
            <div key={b.name} style={{ marginBottom: 30 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 16, color: INK, marginBottom: 10,
              }}>
                <span>{b.name}</span>
                <span style={{ color: lp === 1 ? EMBER : INK2, fontWeight: 500 }}>{cur}</span>
              </div>
              <div style={{
                position: 'relative',
                width: barW, height: 16, background: 'rgba(20,18,14,0.08)',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  width: eased * barW,
                  background: lp === 1 ? EMBER : AMBER,
                }}/>
              </div>
            </div>
          );
        })}

        {summP > 0 && (
          <div style={{
            marginTop: 36, paddingTop: 26,
            borderTop: '1px solid rgba(20,18,14,0.18)',
            opacity: summP,
            transform: `translateY(${(1 - summP) * 12}px)`,
            display: 'flex', alignItems: 'baseline', gap: 22,
          }}>
            <span style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: 'italic', fontSize: 40, color: EMBER,
            }}>aggregate</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 56, fontWeight: 500,
              color: INK, letterSpacing: '-0.02em',
            }}>92.05</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 16,
              color: INK2, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>· elo</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 36, fontWeight: 500,
              color: EMBER,
            }}>+24</span>
          </div>
        )}
      </div>

      <FrameTicks color={INK} opacity={0.30}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 5 — CLIMB (22–28s)
// Hero rises #4 → #1 on the public leaderboard, crown appears.
// ═════════════════════════════════════════════════════════════════════
function ActClimb({ t }) {
  if (t < 21.8 || t > 28.4) return null;
  const enter = clamp((t - 21.8) / 0.5, 0, 1);
  const exit  = clamp((t - 28.0) / 0.4, 0, 1);
  const op    = enter * (1 - exit);

  const localT = t - 22.0;

  const headP = Easing.easeOutCubic(clamp(localT / 0.6, 0, 1));
  const climbP = Easing.easeInOutCubic(clamp((localT - 1.2) / 2.6, 0, 1));

  const rows = [
    { id: 'pdf-extract', author: 'you',      startRank: 4, endRank: 1, startElo: 1578, endElo: 1648, hero: true },
    { id: 'pdf-fast',    author: 'maple',    startRank: 1, endRank: 2, startElo: 1620, endElo: 1612 },
    { id: 'csv-surgeon', author: 'rowan-yu', startRank: 2, endRank: 3, startElo: 1605, endElo: 1594 },
    { id: 'pdf-quick',   author: 'jet-ai',   startRank: 3, endRank: 4, startElo: 1592, endElo: 1578 },
  ];
  const rowH = 110;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, background: BONE }}>
      <BrandStripe progress={1} top={0} height={8}/>
      <MonoCap text="05 // leaderboard" x={100} y={70} size={16} color={INK2} weight={500}/>
      <MonoCap text="updated every 24h" right={100} y={70} size={16} color={EMBER} weight={500}/>

      <div style={{
        position: 'absolute', left: 100, top: 150,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 92, color: INK, letterSpacing: '-0.02em',
        opacity: headP,
        transform: `translateY(${(1 - headP) * 18}px)`,
      }}>
        Climb the rankings. <em style={{ color: EMBER }}>Live.</em>
      </div>

      <div style={{
        position: 'absolute', left: 100, right: 100, top: 330,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: INK2,
        display: 'grid', gridTemplateColumns: '110px 1fr 200px 160px',
        paddingBottom: 16, borderBottom: '1px solid rgba(20,18,14,0.18)',
      }}>
        <span>Rank</span>
        <span>Skill</span>
        <span style={{ textAlign: 'right' }}>ELO</span>
        <span style={{ textAlign: 'right' }}>Δ24h</span>
      </div>

      <div style={{ position: 'absolute', left: 100, right: 100, top: 390 }}>
        {rows.map((r) => {
          const cur = r.startRank + (r.endRank - r.startRank) * climbP;
          const elo = Math.round(r.startElo + (r.endElo - r.startElo) * climbP);
          const delta = elo - r.startElo;
          const y = (cur - 1) * rowH;
          const isHero = r.hero;
          const crown = climbP > 0.93 && isHero;
          return (
            <div key={r.id} style={{
              position: 'absolute', top: y, left: 0, right: 0,
              height: rowH,
              display: 'grid', gridTemplateColumns: '110px 1fr 200px 160px',
              alignItems: 'center',
              padding: '20px 28px',
              background: isHero ? 'rgba(194,65,12,0.08)' : 'transparent',
              borderBottom: '1px solid rgba(20,18,14,0.08)',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 34, fontWeight: 500,
                color: isHero ? EMBER : INK,
                letterSpacing: '-0.02em',
              }}>#{String(Math.round(cur)).padStart(2, '0')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{
                  fontFamily: 'Instrument Serif, serif',
                  fontStyle: isHero ? 'italic' : 'normal',
                  fontSize: 44, color: isHero ? EMBER : INK,
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>{r.id}{crown && <span style={{ marginLeft: 14, color: EMBER, fontSize: 30 }}> ♛</span>}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14, color: INK2, marginTop: 4,
                }}>by {r.author}</span>
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 32, fontWeight: 500,
                color: isHero ? EMBER : INK,
                textAlign: 'right',
              }}>{elo}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 20, fontWeight: 500,
                color: delta > 0 ? SAGE : (delta < 0 ? CRIMSON : INK2),
                textAlign: 'right',
              }}>{delta > 0 ? `↗ +${delta}` : (delta < 0 ? `↘ ${delta}` : '—')}</span>
            </div>
          );
        })}
      </div>

      <FrameTicks color={INK} opacity={0.30}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 6 — WHAT YOU GET (28–34s)
// Three tier cards : FREE / PREMIUM / FEATURED, each with the matching
// brand shape as a visual cue.
// ═════════════════════════════════════════════════════════════════════
function ActTiers({ t }) {
  if (t < 27.8 || t > 34.4) return null;
  const enter = clamp((t - 27.8) / 0.5, 0, 1);
  const exit  = clamp((t - 34.0) / 0.4, 0, 1);
  const op    = enter * (1 - exit);

  const localT = t - 28.0;
  const headP = Easing.easeOutCubic(clamp(localT / 0.6, 0, 1));

  const tiers = [
    {
      label: 'Free',
      shape: 'circle',
      color: SAGE,
      price: '$0',
      sub: 'Scraped from public GitHub.',
      bullets: ['Browse + install via CLI', 'Verified progressively', 'Open data, CC-BY 4.0'],
    },
    {
      label: 'Premium',
      shape: 'square',
      color: AZURE,
      price: 'from $5',
      sub: 'Author-listed expert skills.',
      bullets: ['One-time purchase', '70% goes to the author', 'Stripe Connect payouts'],
    },
    {
      label: 'Featured',
      shape: 'triangle',
      color: EMBER,
      price: '★',
      sub: 'Versuz first-party curation.',
      bullets: ['Highest quality bar', 'Pinned on /marketplace', 'Cross-sell strip'],
    },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, background: BONE }}>
      <BrandStripe progress={1} top={0} height={8}/>
      <MonoCap text="06 // what you get" x={100} y={70} size={16} color={INK2} weight={500}/>
      <MonoCap text="3 tiers · zero ads" right={100} y={70} size={16} color={EMBER} weight={500}/>

      <div style={{
        position: 'absolute', left: 100, top: 150,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 92, color: INK, letterSpacing: '-0.02em',
        opacity: headP,
        transform: `translateY(${(1 - headP) * 18}px)`,
      }}>
        Browse. Install. <em style={{ color: EMBER }}>Or earn.</em>
      </div>

      <div style={{
        position: 'absolute', left: 100, right: 100, top: 360,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 36,
      }}>
        {tiers.map((tier, i) => {
          const startAt = 0.8 + i * 0.18;
          const cp = Easing.easeOutCubic(clamp((localT - startAt) / 0.7, 0, 1));
          if (cp <= 0) return null;
          return (
            <div key={tier.label} style={{
              padding: '36px 32px',
              background: PAPER,
              border: '1px solid rgba(20,18,14,0.10)',
              borderTop: `4px solid ${tier.color}`,
              opacity: cp,
              transform: `translateY(${(1 - cp) * 36}px)`,
              boxShadow: '0 24px 50px rgba(20,18,14,0.06)',
              minHeight: 460,
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase',
                    color: tier.color, fontWeight: 500, marginBottom: 10,
                  }}>tier</div>
                  <div style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontSize: 64, color: INK, lineHeight: 1, letterSpacing: '-0.02em',
                  }}>{tier.label}</div>
                </div>
                <Shape type={tier.shape} size={56} color={tier.color}/>
              </div>

              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 36, fontWeight: 500,
                color: tier.color, letterSpacing: '-0.02em', marginTop: 4,
              }}>{tier.price}</div>

              <div style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 24, color: INK, lineHeight: 1.4,
              }}>{tier.sub}</div>

              <div style={{
                marginTop: 'auto',
                paddingTop: 18, borderTop: '1px solid rgba(20,18,14,0.10)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {tier.bullets.map((b, j) => (
                  <div key={j} style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14, color: INK2, letterSpacing: '0.04em',
                    display: 'flex', gap: 10, alignItems: 'baseline',
                  }}>
                    <span style={{ color: tier.color }}>·</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <FrameTicks color={INK} opacity={0.30}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ACT 7 — CTA (34–42s)
// Final mark + wordmark + install command + versuz.dev domain.
// Gentle confetti of brand shapes drifts down.
// ═════════════════════════════════════════════════════════════════════
const OUTRO_SHAPES = (function build() {
  const rand = seedRand(42424);
  const types = ['circle', 'square', 'triangle', 'semicircle'];
  const colors = [EMBER, AMBER, AZURE, SAGE];
  const arr = [];
  for (let i = 0; i < 20; i++) {
    arr.push({
      i,
      type: types[i % 4],
      color: colors[i % 4],
      x: rand() * 1920,
      startY: -80 - rand() * 240,
      size: 24 + rand() * 28,
      drift: (rand() - 0.5) * 80,
      delay: rand() * 1.6,
      rot: rand() * 360,
      rotSpeed: (rand() - 0.5) * 140,
    });
  }
  return arr;
})();

function ActCTA({ t }) {
  if (t < 33.8) return null;
  const localT = t - 34.0;

  const enter = Easing.easeOutCubic(clamp((t - 33.8) / 0.7, 0, 1));

  const stripeP = Easing.easeOutCubic(clamp((localT + 0.1) / 0.9, 0, 1));
  const markP   = Easing.easeOutCubic(clamp((localT - 0.2) / 1.2, 0, 1));
  const wordP   = Easing.easeOutCubic(clamp((localT - 1.2) / 0.9, 0, 1));
  const tagP    = Easing.easeOutCubic(clamp((localT - 1.9) / 0.7, 0, 1));
  const cmdP    = Easing.easeOutCubic(clamp((localT - 2.4) / 0.6, 0, 1));
  const domP    = Easing.easeOutCubic(clamp((localT - 2.8) / 0.5, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, opacity: enter, overflow: 'hidden' }}>
      <BrandStripe progress={stripeP} top={0} height={14}/>

      {/* drifting brand-shape confetti */}
      {OUTRO_SHAPES.map((c) => {
        const local = clamp((localT - c.delay) / 5.0, 0, 1);
        if (local <= 0) return null;
        const y = c.startY + local * 1300;
        const x = c.x + Math.sin(local * Math.PI * 1.4) * c.drift;
        const opC = (1 - local * 0.7) * 0.55;
        return (
          <div key={c.i} aria-hidden style={{
            position: 'absolute', left: x, top: y,
            transform: `rotate(${c.rot + c.rotSpeed * local}deg)`,
            opacity: opC,
          }}>
            <Shape type={c.type} size={c.size} color={c.color}/>
          </div>
        );
      })}

      {/* warm halo */}
      <div aria-hidden style={{
        position: 'absolute', left: 960, top: 430,
        width: 1100, height: 1100, marginLeft: -550, marginTop: -550,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(194,65,12,0.18) 0%, transparent 60%)',
        opacity: markP * 0.8,
      }}/>

      {markP > 0 && (
        <div style={{
          position: 'absolute', left: 960, top: 350,
          transform: 'translate(-50%, -50%)',
        }}>
          <VersuzMark size={360} progress={markP} variant="light"/>
        </div>
      )}

      {wordP > 0 && (
        <div style={{
          position: 'absolute', left: 960, top: 580,
          transform: `translate(-50%, ${(1 - wordP) * 14}px)`,
          opacity: wordP,
        }}>
          <VersuzWordmark size={140} color={INK} accent={EMBER} progress={wordP}/>
        </div>
      )}

      {tagP > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 720,
          textAlign: 'center',
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 56, color: INK, letterSpacing: '-0.02em',
          opacity: tagP,
          transform: `translateY(${(1 - tagP) * 14}px)`,
        }}>
          The arena for AI agent skills.
        </div>
      )}

      {cmdP > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 820,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 30, color: INK,
          opacity: cmdP,
          transform: `translateY(${(1 - cmdP) * 8}px)`,
        }}>
          <span style={{ color: INK2 }}>$</span> npx versuz install <span style={{ color: EMBER }}>&lt;skill&gt;</span>
        </div>
      )}

      {domP > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 60,
          textAlign: 'center',
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 56, color: EMBER,
          opacity: domP,
        }}>versuz.dev</div>
      )}

      <FrameTicks color={INK} opacity={0.4}/>

      <MonoCap text="versuz // v01" x={100} y={80} size={14} color={INK2} opacity={stripeP}/>
      <MonoCap text="open public benchmark" right={100} y={80} size={14} color={INK2} opacity={stripeP}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCENE — full manifesto
// ═════════════════════════════════════════════════════════════════════
function SceneManifesto() {
  const time = useTime();

  const bgBase = time < 4.4 ? INK_DEEP
               : time < 9.0 ? INK_DEEP
               : BONE;

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgBase, overflow: 'hidden' }}>
      <ActProblem    t={time}/>
      <ActReveal     t={time}/>
      <ActHowItWorks t={time}/>
      <ActBench      t={time}/>
      <ActClimb      t={time}/>
      <ActTiers      t={time}/>
      <ActCTA        t={time}/>
    </div>
  );
}

// ─── Register scene ───────────────────────────────────────────────────
window.VERSUZ_SCENES = window.VERSUZ_SCENES || {};
Object.assign(window.VERSUZ_SCENES, {
  manifesto: {
    title: 'Manifesto · full anthem',
    subtitle: '42s · 7 acts · problem → solution → action',
    width: 1920,
    height: 1080,
    duration: 42,
    Component: SceneManifesto,
    format: '16:9 · 42s',
    group: 'Web / hero',
  },
});
