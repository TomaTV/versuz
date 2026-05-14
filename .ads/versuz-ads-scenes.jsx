// Versuz ad scenes — 5 distinct animated ads.
// Each scene is a React component that lives inside a <Stage>.
// Stage dimensions are set by the host page based on which scene is active.

const {
  Stage, Sprite, useTime, useSprite, useTimeline,
  Easing, interpolate, animate, clamp,
  VersuzMark, EmberStar, VersuzWordmark, VersuzWordmarkSVG,
  EMBER_PATH, V_PATH,
} = window;

// Brand color tokens (single source of truth for ads)
const BONE   = '#F2EEE6';
const PAPER  = '#ECE7DD';
const INK    = '#151411';
const INK2   = '#6B6557';
const EMBER  = '#C2410C';
const SAGE   = '#3F7D4F';
const AMBER  = '#D69E2E';

// ─── Utilities ────────────────────────────────────────────────────────────
function useTypeIn(text, start, end) {
  const time = useTime();
  const local = clamp((time - start) / (end - start), 0, 1);
  const n = Math.floor(local * text.length + 0.0001);
  return text.slice(0, n);
}

// A staggered word-reveal: returns per-word { opacity, y }
function useWordReveal(words, start, perWord = 0.08, ease = Easing.easeOutCubic) {
  const time = useTime();
  return words.map((_, i) => {
    const t0 = start + i * perWord;
    const t1 = t0 + 0.5;
    const p = clamp((time - t0) / (t1 - t0), 0, 1);
    const e = ease(p);
    return { opacity: e, y: (1 - e) * 18 };
  });
}

// ─── Shared bits ──────────────────────────────────────────────────────────

// Grid background — subtle 40px grid like the brand uses
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

// Mono caption (top-left or wherever) — frame ID etc.
function MonoCaption({ text, x = 32, y = 32, color = INK2, size = 12 }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: size,
      color,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    }}>{text}</div>
  );
}

// Editorial frame corner ticks
function FrameCorners({ inset = 24, color = INK, size = 22, thick = 2, opacity = 1 }) {
  const arms = [
    { top: inset, left: inset, borderTop: `${thick}px solid ${color}`, borderLeft: `${thick}px solid ${color}` },
    { top: inset, right: inset, borderTop: `${thick}px solid ${color}`, borderRight: `${thick}px solid ${color}` },
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

// ══════════════════════════════════════════════════════════════════════════
// SCENE 1: BRAND ANTHEM — 16:9 · 1920×1080 · 10s
// ══════════════════════════════════════════════════════════════════════════
function SceneBrandAnthem() {
  const time = useTime();

  // Top stripe draws 0 → 1s
  const stripeP = Easing.easeOutCubic(clamp(time / 1.0, 0, 1));

  // Mark + wordmark eyebrow 0.4 → 1.8s
  const eyebrowP = Easing.easeOutCubic(clamp((time - 0.4) / 1.4, 0, 1));

  // Headline 1 "Skills go in." 1.8 → 3.4s
  const head1 = useWordReveal(['Skills', 'go', 'in.'], 1.8, 0.16, Easing.easeOutCubic);

  // Headline 2 italic "Only one wins." 3.6 → 5.2s
  const head2 = useWordReveal(['Only', 'one', 'wins.'], 3.6, 0.18, Easing.easeOutCubic);

  // Description fade-in 5.4 → 6.4s
  const descP = Easing.easeOutCubic(clamp((time - 5.4) / 1.0, 0, 1));

  // Footer fade-in 6.6 → 7.6s
  const footP = Easing.easeOutCubic(clamp((time - 6.6) / 1.0, 0, 1));

  // Subtle ember pulse on "one" 7.8 → 9.0s
  const pulseT = clamp((time - 7.8) / 1.2, 0, 1);
  const pulse = pulseT > 0 ? 1 + 0.04 * Math.sin(pulseT * Math.PI) : 1;

  // Content fade-out before outro : 8.4 → 9.0s
  const contentFade = 1 - Easing.easeInOutCubic(clamp((time - 8.4) / 0.6, 0, 1));

  // Outro : bone overlay covers 8.4 → 9.0, mark assembles 9.0 → 10.2, wordmark 10.0 → 10.8
  const outroP = clamp((time - 8.4) / 0.6, 0, 1);
  const outroMark = Easing.easeOutCubic(clamp((time - 9.0) / 1.2, 0, 1));
  const outroWord = Easing.easeOutCubic(clamp((time - 10.0) / 0.8, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      {/* Top 4-color stripe (brand) — matches OG image */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 10,
        display: 'flex',
        transform: `scaleX(${stripeP})`, transformOrigin: 'left',
      }}>
        <div style={{ flex: 1.4, background: EMBER }}/>
        <div style={{ flex: 1, background: '#e5a644' }}/>
        <div style={{ flex: 1, background: '#2a5fa8' }}/>
        <div style={{ flex: 1, background: '#3f7d4f' }}/>
      </div>

      {/* Eyebrow row : VERSUZ + THE OPEN PUBLIC BENCHMARK */}
      <div style={{
        position: 'absolute', top: 64, left: 100, right: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: INK2,
        opacity: eyebrowP,
        transform: `translateY(${(1 - eyebrowP) * 8}px)`,
      }}>
        <span style={{ color: INK, fontWeight: 500, letterSpacing: '0.2em' }}>VERSUZ</span>
        <span>THE OPEN PUBLIC BENCHMARK</span>
      </div>

      {/* Headline 1 : "Skills go in." */}
      <div style={{
        position: 'absolute',
        left: 100, top: 240,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 200, lineHeight: 1, letterSpacing: '-0.02em',
        fontWeight: 400, color: INK,
        height: 200, display: 'flex', alignItems: 'center',
      }}>
        {['Skills', ' ', 'go', ' ', 'in.'].map((w, i) => {
          const idx = i === 0 ? 0 : i === 2 ? 1 : i === 4 ? 2 : -1;
          if (idx < 0) return <span key={i}>{w}</span>;
          const r = head1[idx];
          return (
            <span key={i} style={{
              display: 'inline-block',
              opacity: r.opacity,
              transform: `translateY(${r.y}px)`,
              willChange: 'transform, opacity',
            }}>{w}</span>
          );
        })}
      </div>

      {/* Headline 2 : italic "Only [one] wins." — only "one" ember */}
      <div style={{
        position: 'absolute',
        left: 100, top: 470,
        fontFamily: 'Instrument Serif, serif',
        fontStyle: 'italic',
        fontSize: 200, lineHeight: 1, letterSpacing: '-0.02em',
        fontWeight: 400,
        height: 200, display: 'flex', alignItems: 'center',
      }}>
        {[
          { w: 'Only', color: INK },
          { w: ' ', color: INK },
          { w: 'one', color: EMBER, pulse: true },
          { w: ' ', color: INK },
          { w: 'wins.', color: INK },
        ].map((part, i) => {
          const idx = i === 0 ? 0 : i === 2 ? 1 : i === 4 ? 2 : -1;
          if (idx < 0) return <span key={i} style={{ color: part.color }}>{part.w}</span>;
          const r = head2[idx];
          return (
            <span key={i} style={{
              display: 'inline-block',
              color: part.color,
              opacity: r.opacity,
              transform: `translateY(${r.y}px) ${part.pulse ? `scale(${pulse})` : ''}`,
              transformOrigin: 'center',
              willChange: 'transform, opacity',
            }}>{part.w}</span>
          );
        })}
      </div>

      {/* Description */}
      <div style={{
        position: 'absolute',
        left: 100, right: 100, top: 730,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 38, lineHeight: 1.45,
        color: INK,
        opacity: 0.78 * descP,
        transform: `translateY(${(1 - descP) * 10}px)`,
        maxWidth: 1400,
      }}>
        ~100,000 SKILL.md and CLAUDE.md files, judged by 3 frontier models. Open data. Free CLI.
      </div>

      {/* Footer hairline */}
      <div style={{
        position: 'absolute', left: 100, right: 100, bottom: 110,
        height: 1, background: 'rgba(20,18,14,0.18)',
        transform: `scaleX(${footP})`, transformOrigin: 'left',
      }}/>

      {/* Footer row : agent names + versuz.dev */}
      <div style={{
        position: 'absolute', left: 100, right: 100, bottom: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: footP,
        transform: `translateY(${(1 - footP) * 8}px)`,
      }}>
        <div style={{
          display: 'flex', gap: 28,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 20, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: INK2,
        }}>
          <span>CLAUDE CODE</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>CURSOR</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>CODEX</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>MCP</span>
        </div>
        <span style={{
          fontFamily: 'Instrument Serif, serif',
          fontStyle: 'italic',
          fontSize: 56,
          color: EMBER,
          lineHeight: 1,
        }}>versuz.dev</span>
      </div>

      {/* OUTRO — bone overlay fades in to clear the stage */}
      <div style={{
        position: 'absolute', inset: 0,
        background: BONE,
        opacity: Easing.easeInOutCubic(clamp((time - 8.4) / 0.6, 0, 1)),
        pointerEvents: 'none',
      }} />

      {/* Top stripe (kept visible during outro) */}
      {outroP > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 10,
          display: 'flex',
          opacity: outroP,
        }}>
          <div style={{ flex: 1.4, background: EMBER }}/>
          <div style={{ flex: 1, background: '#e5a644' }}/>
          <div style={{ flex: 1, background: '#2a5fa8' }}/>
          <div style={{ flex: 1, background: '#3f7d4f' }}/>
        </div>
      )}

      {/* Outro logo center */}
      {outroP > 0 && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '46%',
          transform: 'translate(-50%, -50%)',
        }}>
          <VersuzMark size={280} progress={outroMark}/>
        </div>
      )}

      {/* Outro wordmark + tagline */}
      {outroWord > 0 && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '64%',
          transform: `translate(-50%, ${(1 - outroWord) * 12}px)`,
          opacity: outroWord,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic',
            fontSize: 88,
            color: EMBER,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>versuz.dev</span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 18, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: INK2,
          }}>Skills go in. Only one wins.</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SCENE 2: VERTICAL REEL — 9:16 · 1080×1920 · 8s
// ══════════════════════════════════════════════════════════════════════════
function SceneVerticalReel() {
  const time = useTime();

  // Star burst at top
  const starProg = clamp((time - 0.15) / 0.55, 0, 1);
  const starScale = Easing.easeOutBack(starProg);

  // Headline stack
  const headWords = useWordReveal(['Which', 'Claude', 'skill'], 0.6, 0.16);
  // "WINS?" — italic ember, big
  const winsP = clamp((time - 1.5) / 0.6, 0, 1);
  const winsEase = Easing.easeOutBack(winsP);

  // Race bars — three skills racing
  const raceStart = 2.4;
  const raceEnd = 5.4;
  const raceP = clamp((time - raceStart) / (raceEnd - raceStart), 0, 1);
  const skills = [
    { name: 'pdf-extract', target: 1.00, color: EMBER, author: 'anthropic-labs' },
    { name: 'pdf-fast',    target: 0.72, color: INK,    author: 'maple' },
    { name: 'pdf-quick',   target: 0.48, color: INK2,   author: 'rowan' },
  ];

  // Winner crowned: 5.5 → 6.5s
  const crownP = clamp((time - 5.5) / 0.8, 0, 1);

  // CTA: 6.5 → 7.5s
  const ctaP = clamp((time - 6.5) / 0.6, 0, 1);

  // Outro : bone overlay 7.8 → 8.4, mark 8.4 → 9.6, wordmark 9.2 → 10
  const outroP = clamp((time - 7.8) / 0.6, 0, 1);
  const outroMark = Easing.easeOutCubic(clamp((time - 8.4) / 1.2, 0, 1));
  const outroWord = Easing.easeOutCubic(clamp((time - 9.2) / 0.8, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={48}/>
      <FrameCorners inset={36} color={INK} size={28} thick={3} opacity={clamp(time / 0.4, 0, 1)}/>

      {/* Mono header */}
      <Sprite start={0.1} end={8}>
        <MonoCaption text="Versuz · live" x={48} y={48} size={16}/>
        <div style={{
          position: 'absolute', top: 48, right: 48,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 16,
          color: INK2, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>#184</div>
      </Sprite>

      {/* Top ember star */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 140,
        transform: `translate(-50%, 0) scale(${starScale}) rotate(${(1 - starProg) * -45}deg)`,
        opacity: starProg,
        transformOrigin: 'center',
      }}>
        <EmberStar size={220} progress={1}/>
      </div>

      {/* "Which Claude skill" stack */}
      <div style={{
        position: 'absolute',
        left: 80, right: 80, top: 400,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 130, lineHeight: 0.95, letterSpacing: '-0.04em',
        color: INK,
      }}>
        {['Which', 'Claude', 'skill'].map((w, i) => {
          const r = headWords[i];
          return (
            <div key={i} style={{
              opacity: r.opacity,
              transform: `translateY(${r.y}px)`,
              willChange: 'transform, opacity',
            }}>{w}</div>
          );
        })}
      </div>

      {/* WINS? — italic ember, oversized */}
      <div style={{
        position: 'absolute',
        left: 80, top: 780,
        fontFamily: 'Instrument Serif, serif',
        fontStyle: 'italic',
        fontSize: 200, lineHeight: 0.95, letterSpacing: '-0.05em',
        color: EMBER,
        opacity: winsP,
        transform: `translate(${(1 - winsEase) * -40}px, 0)`,
      }}>wins?</div>

      {/* Leader badge — positioned ABOVE the race bars, clearly separated */}
      <div style={{
        position: 'absolute',
        left: 80, top: 1020,
        opacity: crownP,
        transform: `translateY(${(1 - crownP) * 8}px)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 14px',
          background: EMBER, color: BONE,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 16, letterSpacing: '0.16em', textTransform: 'uppercase',
          fontWeight: 600,
        }}>★ Winner · Cycle 184</div>
      </div>

      {/* Three race bars — moved up to start at top: 1080 */}
      <Sprite start={raceStart} end={8}>
        {({ localTime }) => {
          return (
            <div style={{
              position: 'absolute',
              left: 80, right: 80, top: 1080,
              display: 'flex', flexDirection: 'column', gap: 42,
            }}>
              {skills.map((s, i) => {
                const rowP = clamp((localTime - i * 0.15) / 1.8, 0, 1);
                const filled = Easing.easeOutCubic(rowP) * s.target;
                const slideY = (1 - Easing.easeOutCubic(rowP)) * 30;
                return (
                  <div key={s.name} style={{
                    transform: `translateY(${slideY}px)`,
                    opacity: rowP,
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 22, color: INK2,
                      letterSpacing: '0.06em', marginBottom: 14,
                    }}>
                      <span style={{ color: INK, fontFamily: 'Instrument Serif, serif',
                        fontStyle: 'italic', fontSize: 44, letterSpacing: '-0.02em' }}>
                        {s.name}
                      </span>
                      <span>{(filled * 2000).toFixed(0)} Elo</span>
                    </div>
                    <div style={{
                      position: 'relative',
                      height: 18,
                      background: 'rgba(20,18,14,0.10)',
                    }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0,
                        width: `${filled * 100}%`, height: '100%',
                        background: s.color,
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }}
      </Sprite>

      {/* CTA bar at bottom */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0, height: 180,
        background: INK,
        display: 'flex', alignItems: 'center',
        padding: '0 80px',
        transform: `translateY(${(1 - ctaP) * 200}px)`,
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>
          <VersuzMark size={110} progress={1} variant="dark"/>
          <div style={{
            fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
            fontSize: 64, color: BONE, letterSpacing: '-0.02em',
          }}>versuz.dev</div>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 22,
          color: EMBER, letterSpacing: '0.18em', textTransform: 'uppercase',
          textAlign: 'right',
        }}>Submit your<br/>skill →</div>
      </div>

      {/* OUTRO — bone overlay covers the stage */}
      <div style={{
        position: 'absolute', inset: 0,
        background: BONE,
        opacity: outroP,
        pointerEvents: 'none',
      }} />

      {/* Outro logo center */}
      {outroP > 0 && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '42%',
          transform: 'translate(-50%, -50%)',
        }}>
          <VersuzMark size={320} progress={outroMark}/>
        </div>
      )}

      {/* Outro wordmark + tagline */}
      {outroWord > 0 && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '60%',
          transform: `translate(-50%, ${(1 - outroWord) * 16}px)`,
          opacity: outroWord,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <span style={{
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic',
            fontSize: 120,
            color: EMBER,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>versuz.dev</span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 22, letterSpacing: '0.24em',
            textTransform: 'uppercase', color: INK2,
            textAlign: 'center',
          }}>Skills go in.<br/>Only one wins.</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SCENE 3: SQUARE SOCIAL — 1080×1080 · 7s · "16 in, 1 out"
// ══════════════════════════════════════════════════════════════════════════
function SceneSquareElim() {
  const time = useTime();

  // 16 skill names in a 4×4 grid
  const skills = [
    'pdf-extract','sql-genie','csv-surgeon','web-scry',
    'pdf-fast','code-fixer','schema-doc','test-gen',
    'prose-tidy','agent-router','plan-builder','qa-pair',
    'rag-recall','image-tag','spec-writer','migrator',
  ];
  // Elimination order (winners stay longest). index 0 = pdf-extract = winner.
  // Round 1: knock out indices [3,5,8,10,12,13,14,15] at 1.8s
  // Round 2: knock out [1,4,9,11] at 2.8s
  // Round 3: knock out [2,6,7] at 3.8s
  // Winner: 0
  const elim = {
    3: 1.8, 5: 1.8, 8: 1.8, 10: 1.8, 12: 1.8, 13: 1.8, 14: 1.8, 15: 1.8,
    1: 2.8, 4: 2.8, 9: 2.8, 11: 2.8,
    2: 3.8, 6: 3.8, 7: 3.8,
    // 0 never eliminated
  };

  // Grid in 1080×1080
  const gridLeft = 90, gridTop = 280, gridSize = 900;
  const cell = gridSize / 4;

  // Winner zoom: 4.4 → 5.8s (slowed for breathing room)
  const winP = clamp((time - 4.4) / 1.4, 0, 1);
  const winEase = Easing.easeInOutCubic(winP);

  // Final card: 6.2 → 7.4s (then holds 1.6s)
  const finalP = clamp((time - 6.2) / 1.2, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={36}/>

      {/* Top label */}
      <Sprite start={0.0} end={9}>
        <MonoCaption text="Versuz · cycle #184 · pdf utilities" x={48} y={48} size={16}/>
        <div style={{
          position: 'absolute', top: 48, right: 48,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 16,
          color: EMBER, letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>16 → 1</div>
      </Sprite>

      {/* Headline */}
      <Sprite start={0.2} end={4.4}>
        {({ progress }) => {
          const fade = clamp(progress * 6, 0, 1) - clamp((progress - 0.85) * 6, 0, 1);
          return (
            <div style={{
              position: 'absolute', left: 60, top: 110,
              fontFamily: 'Instrument Serif, serif',
              fontSize: 88, lineHeight: 0.95, letterSpacing: '-0.04em',
              color: INK, opacity: fade,
            }}>
              One <em style={{ color: EMBER }}>winner</em>.
            </div>
          );
        }}
      </Sprite>

      {/* The 4×4 grid */}
      {!winP && skills.map((name, i) => null)}

      <Sprite start={0.4} end={9}>
        <div style={{
          position: 'absolute',
          left: gridLeft, top: gridTop,
          width: gridSize, height: gridSize,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          {skills.map((name, i) => {
            const appearT = i * 0.04;
            const appearP = clamp((time - 0.4 - appearT) / 0.4, 0, 1);
            const eliminated = elim[i] != null && time >= elim[i];
            const elimP = elim[i] != null ? clamp((time - elim[i]) / 0.5, 0, 1) : 0;

            // Winner (index 0): when winP > 0, zoom to fill grid
            const isWinner = i === 0;
            const dim = !isWinner && eliminated;
            const cellWinnerScale = isWinner ? 1 + 0.0 * winEase : 1;
            const cellOpacity = isWinner
              ? 1
              : eliminated
                ? (1 - elimP) * 0.3 + 0.0
                : Easing.easeOutCubic(appearP);

            // After winP starts, all other cells fade out (slower for breathing)
            const finalDimming = clamp((time - 4.4) / 1.0, 0, 1);
            const otherFade = isWinner ? 1 : 1 - finalDimming;

            // Winner expands to fill grid: translate + scale
            const winnerRow = Math.floor(0 / 4); // = 0
            const winnerCol = 0 % 4; // = 0
            const winnerTx = isWinner
              ? winEase * ((gridSize - cell) / 2 - winnerCol * (cell + 12))
              : 0;
            const winnerTy = isWinner
              ? winEase * ((gridSize - cell) / 2 - winnerRow * (cell + 12))
              : 0;
            const winnerScale = isWinner ? 1 + winEase * 2.4 : 1;

            return (
              <div key={name} style={{
                background: PAPER,
                border: `1px solid rgba(20,18,14,${dim ? 0.05 : 0.18})`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8,
                position: 'relative',
                opacity: cellOpacity * otherFade,
                transform: `translate(${winnerTx}px, ${winnerTy}px) scale(${winnerScale})`,
                transformOrigin: 'center',
                willChange: 'transform, opacity',
                filter: dim ? 'grayscale(1)' : 'none',
                transition: 'none',
                zIndex: isWinner ? 10 : 1,
              }}>
                {/* X strikethrough on eliminated */}
                {dim && (
                  <svg viewBox="0 0 100 100" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                  }}>
                    <line x1="10" y1="10" x2="90" y2="90"
                      stroke={INK} strokeWidth="0.6"
                      strokeDasharray="120"
                      strokeDashoffset={(1 - elimP) * 120}
                      opacity="0.55"/>
                  </svg>
                )}
                {/* Skill name */}
                <span style={{
                  fontFamily: 'Instrument Serif, serif',
                  fontSize: isWinner ? 20 + winEase * 40 : 20,
                  letterSpacing: '-0.02em',
                  fontStyle: isWinner ? 'italic' : 'normal',
                  color: isWinner ? EMBER : INK,
                  textAlign: 'center',
                  lineHeight: 1.1,
                  padding: '0 8px',
                }}>{name}</span>
                {isWinner && winP > 0.4 && (
                  <div style={{
                    position: 'absolute', bottom: 24,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10 + winEase * 6, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: INK,
                    opacity: clamp((winP - 0.4) / 0.4, 0, 1),
                  }}>★ Winner · 1648 Elo</div>
                )}
                {isWinner && winP > 0.6 && (
                  <div style={{
                    position: 'absolute', top: 24,
                    opacity: clamp((winP - 0.6) / 0.4, 0, 1),
                  }}>
                    <EmberStar size={48} progress={1}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Sprite>

      {/* Final card overlay — versuz.dev */}
      {finalP > 0 && (
        <div style={{
          position: 'absolute',
          left: 60, right: 60, bottom: 60,
          padding: '32px 40px',
          background: INK, color: BONE,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          opacity: finalP,
          transform: `translateY(${(1 - finalP) * 24}px)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <VersuzMark size={70} progress={1} variant="dark"/>
            <div style={{
              fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
              fontSize: 56, color: BONE, letterSpacing: '-0.02em', lineHeight: 1,
            }}>versuz.dev</div>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
            color: EMBER, letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: 'right', lineHeight: 1.6,
          }}>The open<br/>arena ↗</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SCENE 4: BANNER LOOP — 1920×320 · 6s
// ══════════════════════════════════════════════════════════════════════════
function SceneBanner() {
  const time = useTime();

  // Mark slides in from left: 0 → 0.7s
  const markP = clamp(time / 0.7, 0, 1);
  const markEase = Easing.easeOutCubic(markP);
  const markX = -200 + 280 * markEase;

  // Wordmark types in: 0.5 → 1.4s
  const wmP = clamp((time - 0.5) / 0.9, 0, 1);

  // Divider draws: 1.4 → 1.8s
  const divP = clamp((time - 1.4) / 0.4, 0, 1);

  // Tagline reveals: 1.6 → 2.6s
  const tagText = useTypeIn('the open arena for claude skills', 1.6, 3.0);

  // Stat ticker: 3.0 onwards
  const statP = clamp((time - 3.0) / 0.6, 0, 1);

  // CTA pulse-in: 3.6 → 4.2s
  const ctaP = clamp((time - 3.6) / 0.6, 0, 1);

  // Sparkle pulse on mark (continuous)
  const pulse = 0.92 + 0.08 * Math.sin(time * 3);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden',
      display: 'flex', alignItems: 'center' }}>
      {/* Hairlines top/bottom */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(20,18,14,0.18)' }}/>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'rgba(20,18,14,0.18)' }}/>

      {/* Mark */}
      <div style={{
        position: 'absolute',
        left: markX,
        top: '50%',
        transform: `translate(0, -50%) scale(${pulse})`,
        opacity: markEase,
      }}>
        <VersuzMark size={220} progress={1}/>
      </div>

      {/* Wordmark */}
      <div style={{
        position: 'absolute',
        left: 270, top: '50%',
        transform: 'translate(0, -50%)',
      }}>
        <div style={{ height: 88 }}>
          <VersuzWordmarkSVG height={88} variant="dark" progress={wmP}/>
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{
        position: 'absolute', left: 660, top: 80, bottom: 80, width: 1,
        background: 'rgba(20,18,14,0.30)',
        transform: `scaleY(${divP})`, transformOrigin: 'top',
      }}/>

      {/* Tagline + stats */}
      <div style={{
        position: 'absolute', left: 700, top: 90,
        fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
        fontSize: 60, color: INK, letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {tagText}<span style={{
          opacity: time % 1 > 0.5 ? 0 : 1,
          color: EMBER,
        }}>|</span>
      </div>

      <div style={{
        position: 'absolute', left: 700, top: 180,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 16,
        color: INK2, letterSpacing: '0.18em', textTransform: 'uppercase',
        display: 'flex', gap: 24, alignItems: 'center',
        opacity: statP,
        transform: `translateY(${(1 - statP) * 10}px)`,
      }}>
        <span>247 skills</span>
        <span style={{ color: 'rgba(20,18,14,0.25)' }}>·</span>
        <span>30-day cycles</span>
        <span style={{ color: 'rgba(20,18,14,0.25)' }}>·</span>
        <span style={{ color: EMBER }}>3 frontier judges</span>
      </div>

      {/* CTA on right */}
      <div style={{
        position: 'absolute', right: 80, top: '50%',
        transform: `translate(0, -50%) translateX(${(1 - Easing.easeOutCubic(ctaP)) * 40}px)`,
        opacity: ctaP,
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '24px 36px',
        background: INK, color: BONE,
        fontFamily: 'Geist, system-ui, sans-serif',
        fontSize: 22, fontWeight: 500, letterSpacing: '0.02em',
      }}>
        Submit your skill
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: EMBER }}>↗</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SCENE 5: TERMINAL DEMO — 16:9 · 1920×1080 · 11s
// ══════════════════════════════════════════════════════════════════════════
function SceneTerminal() {
  const time = useTime();

  // Terminal window fades in: 0 → 0.6s
  const winP = clamp(time / 0.6, 0, 1);

  // Type command: 0.6 → 2.4s
  const cmdText = useTypeIn('$ npx versuz submit ./pdf-extract', 0.6, 2.4);
  const enterPress = time > 2.5;

  // Build line: 2.6
  const buildShow = time > 2.6;
  // Spinner: 2.6 → 3.8s
  const spinnerActive = time > 2.6 && time < 4.0;

  // Judge lines stream in
  const judges = [
    { name: 'opus-4.7',    text: 'pdf-extract  vs  pdf-fast    → pdf-extract', verdict: 'win',  at: 4.0 },
    { name: 'gpt-5.5',     text: 'pdf-extract  vs  csv-surgeon → pdf-extract', verdict: 'win',  at: 4.6 },
    { name: 'gemini-3.1',  text: 'pdf-extract  vs  prose-tidy  → pdf-extract', verdict: 'win',  at: 5.2 },
  ];

  // Elo delta line: 5.8s
  const eloShow = time > 5.9;
  const eloP = clamp((time - 5.9) / 0.5, 0, 1);

  // Cut to leaderboard: 6.6 → 7.0s
  const cutP = clamp((time - 6.6) / 0.4, 0, 1);

  // Leaderboard climb: 7.2 → 8.6s
  const lbP = clamp((time - 7.2) / 1.4, 0, 1);

  // Final stamp: 9.2 → 10s
  const stampP = clamp((time - 9.2) / 0.6, 0, 1);

  // Spinner char
  const spinChars = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  const spinChar = spinChars[Math.floor(time * 12) % spinChars.length];

  return (
    <div style={{ position: 'absolute', inset: 0, background: INK, overflow: 'hidden' }}>
      {/* Phase 1: terminal */}
      {cutP < 1 && (
        <div style={{
          position: 'absolute', inset: 0,
          opacity: 1 - cutP,
          background: INK,
        }}>
          {/* Terminal window */}
          <div style={{
            position: 'absolute',
            left: 160, top: 110, width: 1600, height: 860,
            background: '#0E0D0B',
            border: `1px solid rgba(246,244,239,0.10)`,
            opacity: winP,
            transform: `scale(${0.96 + 0.04 * winP})`,
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Title bar */}
            <div style={{
              height: 48,
              display: 'flex', alignItems: 'center',
              padding: '0 20px',
              borderBottom: '1px solid rgba(246,244,239,0.08)',
              gap: 8,
            }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3F3A33' }}/>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3F3A33' }}/>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3F3A33' }}/>
              <span style={{
                marginLeft: 24,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                color: 'rgba(246,244,239,0.45)', letterSpacing: '0.04em',
              }}>~/projects/pdf-extract — versuz · submit</span>
            </div>

            {/* Body */}
            <div style={{
              flex: 1,
              padding: '32px 40px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 22,
              lineHeight: 1.55,
              color: '#E8E2D4',
              letterSpacing: '0.01em',
              overflow: 'hidden',
            }}>
              {/* Command line */}
              <div>
                <span style={{ color: '#6B6557' }}>{cmdText.slice(0, 2)}</span>
                <span>{cmdText.slice(2)}</span>
                {!enterPress && (
                  <span style={{
                    display: 'inline-block', width: 12, height: 22,
                    marginLeft: 4, marginBottom: -4,
                    background: '#E8E2D4',
                    opacity: time % 1 > 0.5 ? 0 : 1,
                  }}/>
                )}
              </div>

              {/* Building line */}
              {buildShow && (
                <div style={{ marginTop: 24, color: '#6B6557' }}>
                  <span style={{ color: EMBER, display: 'inline-block', width: 28 }}>
                    {spinnerActive ? spinChar : '✓'}
                  </span>
                  packaging skill · resolving deps · uploading
                </div>
              )}

              {/* Cycle header */}
              {time > 3.9 && (
                <div style={{ marginTop: 32, color: '#6B6557' }}>
                  <div style={{ color: '#E8E2D4', marginBottom: 8 }}>
                    <span style={{ color: EMBER }}>▶</span> Cycle #184 · 3 bouts against incumbent leaders
                  </div>
                </div>
              )}

              {/* Judge lines */}
              {judges.map((j, i) => {
                if (time < j.at) return null;
                const jp = clamp((time - j.at) / 0.4, 0, 1);
                return (
                  <div key={j.name} style={{
                    marginTop: 8,
                    opacity: jp,
                    transform: `translateX(${(1 - jp) * 16}px)`,
                    color: '#E8E2D4',
                  }}>
                    <span style={{
                      display: 'inline-block', width: 130,
                      color: '#2A5FA8', letterSpacing: '0.04em',
                    }}>{j.name}</span>
                    <span style={{ color: '#6B6557' }}>│  </span>
                    <span>{j.text.split('→')[0]}</span>
                    <span style={{ color: '#6B6557' }}>→ </span>
                    <span style={{ color: SAGE, fontWeight: 500 }}>{j.text.split('→')[1].trim()}</span>
                    <span style={{ marginLeft: 16, color: SAGE }}>✓</span>
                  </div>
                );
              })}

              {/* Elo result */}
              {eloShow && (
                <div style={{
                  marginTop: 32,
                  opacity: eloP,
                  transform: `translateY(${(1 - eloP) * 10}px)`,
                  fontSize: 28,
                  padding: '16px 20px',
                  borderLeft: `4px solid ${EMBER}`,
                  background: 'rgba(194,65,12,0.08)',
                }}>
                  <span style={{ color: '#E8E2D4' }}>pdf-extract</span>
                  <span style={{ color: '#6B6557', margin: '0 12px' }}>·</span>
                  <span style={{ color: SAGE }}>3 wins</span>
                  <span style={{ color: '#6B6557', margin: '0 12px' }}>·</span>
                  <span style={{ color: EMBER, fontWeight: 500 }}>↗ +24 Elo</span>
                  <span style={{ color: '#6B6557', margin: '0 12px' }}>·</span>
                  <span style={{ color: '#E8E2D4' }}>now <span style={{ color: EMBER, fontStyle: 'italic', fontFamily: 'Instrument Serif, serif', fontSize: 32 }}>#1</span> overall</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: leaderboard reveal */}
      {cutP > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: BONE,
          opacity: cutP,
        }}>
          <GridBG/>
          <MonoCaption text="Versuz · standings · cycle #184" x={80} y={50} size={16}/>
          <div style={{
            position: 'absolute', top: 50, right: 80,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16,
            color: EMBER, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>↗ rank-up · pdf-extract</div>

          <div style={{
            position: 'absolute', left: 80, top: 110,
            fontFamily: 'Instrument Serif, serif',
            fontSize: 80, lineHeight: 1, letterSpacing: '-0.03em',
            color: INK,
          }}>
            New <em style={{ color: EMBER }}>leader</em>.
          </div>

          {/* Leaderboard rows */}
          <Leaderboard time={time} startAt={7.2}/>

          {/* Final stamp */}
          {stampP > 0 && (
            <div style={{
              position: 'absolute',
              right: 80, bottom: 60,
              opacity: stampP,
              transform: `translateY(${(1 - stampP) * 20}px)`,
              display: 'flex', alignItems: 'center', gap: 24,
              padding: '24px 36px',
              border: `2px solid ${INK}`,
            }}>
              <VersuzMark size={70} progress={1}/>
              <div>
                <div style={{
                  fontFamily: 'Instrument Serif, serif', fontStyle: 'italic',
                  fontSize: 48, color: INK, letterSpacing: '-0.02em', lineHeight: 1,
                }}>versuz.dev</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                  color: INK2, letterSpacing: '0.18em', textTransform: 'uppercase',
                  marginTop: 6,
                }}>Submit your skill</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: leaderboard rows that climb
function Leaderboard({ time, startAt }) {
  // Pre-state: pdf-extract at rank 4. Post-state: rank 1.
  // We animate it climbing past the others.
  const rows = [
    { id: 'sql-genie',   author: 'maple',           preElo: 1624, postElo: 1624, preRank: 1, postRank: 2 },
    { id: 'csv-surgeon', author: 'rowan-yu',        preElo: 1612, postElo: 1612, preRank: 2, postRank: 3 },
    { id: 'web-scry',    author: 'kira',            preElo: 1605, postElo: 1605, preRank: 3, postRank: 4 },
    { id: 'pdf-extract', author: 'anthropic-labs',  preElo: 1624, postElo: 1648, preRank: 4, postRank: 1, hero: true },
    { id: 'agent-router',author: 'theo',            preElo: 1591, postElo: 1591, preRank: 5, postRank: 5 },
  ];

  const rowH = 100;
  const top = 280;

  // Animation segments
  // 7.2 - 7.6: show pre-state with everyone in their pre rank
  // 7.6 - 8.4: pdf-extract climbs from rank 4 → rank 1, others shift down
  // 8.4+: hold
  const climb = clamp((time - 7.6) / 0.9, 0, 1);
  const climbEase = Easing.easeInOutCubic(climb);

  return (
    <div style={{ position: 'absolute', left: 80, right: 80, top: top + 40 }}>
      {rows.map((r, i) => {
        const curRank = r.preRank + (r.postRank - r.preRank) * climbEase;
        const y = (curRank - 1) * rowH;
        const curElo = Math.round(r.preElo + (r.postElo - r.preElo) * climbEase);
        const isLeader = curRank < 1.5; // visually #1 (could be in transition)
        const heroDelta = r.hero ? Math.round((r.postElo - r.preElo) * climbEase) : 0;
        return (
          <div key={r.id} style={{
            position: 'absolute', left: 0, right: 0,
            top: y, height: rowH,
            display: 'grid',
            gridTemplateColumns: '80px 1fr 200px 150px',
            alignItems: 'center', gap: 32,
            padding: '0 32px',
            background: r.hero ? 'rgba(194,65,12,0.10)' : (curRank < 1.5 ? 'rgba(63,125,79,0.08)' : 'transparent'),
            borderBottom: '1px solid rgba(20,18,14,0.10)',
            transition: 'none',
            willChange: 'top, background',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 22, color: INK2, letterSpacing: '0.04em',
            }}>#{String(Math.round(curRank)).padStart(2, '0')}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <span style={{
                fontFamily: 'Instrument Serif, serif',
                fontStyle: r.hero ? 'italic' : 'normal',
                fontSize: 44, letterSpacing: '-0.02em',
                color: r.hero ? EMBER : INK,
              }}>{r.id}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14, color: INK2,
              }}>{r.author}</span>
            </div>
            <span style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 38, color: INK, textAlign: 'right',
              letterSpacing: '-0.02em',
            }}>{curElo}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18, textAlign: 'right',
              color: r.hero && heroDelta > 0 ? EMBER : INK2,
            }}>{r.hero && heroDelta > 0 ? `↗ +${heroDelta}` : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Export scenes registry ───────────────────────────────────────────────
window.VERSUZ_SCENES = window.VERSUZ_SCENES || {};
Object.assign(window.VERSUZ_SCENES, {
  anthem:   { title: 'Brand Anthem',  subtitle: 'Headline → logo reveal',    width: 1920, height: 1080, duration: 12, Component: SceneBrandAnthem,  format: '16:9 · 12s',  group: 'Web / hero' },
  reel:     { title: 'Race reel',     subtitle: 'TikTok/IG · Elo race',      width: 1080, height: 1920, duration: 10, Component: SceneVerticalReel, format: '9:16 · 10s',  group: 'TikTok / Insta' },
  square:   { title: '16 → 1',        subtitle: 'Elimination grid',          width: 1080, height: 1080, duration: 9,  Component: SceneSquareElim,   format: '1:1 · 9s',    group: 'Square (Insta)' },
  banner:   { title: 'Banner strip',  subtitle: 'Display strip · loops',     width: 1920, height: 320,  duration: 6,  Component: SceneBanner,       format: '6:1 · 6s',    group: 'Web / hero' },
  terminal: { title: 'Terminal demo', subtitle: 'npx submit → rank-up',      width: 1920, height: 1080, duration: 11, Component: SceneTerminal,     format: '16:9 · 11s',  group: 'Web / hero' },
});
