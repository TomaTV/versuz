// More Versuz ad scenes — logo reveal, additional verticals, LinkedIn.

const {
  Stage, Sprite, useTime, useSprite, useTimeline,
  Easing, interpolate, animate, clamp,
  VersuzMark, EmberStar, VersuzWordmark, VersuzWordmarkSVG,
  EMBER_PATH, V_PATH,
} = window;

const BONE   = '#F2EEE6';
const PAPER  = '#ECE7DD';
const INK    = '#151411';
const INK_DEEP = '#0E0D0B';
const INK2   = '#6B6557';
const EMBER  = '#C2410C';
const EMBER_SOFT = 'rgba(194,65,12,0.18)';
const SAGE   = '#3F7D4F';
const AMBER  = '#D69E2E';
const AZURE  = '#2A5FA8';

function useTypeIn(text, start, end) {
  const time = useTime();
  const local = clamp((time - start) / (end - start), 0, 1);
  const n = Math.floor(local * text.length + 0.0001);
  return text.slice(0, n);
}

function GridBG({ color = 'rgba(20,18,14,0.05)', size = 40 }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
      pointerEvents: 'none',
    }}/>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LOGO REVEAL — 1080×1080 · 6s · "Spark to bloom"
// Pure logo, no wordmark. Ink background for cinematic drama.
// ══════════════════════════════════════════════════════════════════════════
function SceneLogoReveal() {
  const time = useTime();

  // Phase 1: ember spark dot grows: 0.2 → 0.6s
  const sparkP = clamp((time - 0.2) / 0.4, 0, 1);

  // Phase 2: rays burst out: 0.55 → 1.4s
  const rayP = clamp((time - 0.55) / 0.85, 0, 1);

  // Phase 3: star scales in with rotation overshoot: 0.7 → 1.4s
  const starP = clamp((time - 0.7) / 0.7, 0, 1);
  const starEase = Easing.easeOutBack(starP);
  const starScale = starEase;
  const starRot = (1 - starP) * -180;

  // Phase 4: V rises from below: 1.4 → 2.3s
  const vP = clamp((time - 1.4) / 0.9, 0, 1);
  const vEase = Easing.easeOutCubic(vP);

  // Phase 5: pulse rings: 2.3 → 5s (multiple)
  const pulseRings = [];
  for (let i = 0; i < 3; i++) {
    const ringStart = 2.3 + i * 0.8;
    const rp = clamp((time - ringStart) / 1.5, 0, 1);
    if (rp > 0 && rp < 1) {
      pulseRings.push({ progress: rp });
    }
  }

  // Phase 6: hold with subtle breathing: 2.5 onward
  const breathe = 1 + 0.015 * Math.sin((time - 2.5) * 1.5);
  const holdScale = vP > 0.5 ? breathe : 1;

  // Final fade out lead-in: 5.5 → 6s
  const fadeOut = clamp((time - 5.5) / 0.5, 0, 1);

  // Mark sits at center of 1080×1080
  const cx = 540, cy = 540;
  const markW = 560; // visual size of the mark group
  // The mark's natural ratio is 186:128. Within its SVG, star center is at (145, 41).
  // Convert to absolute positions for the layered render.

  // Star center in screen px (after we render mark at (cx, cy) and size=markW)
  // SVG-to-screen mapping: scale = markW / 186
  const sToPx = markW / 186;
  const starCx = cx - (markW / 2) + 145 * sToPx;
  const starCy = cy - (markW / 2 / (186/128)) + 41 * sToPx;

  // Number of rays
  const rayCount = 14;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: INK_DEEP,
      overflow: 'hidden',
      opacity: 1 - fadeOut * 0.0, // hold visible
    }}>
      {/* Subtle vignette */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }}/>

      {/* Faint warm glow behind star (builds after phase 2) */}
      <div aria-hidden style={{
        position: 'absolute',
        left: starCx, top: starCy,
        width: 800, height: 800,
        marginLeft: -400, marginTop: -400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(194,65,12,0.35) 0%, transparent 60%)',
        opacity: clamp(starP * 0.7 + (time - 2.3) * 0.1, 0, 0.9) * (1 - fadeOut * 0.4),
        filter: 'blur(20px)',
        transform: `scale(${0.4 + 0.6 * starP + (time > 2.3 ? (Math.sin(time * 1.2) + 1) * 0.05 : 0)})`,
      }}/>

      {/* Pulse rings emanating from star */}
      {pulseRings.map((r, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute',
          left: starCx, top: starCy,
          width: 100, height: 100,
          marginLeft: -50, marginTop: -50,
          borderRadius: '50%',
          border: `1px solid ${EMBER}`,
          opacity: (1 - r.progress) * 0.4,
          transform: `scale(${1 + r.progress * 8})`,
          pointerEvents: 'none',
        }}/>
      ))}

      {/* Ray burst — 14 rays expanding outward */}
      {rayP > 0 && rayP < 1 && [...Array(rayCount)].map((_, i) => {
        const angle = (i * 360 / rayCount) + rayP * 30;
        const len = rayP * 380;
        const start = rayP * 40;
        const opacity = (1 - Easing.easeInCubic(rayP)) * 0.9;
        return (
          <div key={i} aria-hidden style={{
            position: 'absolute',
            left: starCx, top: starCy,
            width: len - start, height: 2,
            transformOrigin: '0 50%',
            transform: `translate(${start}px, -1px) rotate(0deg)`,
            background: `linear-gradient(90deg, transparent 0%, ${EMBER} 100%)`,
            opacity,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'inherit',
              transform: `rotate(0deg)`,
            }}/>
            <div style={{
              position: 'absolute',
              left: -start, top: -starCy, width: 1, height: 1,
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 0',
            }}/>
          </div>
        );
      })}

      {/* Properly rotated rays via SVG (cleaner) */}
      {rayP > 0 && rayP < 1 && (
        <svg
          aria-hidden
          width="1200" height="1200"
          viewBox="-600 -600 1200 1200"
          style={{
            position: 'absolute',
            left: starCx, top: starCy,
            marginLeft: -600, marginTop: -600,
            pointerEvents: 'none',
          }}
        >
          {[...Array(rayCount)].map((_, i) => {
            const angle = (i * 360 / rayCount);
            const len = rayP * 420;
            const start = rayP * 50;
            const opacity = (1 - Easing.easeInCubic(rayP)) * 0.85;
            return (
              <line key={i}
                x1={start} y1={0}
                x2={len} y2={0}
                stroke={EMBER}
                strokeWidth="2"
                strokeLinecap="round"
                opacity={opacity}
                transform={`rotate(${angle})`}
              />
            );
          })}
        </svg>
      )}

      {/* Spark dot (visible before star) */}
      {sparkP > 0 && starP < 0.4 && (
        <div aria-hidden style={{
          position: 'absolute',
          left: starCx, top: starCy,
          width: 24 * sparkP, height: 24 * sparkP,
          marginLeft: -12 * sparkP, marginTop: -12 * sparkP,
          borderRadius: '50%',
          background: EMBER,
          boxShadow: `0 0 ${40 * sparkP}px ${EMBER}, 0 0 ${80 * sparkP}px ${EMBER}`,
          opacity: 1 - starP * 0.5,
        }}/>
      )}

      {/* The mark itself */}
      <div style={{
        position: 'absolute',
        left: cx, top: cy,
        transform: `translate(-50%, -50%) scale(${holdScale})`,
        willChange: 'transform',
      }}>
        {/* Custom mark layered with V/star isolated for independent animation */}
        <svg
          width={markW}
          height={markW / (186/128)}
          viewBox="0 0 186 128"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* V chevron — clipped from top down */}
          <defs>
            <clipPath id="logo-reveal-vclip">
              <rect x="0" y={130 - 130 * vEase} width="120" height={130 * vEase} />
            </clipPath>
          </defs>
          <g
            clipPath="url(#logo-reveal-vclip)"
            style={{
              opacity: vP > 0 ? 1 : 0,
              transform: `translateY(${(1 - vEase) * 8}px)`,
              transformOrigin: '42px 80px',
            }}
          >
            <path d={V_PATH} fill={BONE} />
          </g>
          {/* Ember star */}
          <g
            style={{
              transform: `rotate(${starRot}deg) scale(${starScale})`,
              transformOrigin: '145px 41px',
              opacity: starP,
            }}
          >
            <path d={EMBER_PATH} fill={EMBER} />
          </g>
        </svg>
      </div>

      {/* Tiny mono mark at the corner — appears at end */}
      <Sprite start={4.0} end={6}>
        {({ progress }) => {
          const p = Easing.easeOutCubic(clamp(progress * 3, 0, 1));
          return (
            <div style={{
              position: 'absolute', bottom: 40, left: 40,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              color: 'rgba(246,244,239,0.4)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: p,
              transform: `translateY(${(1 - p) * 8}px)`,
            }}>
              The mark · v01
            </div>
          );
        }}
      </Sprite>

      <Sprite start={4.0} end={6}>
        {({ progress }) => {
          const p = Easing.easeOutCubic(clamp(progress * 3, 0, 1));
          return (
            <div style={{
              position: 'absolute', bottom: 40, right: 40,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              color: 'rgba(246,244,239,0.4)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: p,
              transform: `translateY(${(1 - p) * 8}px)`,
            }}>
              Ember · #C2410C
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VERTICAL: 247 → 1 — 1080×1920 · 7s · "Rapid count to a winner"
// ══════════════════════════════════════════════════════════════════════════
function SceneCount247to1() {
  const time = useTime();

  // Stages: each shows a number for a short time
  const beats = [
    { n: '247', label: 'skills submitted',   start: 0.2,  end: 1.2 },
    { n: '98',  label: 'past the first round', start: 1.2, end: 2.0 },
    { n: '12',  label: 'in the bracket',     start: 2.0, end: 2.7 },
    { n: '3',   label: 'in the final',       start: 2.7, end: 3.5 },
    { n: '1',   label: 'leader',             start: 3.5, end: 4.7, hero: true },
  ];

  const active = beats.find(b => time >= b.start && time < b.end);
  const lastBeat = beats[beats.length - 1];

  // Final card: 4.7+
  const finalP = clamp((time - 4.7) / 0.6, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={48}/>

      {/* Header */}
      <Sprite start={0} end={7}>
        <div style={{
          position: 'absolute', top: 48, left: 48,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 18, color: INK2,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>Versuz · cycle #184</div>
      </Sprite>

      {/* Big number */}
      {beats.map((b, i) => {
        if (time < b.start || time >= b.end) return null;
        const dur = b.end - b.start;
        const local = (time - b.start) / dur;
        const inP = clamp(local / 0.3, 0, 1);
        const outP = clamp((local - 0.7) / 0.3, 0, 1);
        const inEase = Easing.easeOutBack(inP);
        const outEase = Easing.easeInCubic(outP);
        const scale = inEase * (1 - 0.1 * outEase);
        const opacity = inP - outP;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%', top: 540,
            transform: `translate(-50%, 0) scale(${scale})`,
            opacity,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: b.hero ? 'italic' : 'normal',
              fontSize: b.hero ? 640 : 480,
              lineHeight: 0.85,
              letterSpacing: '-0.06em',
              color: b.hero ? EMBER : INK,
            }}>{b.n}</div>
            <div style={{
              marginTop: 32,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 24,
              color: INK2,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
            }}>{b.label}</div>
          </div>
        );
      })}

      {/* Ember star above on hero beat */}
      {time > 3.5 && time < 4.7 && (
        <div style={{
          position: 'absolute', left: '50%', top: 240,
          transform: 'translate(-50%, 0)',
        }}>
          <EmberStar size={140} progress={1}/>
        </div>
      )}

      {/* Final card */}
      {finalP > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: BONE,
          opacity: finalP,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 80,
        }}>
          <EmberStar size={200} progress={1}/>
          <div style={{
            marginTop: 60,
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 200, lineHeight: 0.9, letterSpacing: '-0.04em',
            color: INK, textAlign: 'center',
          }}>
            pdf-extract
          </div>
          <div style={{
            marginTop: 40,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 28, color: EMBER,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            1648 elo · cycle leader
          </div>

          <div style={{
            position: 'absolute', bottom: 100, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 24,
          }}>
            <VersuzMark size={120} progress={1}/>
            <div style={{
              fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
              fontSize: 80, color: INK, letterSpacing: '-0.02em',
            }}>versuz.dev</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VERTICAL: LIVE BOUT — 1080×1920 · 8s · "two skills face off"
// ══════════════════════════════════════════════════════════════════════════
function SceneLiveBout() {
  const time = useTime();

  // Split halves slide in: 0.2 → 1.0s
  const splitP = clamp((time - 0.2) / 0.8, 0, 1);
  const splitEase = Easing.easeOutCubic(splitP);

  // VS bar pops in: 1.0 → 1.4s
  const vsP = clamp((time - 1.0) / 0.4, 0, 1);
  const vsEase = Easing.easeOutBack(vsP);

  // Stats animate in: 1.4 → 3.0s
  const statsP = clamp((time - 1.4) / 1.6, 0, 1);

  // Tension build: 3.0 → 4.5s — bar starts pulsing
  const tensionP = clamp((time - 3.0) / 1.5, 0, 1);

  // Verdict slam: 4.7s
  const verdictP = clamp((time - 4.7) / 0.4, 0, 1);
  const verdictEase = Easing.easeOutBack(verdictP);

  // Loser dim: 5.0+
  const loserDim = clamp((time - 5.0) / 0.5, 0, 1);

  // Final card: 6.4+
  const finalP = clamp((time - 6.4) / 0.6, 0, 1);

  // Top skill (loser): pdf-fast
  // Bottom skill (winner): pdf-extract

  return (
    <div style={{ position: 'absolute', inset: 0, background: INK, overflow: 'hidden' }}>
      {/* Top half */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, top: 0, height: 960,
        background: INK_DEEP,
        transform: `translateY(${(1 - splitEase) * -200}px)`,
        opacity: 1 - loserDim * 0.55,
        filter: loserDim > 0.5 ? 'grayscale(0.6)' : 'none',
      }}>
        <GridBG color="rgba(246,244,239,0.04)" size={48}/>
        <div style={{
          padding: '120px 80px 0',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 18, color: 'rgba(246,244,239,0.55)',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Challenger</div>
          <div style={{
            marginTop: 24,
            fontFamily: 'Instrument Serif, serif',
            fontSize: 140, lineHeight: 0.95, letterSpacing: '-0.03em',
            color: BONE,
          }}>pdf-fast</div>
          <div style={{
            marginTop: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 24,
            color: 'rgba(246,244,239,0.45)',
            letterSpacing: '0.06em',
          }}>by maple</div>

          {/* Stats */}
          <div style={{
            marginTop: 60,
            display: 'flex', flexDirection: 'column', gap: 24,
            opacity: statsP,
          }}>
            <Stat label="ELO" value={1612} delay={1.4} time={time}/>
            <Stat label="Win rate" value="64%" delay={1.7} time={time}/>
            <Stat label="Wins" value="56" delay={2.0} time={time}/>
          </div>
        </div>
      </div>

      {/* Bottom half */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, top: 960, height: 960,
        background: BONE,
        transform: `translateY(${(1 - splitEase) * 200}px)`,
        opacity: verdictP > 0 ? 1 : (1 - 0),
      }}>
        <GridBG size={48}/>
        <div style={{
          padding: '120px 80px 0',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 18, color: EMBER,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Incumbent</div>
          <div style={{
            marginTop: 24,
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic',
            fontSize: 160, lineHeight: 0.95, letterSpacing: '-0.04em',
            color: EMBER,
          }}>pdf-extract</div>
          <div style={{
            marginTop: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 24,
            color: INK2,
            letterSpacing: '0.06em',
          }}>by anthropic-labs</div>

          {/* Stats */}
          <div style={{
            marginTop: 60,
            display: 'flex', flexDirection: 'column', gap: 24,
            opacity: statsP,
          }}>
            <Stat label="ELO" value={1648} delay={1.4} time={time} color={INK} accent={EMBER}/>
            <Stat label="Win rate" value="87%" delay={1.7} time={time} color={INK} accent={EMBER}/>
            <Stat label="Wins" value="103" delay={2.0} time={time} color={INK} accent={EMBER}/>
          </div>
        </div>
      </div>

      {/* VS divider bar */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, top: 960 - 6,
        height: 12,
        background: EMBER,
        transform: `scaleX(${vsP})`, transformOrigin: 'center',
        opacity: 1 - loserDim * 0.4,
      }}/>

      {/* VS chip */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 960,
        transform: `translate(-50%, -50%) scale(${vsEase}) ${tensionP > 0 ? `scale(${1 + 0.04 * Math.sin(time * 14)})` : ''}`,
        zIndex: 5,
      }}>
        <div style={{
          width: 220, height: 220,
          background: EMBER,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 140, color: BONE,
          letterSpacing: '-0.06em',
          boxShadow: tensionP > 0 ? `0 0 ${30 * tensionP}px ${EMBER}` : 'none',
        }}>vs</div>
      </div>

      {/* Verdict band */}
      {verdictP > 0 && finalP < 1 && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: 960 - 50,
          height: 100,
          background: INK,
          transform: `scaleY(${verdictEase})`,
          transformOrigin: 'center',
          zIndex: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 24,
        }}>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 64, color: EMBER, letterSpacing: '-0.02em',
            opacity: verdictP,
          }}>pdf-extract</div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 20, color: 'rgba(246,244,239,0.4)',
            letterSpacing: '0.2em',
          }}>WINS</span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 24, color: EMBER,
            letterSpacing: '0.08em',
          }}>↗ +24</span>
        </div>
      )}

      {/* Final card */}
      {finalP > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: BONE,
          opacity: finalP,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 80, gap: 40,
        }}>
          <VersuzMark size={300} progress={1}/>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 100, color: INK, letterSpacing: '-0.02em',
          }}>versuz.dev</div>
          <div style={{
            marginTop: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 22, color: INK2,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: 'center',
          }}>Watch the bouts live · 24h cycles</div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, delay, time, color = BONE, accent = EMBER }) {
  const p = clamp((time - delay) / 0.5, 0, 1);
  const ease = Easing.easeOutCubic(p);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      borderBottom: `1px solid ${color === BONE ? 'rgba(246,244,239,0.20)' : 'rgba(20,18,14,0.20)'}`,
      paddingBottom: 12,
      opacity: ease,
      transform: `translateY(${(1 - ease) * 16}px)`,
    }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 22, color: color === BONE ? 'rgba(246,244,239,0.55)' : INK2,
        letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: 'Instrument Serif, serif',
        fontSize: 56, color, lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VERTICAL: BRACKET FILL — 1080×1920 · 8s
// ══════════════════════════════════════════════════════════════════════════
function SceneBracket() {
  const time = useTime();

  // 8 entrants → 4 → 2 → 1
  const entrants = [
    'pdf-extract', 'sql-genie',
    'pdf-fast', 'csv-surgeon',
    'web-scry', 'prose-tidy',
    'agent-router', 'code-fixer',
  ];

  // Geometry — left column quarters, mid column semis, right column final
  const left = 100;
  const colW = 280;
  const rowH = 130;
  const topY = 460;

  // Slots draw in stagger: 0.3 → 1.5s
  const slotIn = entrants.map((_, i) => clamp((time - 0.3 - i * 0.08) / 0.4, 0, 1));

  // Round 1 wins (4 lines connect to round 2): 1.8 → 2.6s
  const r1 = clamp((time - 1.8) / 0.8, 0, 1);
  // Round 2 (4 → 2): 3.0 → 3.8s
  const r2 = clamp((time - 3.0) / 0.8, 0, 1);
  // Round 3 (2 → 1): 4.2 → 5.0s
  const r3 = clamp((time - 4.2) / 0.8, 0, 1);

  // Winner enlarged: 5.2+
  const winP = clamp((time - 5.2) / 0.6, 0, 1);

  // Final card slide in: 6.4+
  const finalP = clamp((time - 6.4) / 0.6, 0, 1);

  // Winners — predetermined
  const winnersR1 = ['pdf-extract', 'pdf-fast', 'web-scry', 'agent-router'];
  const winnersR2 = ['pdf-extract', 'agent-router'];
  const winnerR3 = 'pdf-extract';

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={48}/>

      {/* Header */}
      <div style={{
        position: 'absolute', top: 60, left: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 18, color: INK2,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>Versuz · bracket · pdf utils</div>
      <div style={{
        position: 'absolute', top: 60, right: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 18, color: EMBER,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>8 → 1</div>

      {/* Headline */}
      <div style={{
        position: 'absolute', left: 60, top: 140,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 110, lineHeight: 0.95, letterSpacing: '-0.04em',
        color: INK,
      }}>
        Today's <em style={{ color: EMBER }}>bracket.</em>
      </div>

      {/* Round 1 entrants */}
      {entrants.map((name, i) => {
        const op = slotIn[i];
        const y = topY + i * rowH;
        const isR2Winner = winnersR1.includes(name);
        const r1Done = r1 > 0.1;
        const dimAfterR1 = r1Done && !isR2Winner;
        const dimP = clamp((time - 2.0) / 0.5, 0, 1);

        // After R2, the R2 losers dim
        const isR3Winner = winnersR2.includes(name);
        const dimAfterR2 = r2 > 0.5 && isR2Winner && !isR3Winner;
        const dimP2 = clamp((time - 3.4) / 0.5, 0, 1);

        // Final winner shines
        const isFinal = name === winnerR3;
        const finalGlow = r3 > 0.5 && isFinal;

        // Move to center when winning
        const isWinning = winP > 0 && isFinal;

        return (
          <div key={i} style={{
            position: 'absolute',
            left, top: y,
            width: colW, height: rowH - 30,
            background: isFinal && finalGlow ? EMBER : (dimAfterR1 || dimAfterR2 ? 'transparent' : PAPER),
            color: isFinal && finalGlow ? BONE : INK,
            border: `1px solid ${dimAfterR1 || dimAfterR2 ? 'rgba(20,18,14,0.10)' : INK}`,
            display: 'flex', alignItems: 'center',
            padding: '0 20px',
            opacity: op * (1 - (dimAfterR1 ? dimP * 0.7 : 0) - (dimAfterR2 ? dimP2 * 0.7 : 0)),
            filter: (dimAfterR1 || dimAfterR2) && !isFinal ? 'grayscale(1)' : 'none',
            fontFamily: 'Instrument Serif, serif',
            fontSize: 32,
            fontStyle: isFinal && finalGlow ? 'italic' : 'normal',
            letterSpacing: '-0.02em',
          }}>
            {name}
            {isFinal && finalGlow && (
              <span style={{
                marginLeft: 'auto',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14, letterSpacing: '0.16em',
              }}>★</span>
            )}
          </div>
        );
      })}

      {/* Connection lines — round 1 to round 2 */}
      <svg viewBox="0 0 1080 1920" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
      }}>
        {/* R1 → R2 connectors (4 pairs) */}
        {[0, 1, 2, 3].map(pair => {
          const y1 = topY + (pair * 2) * rowH + rowH / 2 - 15;
          const y2 = topY + (pair * 2 + 1) * rowH + rowH / 2 - 15;
          const yMid = (y1 + y2) / 2;
          const x0 = left + colW;
          const x1 = x0 + 60;
          const drawLen = r1;
          return (
            <g key={pair} opacity={r1}>
              <path
                d={`M ${x0} ${y1} L ${x0 + drawLen * 60} ${y1}`}
                stroke={INK} strokeWidth="2" fill="none"
              />
              <path
                d={`M ${x0} ${y2} L ${x0 + drawLen * 60} ${y2}`}
                stroke={INK} strokeWidth="2" fill="none"
              />
              {r1 > 0.5 && (
                <path
                  d={`M ${x1} ${y1} L ${x1} ${yMid} L ${x1 + (r1 - 0.5) * 2 * 40} ${yMid}`}
                  stroke={INK} strokeWidth="2" fill="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Round 2 slots */}
      {r1 > 0.7 && winnersR1.map((name, i) => {
        const y = topY + (i * 2) * rowH + (rowH * 2) / 2 - 50;
        const x = left + colW + 100;
        const op = clamp((r1 - 0.7) / 0.3, 0, 1);
        const isR3 = winnersR2.includes(name);
        const dimP2 = clamp((time - 3.4) / 0.5, 0, 1);
        const dim = r2 > 0.5 && !isR3;
        const isFinal = name === winnerR3;
        const finalGlow = r3 > 0.5 && isFinal;

        return (
          <div key={i} style={{
            position: 'absolute',
            left: x, top: y,
            width: colW, height: 100,
            background: isFinal && finalGlow ? EMBER : (dim ? 'transparent' : PAPER),
            color: isFinal && finalGlow ? BONE : INK,
            border: `1px solid ${dim ? 'rgba(20,18,14,0.10)' : INK}`,
            display: 'flex', alignItems: 'center',
            padding: '0 20px',
            opacity: op * (1 - (dim ? dimP2 * 0.7 : 0)),
            filter: dim ? 'grayscale(1)' : 'none',
            fontFamily: 'Instrument Serif, serif',
            fontSize: 32,
            fontStyle: isFinal && finalGlow ? 'italic' : 'normal',
            letterSpacing: '-0.02em',
          }}>{name}</div>
        );
      })}

      {/* R2 → final connectors */}
      <svg viewBox="0 0 1080 1920" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
      }}>
        {[0, 1].map(pair => {
          const y1 = topY + (pair * 4) * rowH + rowH * 2 / 2 - 50 + 50;
          const y2 = topY + (pair * 4 + 2) * rowH + rowH * 2 / 2 - 50 + 50;
          const yMid = (y1 + y2) / 2;
          const x0 = left + colW + 100 + colW;
          return (
            <g key={pair} opacity={r2}>
              <path
                d={`M ${x0} ${y1} L ${x0 + r2 * 60} ${y1}`}
                stroke={INK} strokeWidth="2" fill="none"
              />
              <path
                d={`M ${x0} ${y2} L ${x0 + r2 * 60} ${y2}`}
                stroke={INK} strokeWidth="2" fill="none"
              />
              {r2 > 0.5 && (
                <path
                  d={`M ${x0 + 60} ${y1} L ${x0 + 60} ${yMid} L ${x0 + 60 + (r2 - 0.5) * 2 * 40} ${yMid}`}
                  stroke={INK} strokeWidth="2" fill="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Winner final slot — centered at end of bracket */}
      {r2 > 0.7 && (
        <div style={{
          position: 'absolute',
          left: left + colW + 100 + colW + 100,
          top: topY + 3 * rowH,
          width: 280, height: 130,
          background: r3 > 0.5 ? EMBER : PAPER,
          color: r3 > 0.5 ? BONE : INK,
          border: `2px solid ${INK}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: clamp((r2 - 0.7) / 0.3, 0, 1),
          transform: `scale(${1 + winP * 0.15})`,
          transformOrigin: 'center',
          gap: 4,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, letterSpacing: '0.20em', textTransform: 'uppercase',
            color: r3 > 0.5 ? 'rgba(242,238,230,0.7)' : INK2,
          }}>{r3 > 0.5 ? '★ Cycle leader' : 'Final'}</div>
          <div style={{
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic', fontSize: 42, letterSpacing: '-0.02em',
          }}>{r3 > 0.5 ? winnerR3 : '?'}</div>
        </div>
      )}

      {/* Final overlay card */}
      {finalP > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: BONE, opacity: finalP,
          padding: 80,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 60,
        }}>
          <VersuzMark size={300} progress={1}/>
          <div style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 140, lineHeight: 0.95, letterSpacing: '-0.04em',
            color: INK, textAlign: 'center',
          }}>Every<br/>cycle<br/><em style={{ color: EMBER }}>a new bracket.</em></div>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 80, color: INK, letterSpacing: '-0.02em',
          }}>versuz.dev</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VERTICAL: LEADERBOARD CLIMB — 1080×1920 · 8s
// ══════════════════════════════════════════════════════════════════════════
function SceneLeaderboardClimb() {
  const time = useTime();

  const rows = [
    { id: 'sql-genie',   author: 'maple',           pre: 1624, post: 1624 },
    { id: 'csv-surgeon', author: 'rowan-yu',        pre: 1612, post: 1612 },
    { id: 'web-scry',    author: 'kira',            pre: 1605, post: 1605 },
    { id: 'pdf-extract', author: 'anthropic-labs',  pre: 1518, post: 1648, hero: true, preRank: 8, postRank: 1 },
    { id: 'agent-router',author: 'theo',            pre: 1591, post: 1591 },
    { id: 'code-fixer',  author: 'orion',           pre: 1582, post: 1582 },
    { id: 'prose-tidy',  author: 'mei',             pre: 1554, post: 1554 },
    { id: 'image-tag',   author: 'syd',             pre: 1530, post: 1530 },
  ];

  // Pre-sort by pre-Elo to assign starting ranks
  const sortedPre = [...rows].sort((a, b) => b.pre - a.pre);
  const sortedPost = [...rows].sort((a, b) => b.post - a.post);

  // Show: 0.4 → climb start
  // Climb: 2.2 → 3.6s
  const climbP = clamp((time - 2.2) / 1.4, 0, 1);
  const climbEase = Easing.easeInOutCubic(climbP);

  const rowH = 120;
  const top = 480;

  // Final card: 5.6+
  const finalP = clamp((time - 5.6) / 0.6, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={48}/>

      {/* Header */}
      <div style={{
        position: 'absolute', top: 60, left: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 18, color: INK2,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>Versuz · live standings</div>
      <div style={{
        position: 'absolute', top: 60, right: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 18, color: EMBER,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        opacity: clamp((time - 1.8) / 0.4, 0, 1),
      }}>↗ Rank-up</div>

      {/* Headline */}
      <Sprite start={0.2} end={5.6}>
        {({ progress }) => {
          const p = Easing.easeOutCubic(clamp(progress * 4, 0, 1));
          const out = clamp((progress - 0.9) * 10, 0, 1);
          return (
            <div style={{
              position: 'absolute', left: 60, top: 200,
              fontFamily: 'Instrument Serif, serif',
              fontSize: 120, lineHeight: 0.92, letterSpacing: '-0.04em',
              color: INK,
              opacity: p * (1 - out),
              transform: `translateY(${(1 - p) * 20}px)`,
            }}>
              Watch them<br/><em style={{ color: EMBER }}>climb.</em>
            </div>
          );
        }}
      </Sprite>

      {/* Leaderboard */}
      <div style={{ position: 'absolute', left: 60, right: 60, top }}>
        {rows.map((r, idx) => {
          const preRank = sortedPre.findIndex(x => x.id === r.id);
          const postRank = sortedPost.findIndex(x => x.id === r.id);
          const curRank = preRank + (postRank - preRank) * climbEase;
          const y = curRank * rowH;
          const isLeader = Math.round(curRank) === 0;
          const curElo = Math.round(r.pre + (r.post - r.pre) * climbEase);
          const heroDelta = r.hero ? Math.round((r.post - r.pre) * climbEase) : 0;

          // Stagger fade-in: 0.5 + idx * 0.06
          const inP = clamp((time - 0.5 - idx * 0.05) / 0.5, 0, 1);

          return (
            <div key={r.id} style={{
              position: 'absolute', left: 0, right: 0,
              top: y, height: rowH - 10,
              display: 'flex', alignItems: 'center', gap: 24,
              padding: '0 24px',
              background: r.hero && isLeader ? 'rgba(194,65,12,0.10)' : (r.hero ? 'rgba(194,65,12,0.04)' : 'transparent'),
              borderBottom: '1px solid rgba(20,18,14,0.10)',
              opacity: inP,
              transform: `translateX(${(1 - inP) * 30}px)`,
              willChange: 'top, opacity',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 26, color: INK2,
                letterSpacing: '0.04em', minWidth: 70,
              }}>#{String(Math.round(curRank) + 1).padStart(2, '0')}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontFamily: 'Instrument Serif, serif',
                  fontStyle: r.hero ? 'italic' : 'normal',
                  fontSize: 52, letterSpacing: '-0.02em',
                  color: r.hero ? EMBER : INK,
                  lineHeight: 1,
                }}>{r.id}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 16, color: INK2,
                  marginTop: 4,
                }}>{r.author}</span>
              </div>
              <span style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 44, color: INK,
                letterSpacing: '-0.02em',
              }}>{curElo}</span>
              {r.hero && heroDelta > 0 && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 22, color: EMBER,
                  letterSpacing: '0.06em', minWidth: 120, textAlign: 'right',
                }}>↗ +{heroDelta}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Final card */}
      {finalP > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: BONE, opacity: finalP,
          padding: 80,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 48,
        }}>
          <VersuzMark size={280} progress={1}/>
          <div style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 130, lineHeight: 0.95, letterSpacing: '-0.04em',
            color: INK, textAlign: 'center',
          }}>
            <em style={{ color: EMBER }}>Live rankings</em><br/>every 24h.
          </div>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 80, color: INK, letterSpacing: '-0.02em',
          }}>versuz.dev</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VERTICAL: EDITORIAL BEAT — 1080×1920 · 8s · text-only manifesto
// ══════════════════════════════════════════════════════════════════════════
function SceneEditorial() {
  const time = useTime();

  // Each word gets its own beat
  const beats = [
    { text: 'Every.',      start: 0.4,  end: 1.6, italic: false, color: INK },
    { text: 'Skill.',      start: 1.6,  end: 2.8, italic: true,  color: EMBER },
    { text: 'Has.',        start: 2.8,  end: 4.0, italic: false, color: INK },
    { text: 'A.',          start: 4.0,  end: 4.6, italic: false, color: INK },
    { text: 'Rank.',       start: 4.6,  end: 6.4, italic: true,  color: EMBER, big: true },
  ];

  // Final card with mark: 6.6+
  const finalP = clamp((time - 6.6) / 0.6, 0, 1);

  // Tiny ember dot stays in upper-right throughout
  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={48} color="rgba(20,18,14,0.04)"/>

      {/* Decorative ember disc bottom-right */}
      <div aria-hidden style={{
        position: 'absolute',
        right: -200, bottom: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: EMBER,
        opacity: 0.1 + 0.05 * Math.sin(time * 1.2),
      }}/>

      {/* Top label */}
      <div style={{
        position: 'absolute', top: 60, left: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 18, color: INK2,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>Versuz · manifesto · v01</div>

      {/* Beats — each appears with overlap */}
      {beats.map((b, i) => {
        if (time < b.start) return null;
        const inP = clamp((time - b.start) / 0.3, 0, 1);
        const inEase = Easing.easeOutCubic(inP);
        // Last beat stays put, others fade out when next one starts
        const nextStart = beats[i + 1]?.start ?? Infinity;
        const outP = clamp((time - nextStart) / 0.3, 0, 1);
        // Last beat doesn't fade (Rank.) — it persists until final card
        const isLast = i === beats.length - 1;
        const opacity = (inEase) * (isLast ? 1 : (1 - outP));

        // Stacking — each beat slightly different position
        // Beats 0-3 stack from middle, beat 4 (final) is centered/big
        let cssLeft = 80, cssTop = 600;
        let fontSize = 220;
        if (b.big) {
          cssLeft = 60; cssTop = 700; fontSize = 380;
        } else {
          cssLeft = 80; cssTop = 500 + i * 80; fontSize = 220;
        }

        return (
          <div key={i} style={{
            position: 'absolute',
            left: cssLeft, top: cssTop,
            fontFamily: 'Instrument Serif, serif',
            fontStyle: b.italic ? 'italic' : 'normal',
            fontSize,
            lineHeight: 0.95,
            letterSpacing: '-0.05em',
            color: b.color,
            opacity,
            transform: `translateY(${(1 - inEase) * 30}px)`,
          }}>{b.text}</div>
        );
      })}

      {/* Final card mark */}
      {finalP > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: BONE, opacity: finalP,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 80, gap: 40,
        }}>
          <VersuzMark size={300} progress={1}/>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 100, color: INK, letterSpacing: '-0.02em',
          }}>versuz.dev</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 24, color: INK2,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: 'center',
          }}>The open arena<br/>for Claude skills</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VERTICAL: ELO NUMBER REVEAL — 1080×1920 · 6s · "1648"
// ══════════════════════════════════════════════════════════════════════════
function SceneNumberReveal() {
  const time = useTime();

  // Count-up: 0.6 → 2.6s, from 1000 to 1648
  const countP = clamp((time - 0.6) / 2.0, 0, 1);
  const countEase = Easing.easeOutCubic(countP);
  const counted = Math.round(1000 + (1648 - 1000) * countEase);

  // Eyebrow appears: 0.2 →
  const eyebrowP = clamp((time - 0.2) / 0.4, 0, 1);
  // ELO label appears: 2.6 →
  const labelP = clamp((time - 2.6) / 0.4, 0, 1);
  // Skill name appears: 3.0 →
  const skillP = clamp((time - 3.0) / 0.5, 0, 1);
  // Delta chip: 3.4 →
  const deltaP = clamp((time - 3.4) / 0.4, 0, 1);
  // Mark + URL: 4.2 →
  const ctaP = clamp((time - 4.2) / 0.5, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: INK_DEEP, overflow: 'hidden' }}>
      <GridBG color="rgba(246,244,239,0.04)" size={48}/>

      {/* Top eyebrow */}
      <div style={{
        position: 'absolute', top: 80, left: 60, right: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 20, color: EMBER,
        letterSpacing: '0.20em', textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between',
        opacity: eyebrowP,
      }}>
        <span>Versuz · cycle #184</span>
        <span style={{ color: 'rgba(246,244,239,0.5)' }}>Live</span>
      </div>

      {/* The big number */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 380,
        transform: 'translate(-50%, 0)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 360,
          fontWeight: 500,
          lineHeight: 0.9,
          letterSpacing: '-0.04em',
          color: BONE,
          fontVariantNumeric: 'tabular-nums',
          opacity: clamp(countP * 5, 0, 1),
        }}>{counted}</div>
        <div style={{
          marginTop: 16,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 36, color: EMBER,
          letterSpacing: '0.20em', textTransform: 'uppercase',
          opacity: labelP,
          transform: `translateY(${(1 - labelP) * 12}px)`,
        }}>ELO</div>
      </div>

      {/* Skill name */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 1050,
        transform: 'translate(-50%, 0)',
        textAlign: 'center',
        opacity: skillP,
      }}>
        <div style={{
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 140, color: EMBER, lineHeight: 1,
          letterSpacing: '-0.04em',
        }}>pdf-extract</div>
        <div style={{
          marginTop: 12,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22, color: 'rgba(246,244,239,0.5)',
          letterSpacing: '0.12em',
        }}>by anthropic-labs</div>
      </div>

      {/* Delta chip */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 1340,
        transform: `translate(-50%, 0) scale(${Easing.easeOutBack(deltaP)})`,
        padding: '16px 32px',
        background: EMBER,
        color: BONE,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 32, fontWeight: 500,
        letterSpacing: '0.10em',
        opacity: deltaP,
      }}>↗ +24 this cycle</div>

      {/* CTA bottom */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30,
        opacity: ctaP,
        transform: `translateY(${(1 - ctaP) * 20}px)`,
      }}>
        <VersuzMark size={140} progress={1} variant="dark"/>
        <div style={{
          fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
          fontSize: 80, color: BONE, letterSpacing: '-0.02em',
        }}>versuz.dev</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LINKEDIN — 1200×630 landscape · 10s · professional pitch
// ══════════════════════════════════════════════════════════════════════════
function SceneLinkedIn() {
  const time = useTime();

  // Left side: pitch text builds in
  // Right side: animated stat panel

  // Eyebrow: 0.2 → 0.8s
  const eyebrowP = clamp((time - 0.2) / 0.6, 0, 1);

  // Headline reveal: 0.8 → 3.0s
  const head1P = clamp((time - 0.8) / 0.6, 0, 1);
  const head2P = clamp((time - 1.6) / 0.6, 0, 1);
  const head3P = clamp((time - 2.4) / 0.6, 0, 1);

  // Sub copy: 3.4 → 4.4s
  const subP = clamp((time - 3.4) / 1.0, 0, 1);

  // CTA: 4.4 → 5.2s
  const ctaP = clamp((time - 4.4) / 0.8, 0, 1);

  // Right panel — stat board fades in: 1.0 → 2.0s
  const panelP = clamp((time - 1.0) / 1.0, 0, 1);

  // Right panel — leaderboard row climb: 5.0 → 6.0s
  const climbP = clamp((time - 5.0) / 1.0, 0, 1);
  const climbEase = Easing.easeInOutCubic(climbP);

  // Hold then subtle replay loop hint
  const finalCardP = clamp((time - 7.5) / 0.8, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={40}/>

      {/* Decorative ember disc bottom-right */}
      <div aria-hidden style={{
        position: 'absolute',
        right: -100, bottom: -100,
        width: 280, height: 280,
        borderRadius: '50%', background: EMBER,
        opacity: 0.96 * clamp((time - 0.6) * 1.4, 0, 1),
        transform: `scale(${clamp((time - 0.6) * 1.4, 0, 1)})`,
      }}/>

      {/* Top hairline */}
      <div style={{
        position: 'absolute', top: 40, left: 60, right: 60,
        height: 1, background: 'rgba(20,18,14,0.18)',
        transform: `scaleX(${clamp(time / 0.3, 0, 1)})`,
        transformOrigin: 'left',
      }}/>

      {/* Top eyebrow */}
      <div style={{
        position: 'absolute', top: 56, left: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: EMBER,
        letterSpacing: '0.20em', textTransform: 'uppercase',
        opacity: eyebrowP,
        transform: `translateY(${(1 - eyebrowP) * 8}px)`,
      }}>Now in public beta</div>
      <div style={{
        position: 'absolute', top: 56, right: 60,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13, color: INK2,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        opacity: eyebrowP,
      }}>Versuz · v01</div>

      {/* Left column: pitch */}
      <div style={{
        position: 'absolute',
        left: 60, top: 110, width: 600,
      }}>
        <div style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 70, lineHeight: 1, letterSpacing: '-0.03em',
          color: INK, fontWeight: 400,
        }}>
          <div style={{
            opacity: head1P,
            transform: `translateY(${(1 - head1P) * 16}px)`,
          }}>An open arena</div>
          <div style={{
            opacity: head2P,
            transform: `translateY(${(1 - head2P) * 16}px)`,
            marginTop: 6,
          }}>for Claude</div>
          <div style={{
            fontStyle: 'italic', color: EMBER,
            opacity: head3P,
            transform: `translateY(${(1 - head3P) * 16}px)`,
            marginTop: 6,
          }}>skills.</div>
        </div>

        <div style={{
          marginTop: 50,
          fontFamily: 'Instrument Serif, serif',
          fontSize: 22, lineHeight: 1.45,
          color: INK2, letterSpacing: '-0.01em',
          maxWidth: 540,
          opacity: subP,
          transform: `translateY(${(1 - subP) * 12}px)`,
        }}>
          Every 24 hours, the community's skills face three frontier model
          judges. Elo ratings, public bouts, transparent verdicts.
        </div>

        {/* CTA + logo */}
        <div style={{
          position: 'absolute', left: 0, top: 460,
          display: 'flex', alignItems: 'center', gap: 24,
          opacity: ctaP,
          transform: `translateY(${(1 - ctaP) * 12}px)`,
        }}>
          <div style={{
            padding: '14px 22px',
            background: INK,
            color: BONE,
            fontFamily: 'Geist, sans-serif',
            fontSize: 15, fontWeight: 500,
            letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            Submit your skill
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: EMBER }}>↗</span>
          </div>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 36, color: INK, letterSpacing: '-0.02em',
          }}>versuz.dev</div>
        </div>
      </div>

      {/* Right column: animated leaderboard panel */}
      <div style={{
        position: 'absolute',
        right: 60, top: 110, width: 480, height: 460,
        background: PAPER,
        border: '1px solid rgba(20,18,14,0.18)',
        padding: 24,
        opacity: panelP,
        transform: `translateY(${(1 - panelP) * 20}px)`,
      }}>
        {/* Panel header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: INK2,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          paddingBottom: 12,
          borderBottom: '1px solid rgba(20,18,14,0.18)',
        }}>
          <span>Cycle #184 · live</span>
          <span style={{ color: EMBER }}>↗ rank-up</span>
        </div>

        {/* Leaderboard rows */}
        <RightLeaderboard time={time} climbEase={climbEase}/>
      </div>

      {/* Mark in bottom-left area */}
      <div style={{
        position: 'absolute',
        left: 60, bottom: 50,
        opacity: ctaP,
      }}>
        <VersuzMark size={64} progress={1}/>
      </div>

      {/* Bottom hairline */}
      <div style={{
        position: 'absolute', bottom: 40, left: 60, right: 60,
        height: 1, background: 'rgba(20,18,14,0.18)',
        transform: `scaleX(${clamp((time - 0.4) / 0.3, 0, 1)})`,
        transformOrigin: 'left',
      }}/>
    </div>
  );
}

function RightLeaderboard({ time, climbEase }) {
  const rows = [
    { id: 'sql-genie',   pre: 1624, post: 1624, preR: 0, postR: 1 },
    { id: 'csv-surgeon', pre: 1612, post: 1612, preR: 1, postR: 2 },
    { id: 'web-scry',    pre: 1605, post: 1605, preR: 2, postR: 3 },
    { id: 'pdf-extract', pre: 1518, post: 1648, preR: 3, postR: 0, hero: true },
  ];
  const rowH = 68;

  return (
    <div style={{ position: 'relative', marginTop: 20, height: rowH * rows.length }}>
      {rows.map((r, i) => {
        const curRank = r.preR + (r.postR - r.preR) * climbEase;
        const y = curRank * rowH;
        const curElo = Math.round(r.pre + (r.post - r.pre) * climbEase);
        const inP = clamp((time - 1.6 - i * 0.1) / 0.4, 0, 1);
        const heroDelta = r.hero ? Math.round((r.post - r.pre) * climbEase) : 0;

        return (
          <div key={r.id} style={{
            position: 'absolute', left: 0, right: 0,
            top: y, height: rowH - 8,
            background: r.hero && Math.round(curRank) === 0 ? 'rgba(194,65,12,0.10)' : 'transparent',
            display: 'flex', alignItems: 'center',
            padding: '0 12px',
            gap: 14,
            opacity: inP,
            transform: `translateX(${(1 - inP) * 20}px)`,
            willChange: 'top',
            borderBottom: '1px solid rgba(20,18,14,0.08)',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13, color: INK2, minWidth: 32,
            }}>#{String(Math.round(curRank) + 1).padStart(2, '0')}</span>
            <span style={{
              flex: 1,
              fontFamily: 'Instrument Serif, serif',
              fontStyle: r.hero ? 'italic' : 'normal',
              fontSize: 26, color: r.hero ? EMBER : INK,
              letterSpacing: '-0.02em',
            }}>{r.id}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18, color: INK,
              fontVariantNumeric: 'tabular-nums',
            }}>{curElo}</span>
            {r.hero && heroDelta > 0 && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, color: EMBER, minWidth: 50, textAlign: 'right',
              }}>↗+{heroDelta}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Register new scenes
window.VERSUZ_SCENES = window.VERSUZ_SCENES || {};
Object.assign(window.VERSUZ_SCENES, {
  logoReveal: {
    title: 'Logo Reveal', subtitle: 'Spark to bloom — the mark only',
    width: 1080, height: 1080, duration: 6,
    Component: SceneLogoReveal, format: '1:1 · 6s', group: 'Logo',
  },
  vCount: {
    title: '247 → 1', subtitle: 'rapid count to leader',
    width: 1080, height: 1920, duration: 7,
    Component: SceneCount247to1, format: '9:16 · 7s', group: 'TikTok / Insta',
  },
  vBout: {
    title: 'Live bout', subtitle: 'two skills face off',
    width: 1080, height: 1920, duration: 8,
    Component: SceneLiveBout, format: '9:16 · 8s', group: 'TikTok / Insta',
  },
  vBracket: {
    title: 'Bracket', subtitle: '8 → 1 tournament fill',
    width: 1080, height: 1920, duration: 8,
    Component: SceneBracket, format: '9:16 · 8s', group: 'TikTok / Insta',
  },
  vClimb: {
    title: 'Leaderboard climb', subtitle: '#8 → #1 rank-up',
    width: 1080, height: 1920, duration: 8,
    Component: SceneLeaderboardClimb, format: '9:16 · 8s', group: 'TikTok / Insta',
  },
  vEditorial: {
    title: 'Editorial beat', subtitle: 'text-only manifesto',
    width: 1080, height: 1920, duration: 8,
    Component: SceneEditorial, format: '9:16 · 8s', group: 'TikTok / Insta',
  },
  vNumber: {
    title: '1648 ELO', subtitle: 'big number reveal',
    width: 1080, height: 1920, duration: 6,
    Component: SceneNumberReveal, format: '9:16 · 6s', group: 'TikTok / Insta',
  },
  linkedin: {
    title: 'LinkedIn post', subtitle: 'pitch + stat panel',
    width: 1200, height: 630, duration: 9,
    Component: SceneLinkedIn, format: '1.91:1 · 9s', group: 'LinkedIn',
  },
});
