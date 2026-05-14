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

  // Mark assembly: 0 → 1.8s
  const markProg = clamp(time / 1.8, 0, 1);

  // Mark moves from center to corner: 2.6 → 3.6s
  const moveT = clamp((time - 2.6) / 1.0, 0, 1);
  const moveEase = Easing.easeInOutCubic(moveT);
  const markCenterX = 1920 / 2;
  const markCenterY = 1080 / 2 - 60;
  const markCornerX = 100;
  const markCornerY = 80;
  const markCenterSize = 280;
  const markCornerSize = 100;
  const markX = markCenterX + (markCornerX - markCenterX) * moveEase;
  const markY = markCenterY + (markCornerY - markCenterY) * moveEase;
  const markSize = markCenterSize + (markCornerSize - markCenterSize) * moveEase;

  // Wordmark under mark: appears 1.4 → 2.4s, leaves at 2.6
  const wmProg = clamp((time - 1.4) / 0.9, 0, 1);
  const wmFade = clamp(1 - (time - 2.6) / 0.5, 0, 1);

  // Headline 1: "Skills go in." 3.6 → 4.8s
  const head1 = useWordReveal(['Skills', 'go', 'in.'], 3.6, 0.14, Easing.easeOutCubic);

  // Headline 2 italic: "Only one wins." 5.0 → 6.4s
  const head2 = useWordReveal(['Only', 'one', 'wins.'], 5.0, 0.16, Easing.easeOutCubic);

  // Underline draw: 6.4 → 7.0s
  const underline = clamp((time - 6.4) / 0.6, 0, 1);

  // Bottom strip with URL + sub: 7.2 → 8.2s
  const bottomP = clamp((time - 7.2) / 0.8, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG />

      {/* Decorative ember discs — drift in slowly */}
      <Sprite start={4} end={10}>
        {({ progress }) => (
          <div aria-hidden style={{
            position: 'absolute',
            right: -120, top: -120,
            width: 320, height: 320,
            borderRadius: '50%',
            background: EMBER,
            opacity: 0.95 * Easing.easeOutCubic(clamp(progress * 3, 0, 1)),
            transform: `scale(${0.8 + 0.2 * Easing.easeOutCubic(clamp(progress * 3, 0, 1))})`,
          }}/>
        )}
      </Sprite>

      {/* Ink wedge bottom-left */}
      <Sprite start={4.2} end={10}>
        {({ progress }) => (
          <svg aria-hidden width="220" height="220" viewBox="0 0 220 220" style={{
            position: 'absolute', left: 0, bottom: 0,
            opacity: 0.92 * Easing.easeOutCubic(clamp(progress * 3, 0, 1)),
            transform: `translateY(${(1 - Easing.easeOutCubic(clamp(progress * 3, 0, 1))) * 40}px)`,
          }}>
            <path d="M 0 220 L 0 80 L 220 220 Z" fill={INK}/>
          </svg>
        )}
      </Sprite>

      {/* Top hairline + mono caption */}
      <Sprite start={0.4} end={10}>
        {({ progress }) => {
          const p = Easing.easeOutCubic(clamp(progress * 5, 0, 1));
          return (
            <>
              <div style={{
                position: 'absolute', top: 60, left: 60, right: 60, height: 1,
                background: 'rgba(20,18,14,0.18)',
                transform: `scaleX(${p})`, transformOrigin: 'left',
              }}/>
              <MonoCaption text="Versuz · Cycle #184 · Open arena" x={60} y={30} />
              <div style={{
                position: 'absolute', top: 30, right: 60,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                color: INK2, letterSpacing: '0.16em', textTransform: 'uppercase',
                opacity: p,
              }}>14:32 UTC · Live</div>
            </>
          );
        }}
      </Sprite>

      {/* The Mark — center then corner */}
      <div style={{
        position: 'absolute',
        left: markX, top: markY,
        transform: `translate(-50%, -50%)`,
        willChange: 'transform',
      }}>
        <VersuzMark size={markSize} progress={markProg}/>
      </div>

      {/* Wordmark beneath while centered */}
      <div style={{
        position: 'absolute',
        left: markCenterX, top: markCenterY + 140,
        transform: `translate(-50%, 0)`,
        opacity: wmProg * wmFade,
      }}>
        <div style={{ height: 80 }}>
          <VersuzWordmarkSVG height={80} variant="dark" progress={wmProg}/>
        </div>
      </div>

      {/* Headline 1: "Skills go in." */}
      <Sprite start={3.4} end={10}>
        <div style={{
          position: 'absolute',
          left: 100, top: 320,
          fontFamily: 'Instrument Serif, serif',
          fontSize: 168, lineHeight: 0.95, letterSpacing: '-0.04em',
          fontWeight: 400, color: INK, maxWidth: 1500,
        }}>
          {['Skills', ' ', 'go', ' ', 'in.'].map((w, i) => {
            const wi = ['Skills', null, 'go', null, 'in.'].filter(Boolean);
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
      </Sprite>

      {/* Headline 2: italic ember "Only one wins." */}
      <Sprite start={5.0} end={10}>
        <div style={{
          position: 'absolute',
          left: 100, top: 520,
          fontFamily: 'Instrument Serif, serif',
          fontStyle: 'italic',
          fontSize: 168, lineHeight: 0.95, letterSpacing: '-0.04em',
          fontWeight: 400, color: EMBER,
        }}>
          {['Only', ' ', 'one', ' ', 'wins.'].map((w, i) => {
            const idx = i === 0 ? 0 : i === 2 ? 1 : i === 4 ? 2 : -1;
            if (idx < 0) return <span key={i}>{w}</span>;
            const r = head2[idx];
            return (
              <span key={i} style={{
                display: 'inline-block',
                opacity: r.opacity,
                transform: `translateY(${r.y}px)`,
              }}>{w}</span>
            );
          })}
        </div>
      </Sprite>

      {/* Underline — ember bar drawn beneath "wins." */}
      <div style={{
        position: 'absolute',
        left: 100, top: 700,
        width: 920 * underline,
        height: 12,
        background: EMBER,
        transformOrigin: 'left',
      }}/>

      {/* Bottom strip: URL + sub */}
      <Sprite start={7.2} end={10}>
        {({ progress }) => {
          const p = Easing.easeOutCubic(clamp(progress * 4, 0, 1));
          return (
            <>
              <div style={{
                position: 'absolute', left: 60, right: 60, bottom: 100, height: 1,
                background: 'rgba(20,18,14,0.18)',
                transform: `scaleX(${p})`, transformOrigin: 'left',
              }}/>
              <div style={{
                position: 'absolute', left: 100, bottom: 50,
                fontFamily: 'Instrument Serif, serif', fontSize: 56,
                letterSpacing: '-0.02em', fontStyle: 'italic',
                color: INK, opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
              }}>versuz.dev</div>
              <div style={{
                position: 'absolute', right: 100, bottom: 60,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
                color: INK2, letterSpacing: '0.18em', textTransform: 'uppercase',
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
                textAlign: 'right', lineHeight: 1.6,
              }}>The open arena for<br/>Claude skills.</div>
            </>
          );
        }}
      </Sprite>
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

  // CTA: 6.5 → 8s
  const ctaP = clamp((time - 6.5) / 0.6, 0, 1);

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
        left: '50%', top: 200,
        transform: `translate(-50%, 0) scale(${starScale}) rotate(${(1 - starProg) * -45}deg)`,
        opacity: starProg,
        transformOrigin: 'center',
      }}>
        <EmberStar size={260} progress={1}/>
      </div>

      {/* "Which Claude skill" stack */}
      <div style={{
        position: 'absolute',
        left: 80, right: 80, top: 480,
        fontFamily: 'Instrument Serif, serif',
        fontSize: 136, lineHeight: 0.95, letterSpacing: '-0.04em',
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
        left: 80, top: 880,
        fontFamily: 'Instrument Serif, serif',
        fontStyle: 'italic',
        fontSize: 220, lineHeight: 0.95, letterSpacing: '-0.05em',
        color: EMBER,
        opacity: winsP,
        transform: `translate(${(1 - winsEase) * -40}px, 0)`,
      }}>wins?</div>

      {/* Three race bars */}
      <Sprite start={raceStart} end={8}>
        {({ localTime }) => {
          const localP = clamp(localTime / 1.6, 0, 1);
          return (
            <div style={{
              position: 'absolute',
              left: 80, right: 80, top: 1180,
              display: 'flex', flexDirection: 'column', gap: 48,
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
                      display: 'flex', justifyContent: 'space-between',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 22, color: INK2,
                      letterSpacing: '0.06em', marginBottom: 16,
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

      {/* Winner crowned — overlay marker pointing at first row */}
      <div style={{
        position: 'absolute',
        left: 80, top: 1180 - 12,
        opacity: crownP,
        transform: `translateY(${(1 - crownP) * 8}px)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '8px 14px',
          background: INK, color: BONE,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 16, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>★ Leader · Cycle 184</div>
      </div>

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

  // Winner zoom: 4.4 → 5.4s
  const winP = clamp((time - 4.4) / 1.0, 0, 1);
  const winEase = Easing.easeInOutCubic(winP);

  // Final card: 5.6 → 7s
  const finalP = clamp((time - 5.6) / 0.6, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <GridBG size={36}/>

      {/* Top label */}
      <Sprite start={0.0} end={7}>
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

      <Sprite start={0.4} end={7}>
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

            // After winP starts, all other cells fade out
            const finalDimming = clamp((time - 4.4) / 0.6, 0, 1);
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
  anthem:   { title: 'Brand Anthem',  subtitle: 'Logo → headline → CTA',     width: 1920, height: 1080, duration: 10, Component: SceneBrandAnthem,  format: '16:9 · 10s',  group: 'Web / hero' },
  reel:     { title: 'Race reel',     subtitle: 'TikTok/IG · Elo race',      width: 1080, height: 1920, duration: 8,  Component: SceneVerticalReel, format: '9:16 · 8s',   group: 'TikTok / Insta' },
  square:   { title: '16 → 1',        subtitle: 'Elimination grid',          width: 1080, height: 1080, duration: 7,  Component: SceneSquareElim,   format: '1:1 · 7s',    group: 'Square (Insta)' },
  banner:   { title: 'Banner strip',  subtitle: 'Display strip · loops',     width: 1920, height: 320,  duration: 6,  Component: SceneBanner,       format: '6:1 · 6s',    group: 'Web / hero' },
  terminal: { title: 'Terminal demo', subtitle: 'npx submit → rank-up',      width: 1920, height: 1080, duration: 11, Component: SceneTerminal,     format: '16:9 · 11s',  group: 'Web / hero' },
});
