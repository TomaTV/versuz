// =====================================================================
// Versuz Motion — animated logo + social motion design
// 9 scenes powered by animations.jsx Stage timeline.
// =====================================================================
const { useState, useEffect, useRef, useMemo } = React;
const { Stage, Sprite, useTime, useSprite, Easing, interpolate, animate, clamp } = window;
const { PALETTE, MARK_V_PATH, MARK_Z_PATH, MARK_VIEWBOX, MARK_AR } = window;

const M_VB = MARK_VIEWBOX || "0 0 186 128";
const M_AR = MARK_AR || (186 / 128);

// AnimMark + AnimWordmark are defined in versuz-anim-marks.jsx (loaded earlier).
const { AnimMark, AnimWordmark } = window;

// ─────────────────────────────────────────────────────────────────────────
// SCENE A — LOGO REVEAL  (3.5s)
// Z draws in, V slides in over it, wordmark types letter-by-letter, dot pulses.
// ─────────────────────────────────────────────────────────────────────────
const SceneLogoReveal = () => {
  const t = useTime();
  // Z entry [0..0.5] — slide up + scale + fade
  const zScale = animate({ from: 0.6, to: 1, start: 0,    end: 0.5, ease: Easing.easeOutCubic })(t);
  const zY     = animate({ from: 40,  to: 0, start: 0,    end: 0.5, ease: Easing.easeOutCubic })(t);
  const zOp    = animate({ from: 0,   to: 1, start: 0,    end: 0.4, ease: Easing.easeOutQuad  })(t);
  // V entry [0.25..0.75] — slide down + scale + fade
  const vScale = animate({ from: 0.6, to: 1, start: 0.25, end: 0.75, ease: Easing.easeOutCubic })(t);
  const vY     = animate({ from: -40, to: 0, start: 0.25, end: 0.75, ease: Easing.easeOutCubic })(t);
  const vOp    = animate({ from: 0,   to: 1, start: 0.25, end: 0.65, ease: Easing.easeOutQuad  })(t);
  // Letter-by-letter [1.0 .. 1.6]
  const letterAnim = (i) => {
    const start = 1.0 + i * 0.10;
    const op = animate({ from: 0, to: 1, start, end: start + 0.25, ease: Easing.easeOutQuad })(t);
    const ty = animate({ from: 12, to: 0, start, end: start + 0.25, ease: Easing.easeOutCubic })(t);
    return { opacity: op, transform: `translateY(${ty}px)` };
  };
  // Dot pulse at 1.8s
  const dotS = animate({ from: 0, to: 1, start: 1.7, end: 1.85, ease: Easing.easeOutBack })(t);
  const dotPulse = (() => {
    if (t < 2.0) return { transform: `scale(${dotS})`, opacity: dotS };
    const local = clamp((t - 2.0) / 0.4, 0, 1);
    const s = 1 + 0.3 * Math.sin(local * Math.PI);
    const op = 1 - 0.3 * Math.sin(local * Math.PI);
    return { transform: `scale(${s})`, opacity: op };
  })();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.bone, gap: 36 }}>
      <AnimMark
        size={240}
        vTransform={`translate(0px, ${vY}px) scale(${vScale})`}
        zTransform={`translate(0px, ${zY}px) scale(${zScale})`}
        vOpacity={vOp} zOpacity={zOp}
      />
      <AnimWordmark
        size={100}
        letterStyles={[0,1,2,3,4,5].map(letterAnim)}
        dotStyle={{ ...dotPulse, transformOrigin: 'center' }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE B — HEARTBEAT (4s loop)
// Static mark + wordmark. Dot pulses every 2s. Subtle V opacity shimmer.
// ─────────────────────────────────────────────────────────────────────────
const SceneHeartbeat = () => {
  const t = useTime();
  const phase = (t % 2) / 2; // 0..1 each 2s
  const dotS = 1 + 0.18 * Math.sin(phase * Math.PI * 2);
  const dotOp = 1 - 0.15 * Math.abs(Math.sin(phase * Math.PI));
  const vOp  = 1 - 0.10 * Math.abs(Math.sin(phase * Math.PI));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.bone, gap: 36 }}>
      <AnimMark size={240} vOpacity={vOp} />
      <AnimWordmark
        size={100}
        dotStyle={{ transform: `scale(${dotS})`, opacity: dotOp, transformOrigin: 'center' }}
      />
      <div style={{
        position: 'absolute', bottom: 60,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 14,
        letterSpacing: '0.2em', color: PALETTE.fgMuted, textTransform: 'uppercase',
      }}>
        live · cycle 184 · {String(Math.floor(t * 10)).padStart(3, '0')}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE C — GLITCH (3s, one-shot then settle)
// Crimson 'S' shift, azure 'z' shift, grayscale wash. Multiple passes then snap clean.
// ─────────────────────────────────────────────────────────────────────────
const SceneGlitch = () => {
  const t = useTime();
  const passes = [0.6, 1.0, 1.4, 1.8];
  const inAnyPass = passes.some(p => t >= p && t < p + 0.18);
  const inPass = (i) => t >= passes[i] && t < passes[i] + 0.18;
  const sShiftX  = inAnyPass ? (inPass(0) || inPass(2) ? -3 : 0) : 0;
  const zShiftX  = inAnyPass ? (inPass(1) || inPass(3) ?  3 : 0) : 0;
  const sColor   = inPass(0) || inPass(2) ? PALETTE.crimson : PALETTE.ink;
  const zColor   = inPass(1) || inPass(3) ? PALETTE.azure   : PALETTE.ink;
  const wash     = inAnyPass ? 'grayscale(0.5)' : 'none';
  const markJit  = inAnyPass ? (Math.sin(t * 200) * 2) : 0;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.bone, gap: 36, filter: wash, transition: 'filter .1s linear' }}>
      <AnimMark size={240} vTransform={`translate(${markJit}px, 0)`} />
      <AnimWordmark
        size={100}
        letterStyles={[
          {}, {}, {},
          { transform: `translateX(${sShiftX}px)`, color: sColor, fontStyle: 'italic' },
          {},
          { transform: `translateX(${zShiftX}px)`, color: zColor },
        ]}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE D — WORDMARK TYPEWRITER (3s)
// Letters arrive with a blinking cursor that runs ahead of them.
// ─────────────────────────────────────────────────────────────────────────
const SceneTypewriter = () => {
  const t = useTime();
  const letters = ['v', 'e', 'r', 'S', 'u', 'z'];
  const tStart = 0.2;
  const step = 0.18;
  // Letter visibility: each appears at its slot, no animation, just on/off
  const visible = (i) => t >= tStart + i * step;
  // Cursor position runs at the front
  const cursorIdx = Math.min(6, Math.max(0, Math.floor((t - tStart) / step) + 1));
  // Cursor blink (still visible until ~2.0s then disappears as dot arrives)
  const cursorBlink = (Math.floor(t * 3) % 2 === 0) && t < 2.2;
  // Dot scale-in at 2.0
  const dotS = animate({ from: 0, to: 1, start: 2.0, end: 2.3, ease: Easing.easeOutBack })(t);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.bone }}>
      <div style={{ position: 'relative' }}>
        <AnimWordmark
          size={140}
          showDot={t >= 2.0}
          dotStyle={{ transform: `scale(${dotS})`, transformOrigin: 'center' }}
          letterStyles={letters.map((_, i) => ({
            opacity: visible(i) ? 1 : 0,
            transition: 'opacity .05s linear',
          }))}
        />
        {/* Cursor: a thin vertical bar */}
        <span style={{
          position: 'absolute', bottom: 8,
          left: `calc(${cursorIdx} * 0.56em)`,
          width: 4, height: '0.9em',
          background: PALETTE.ember,
          opacity: cursorBlink ? 1 : 0,
          transition: 'left .12s ease-out',
        }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE E — ITALIC SNAP (3s, loop-friendly)
// 'S' rotates from upright -> italic, snaps with a small bounce.
// ─────────────────────────────────────────────────────────────────────────
const SceneItalicSnap = () => {
  const t = useTime();
  const cycle = t % 3;
  // 0..0.8 upright, 0.8..1.4 snap to italic, 1.4..2.5 hold, 2.5..3 reset
  let sStyle = {};
  if (cycle < 0.8) sStyle = { fontStyle: 'normal', transform: 'skewX(0)', color: PALETTE.ink };
  else if (cycle < 1.4) {
    const p = Easing.easeOutBack((cycle - 0.8) / 0.6);
    sStyle = { fontStyle: 'normal', transform: `skewX(${-12 * p}deg)`, color: `color-mix(in oklab, ${PALETTE.ink} ${100 - 100 * p}%, ${PALETTE.ember})` };
  } else if (cycle < 2.5) sStyle = { fontStyle: 'italic', color: PALETTE.ember, transform: 'skewX(0)' };
  else {
    const p = Easing.easeInCubic((cycle - 2.5) / 0.5);
    sStyle = { fontStyle: 'italic', color: `color-mix(in oklab, ${PALETTE.ember} ${100 - 100 * p}%, ${PALETTE.ink})`, transform: `skewX(0)`, opacity: 1 };
  }
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.bone, flexDirection: 'column', gap: 32 }}>
      <AnimWordmark
        size={160}
        italicS={false}
        letterStyles={[{}, {}, {}, sStyle, {}, {}]}
      />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: '0.2em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>
        the s leans · {cycle.toFixed(2)}s
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE F — INSTAGRAM SQUARE (6s, loop-friendly)
// 1:1 social motion: mark assembles, wordmark slides in, tagline reveals
// line-by-line, ember corner accent slides in last.
// ─────────────────────────────────────────────────────────────────────────
const SceneIGSquare = () => {
  const t = useTime();
  // Phases
  const zEntry = animate({ from: 0,   to: 1, start: 0.2, end: 0.8, ease: Easing.easeOutCubic })(t);
  const vEntry = animate({ from: 0,   to: 1, start: 0.5, end: 1.1, ease: Easing.easeOutCubic })(t);
  const zY     = animate({ from: 30,  to: 0, start: 0.2, end: 0.8, ease: Easing.easeOutCubic })(t);
  const vY     = animate({ from: -30, to: 0, start: 0.5, end: 1.1, ease: Easing.easeOutCubic })(t);
  // Wordmark drop
  const wmY = animate({ from: 30, to: 0, start: 1.2, end: 1.7, ease: Easing.easeOutCubic })(t);
  const wmOp = animate({ from: 0, to: 1, start: 1.2, end: 1.6, ease: Easing.easeOutQuad })(t);
  // Tagline line 1
  const line1Op = animate({ from: 0, to: 1, start: 2.0, end: 2.5, ease: Easing.easeOutQuad })(t);
  const line1Y  = animate({ from: 16, to: 0, start: 2.0, end: 2.5, ease: Easing.easeOutCubic })(t);
  // Tagline line 2
  const line2Op = animate({ from: 0, to: 1, start: 2.6, end: 3.1, ease: Easing.easeOutQuad })(t);
  const line2Y  = animate({ from: 16, to: 0, start: 2.6, end: 3.1, ease: Easing.easeOutCubic })(t);
  // Ember corner accent
  const cornerX = animate({ from: 200, to: 0, start: 3.4, end: 4.0, ease: Easing.easeOutCubic })(t);
  // Loop hint: subtle drift toward end
  const driftY = t > 5 ? (t - 5) * -8 : 0;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: PALETTE.bone, overflow: 'hidden' }}>
      {/* Ember corner */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 160, height: 160, background: PALETTE.ember,
        transform: `translateX(${cornerX}px)`,
      }} />
      {/* Mark + wordmark stacked center */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, transform: `translateY(${driftY}px)` }}>
        <AnimMark
          size={260}
          zOpacity={zEntry} vOpacity={vEntry}
          zTransform={`translateY(${zY}px) scale(${0.85 + zEntry * 0.15})`}
          vTransform={`translateY(${vY}px) scale(${0.85 + vEntry * 0.15})`}
        />
        <div style={{ opacity: wmOp, transform: `translateY(${wmY}px)` }}>
          <AnimWordmark size={88} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <span style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 42,
            color: PALETTE.fgMuted, letterSpacing: '-0.02em',
            opacity: line1Op, transform: `translateY(${line1Y}px)`,
          }}>skills go in.</span>
          <span style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 42,
            color: PALETTE.ember, letterSpacing: '-0.02em',
            opacity: line2Op, transform: `translateY(${line2Y}px)`,
          }}>only one wins.</span>
        </div>
      </div>
      {/* Bottom URL */}
      <div style={{
        position: 'absolute', bottom: 50, left: 60,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 22,
        letterSpacing: '0.2em', color: PALETTE.fgMuted, textTransform: 'uppercase',
      }}>VERSUZ.DEV</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE G — INSTAGRAM PORTRAIT (6s)
// 4:5 kinetic typography: big tagline drops in, ember word punches.
// ─────────────────────────────────────────────────────────────────────────
const SceneIGPortrait = () => {
  const t = useTime();
  // Logo small top-left
  const logoOp = animate({ from: 0, to: 1, start: 0.1, end: 0.6 })(t);
  const logoY  = animate({ from: -20, to: 0, start: 0.1, end: 0.6, ease: Easing.easeOutCubic })(t);
  // "Skills" entrance
  const skillsOp = animate({ from: 0, to: 1, start: 0.8, end: 1.2 })(t);
  const skillsX  = animate({ from: -60, to: 0, start: 0.8, end: 1.3, ease: Easing.easeOutCubic })(t);
  // "go in." entrance
  const goInOp = animate({ from: 0, to: 1, start: 1.2, end: 1.6 })(t);
  const goInX  = animate({ from: -60, to: 0, start: 1.2, end: 1.7, ease: Easing.easeOutCubic })(t);
  // "Only one"
  const onlyOp = animate({ from: 0, to: 1, start: 2.2, end: 2.6 })(t);
  const onlyX  = animate({ from: 60, to: 0, start: 2.2, end: 2.7, ease: Easing.easeOutCubic })(t);
  // "wins."  with color shift to ember
  const winsOp = animate({ from: 0, to: 1, start: 2.6, end: 3.0 })(t);
  const winsX  = animate({ from: 60, to: 0, start: 2.6, end: 3.1, ease: Easing.easeOutCubic })(t);
  const winsColor = t < 3.4 ? PALETTE.ink : PALETTE.ember;
  // Strike-through line
  const strikeW = animate({ from: 0, to: 1, start: 3.6, end: 4.2, ease: Easing.easeOutCubic })(t);
  // Bottom URL slide
  const urlY = animate({ from: 30, to: 0, start: 4.2, end: 4.7, ease: Easing.easeOutCubic })(t);
  const urlOp = animate({ from: 0, to: 1, start: 4.2, end: 4.7 })(t);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: PALETTE.bone, overflow: 'hidden' }}>
      {/* Logo top */}
      <div style={{ position: 'absolute', top: 80, left: 80, display: 'flex', alignItems: 'center', gap: 24, opacity: logoOp, transform: `translateY(${logoY}px)` }}>
        <AnimMark size={120} />
        <AnimWordmark size={70} />
      </div>
      {/* Headline center */}
      <div style={{ position: 'absolute', top: '38%', left: 80, right: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 120,
          color: PALETTE.ink, lineHeight: 0.95, letterSpacing: '-0.04em',
          opacity: skillsOp, transform: `translateX(${skillsX}px)`,
        }}>Skills</span>
        <span style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 120,
          color: PALETTE.ink, lineHeight: 0.95, letterSpacing: '-0.04em',
          opacity: goInOp, transform: `translateX(${goInX}px)`,
        }}>go in.</span>
        <div style={{ height: 32 }} />
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', gap: 24 }}>
          <span style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 120,
            color: PALETTE.ink, lineHeight: 0.95, letterSpacing: '-0.04em',
            opacity: onlyOp, transform: `translateX(${onlyX}px)`,
          }}>Only one</span>
        </div>
        <span style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 120,
          color: winsColor, lineHeight: 0.95, letterSpacing: '-0.04em',
          opacity: winsOp, transform: `translateX(${winsX}px)`,
          transition: 'color .3s ease',
        }}>wins.</span>
      </div>
      {/* Strike line under "wins." */}
      <div style={{
        position: 'absolute', bottom: 220, left: 80,
        width: `${strikeW * 380}px`, height: 8, background: PALETTE.ember,
      }} />
      {/* Bottom URL */}
      <div style={{
        position: 'absolute', bottom: 100, left: 80,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 28,
        letterSpacing: '0.25em', color: PALETTE.ink, textTransform: 'uppercase',
        opacity: urlOp, transform: `translateY(${urlY}px)`,
      }}>VERSUZ.DEV · $ NPX VERSUZ</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE H — TIKTOK / REELS (7s)
// 9:16 vertical: tagline words drop in stagger, mark scales in last with punch.
// ─────────────────────────────────────────────────────────────────────────
const SceneTikTok = () => {
  const t = useTime();
  // Word "SKILLS"
  const w1Op = animate({ from: 0, to: 1, start: 0.2, end: 0.5 })(t);
  const w1Y  = animate({ from: 80, to: 0, start: 0.2, end: 0.7, ease: Easing.easeOutBack })(t);
  // Word "GO"
  const w2Op = animate({ from: 0, to: 1, start: 0.8, end: 1.1 })(t);
  const w2Y  = animate({ from: 80, to: 0, start: 0.8, end: 1.3, ease: Easing.easeOutBack })(t);
  // Word "IN."
  const w3Op = animate({ from: 0, to: 1, start: 1.4, end: 1.7 })(t);
  const w3Y  = animate({ from: 80, to: 0, start: 1.4, end: 1.9, ease: Easing.easeOutBack })(t);
  // Hold then collapse
  const collapse = animate({ from: 0, to: 1, start: 2.6, end: 3.0, ease: Easing.easeInCubic })(t);
  // Mark scales in
  const markS = animate({ from: 0, to: 1, start: 3.0, end: 3.5, ease: Easing.easeOutBack })(t);
  // Wordmark below
  const wmOp = animate({ from: 0, to: 1, start: 3.6, end: 4.0 })(t);
  const wmY = animate({ from: 30, to: 0, start: 3.6, end: 4.1, ease: Easing.easeOutCubic })(t);
  // Tagline ember line
  const tagOp = animate({ from: 0, to: 1, start: 4.4, end: 4.8 })(t);
  const tagY  = animate({ from: 20, to: 0, start: 4.4, end: 4.9, ease: Easing.easeOutCubic })(t);
  // ".dev" pill
  const urlOp = animate({ from: 0, to: 1, start: 5.0, end: 5.4 })(t);

  const showWords = t < 3.0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: PALETTE.bone, overflow: 'hidden' }}>
      {/* Top safe area marker */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 22,
        letterSpacing: '0.3em', color: PALETTE.fgMuted, textTransform: 'uppercase',
      }}>versuz · arena</div>

      {showWords && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 0, opacity: 1 - collapse,
          transform: `scale(${1 - collapse * 0.2})`,
        }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 220, color: PALETTE.ink, letterSpacing: '-0.04em', opacity: w1Op, transform: `translateY(${w1Y}px)`, lineHeight: 0.9 }}>Skills</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 220, fontStyle: 'italic', color: PALETTE.ink, letterSpacing: '-0.04em', opacity: w2Op, transform: `translateY(${w2Y}px)`, lineHeight: 0.9 }}>go</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 220, color: PALETTE.ember, letterSpacing: '-0.04em', opacity: w3Op, transform: `translateY(${w3Y}px)`, lineHeight: 0.9 }}>in.</span>
        </div>
      )}

      {!showWords && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          <div style={{ transform: `scale(${markS})`, transformOrigin: 'center' }}>
            <AnimMark size={520} />
          </div>
          <div style={{ opacity: wmOp, transform: `translateY(${wmY}px)` }}>
            <AnimWordmark size={180} />
          </div>
          <span style={{
            fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 64,
            color: PALETTE.ember, letterSpacing: '-0.02em',
            opacity: tagOp, transform: `translateY(${tagY}px)`,
            marginTop: 16,
          }}>only one wins.</span>
        </div>
      )}

      {/* Bottom URL pill */}
      <div style={{
        position: 'absolute', bottom: 320, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: urlOp,
      }}>
        <div style={{
          padding: '20px 40px', background: PALETTE.ink, color: PALETTE.bone,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 28,
          letterSpacing: '0.25em', textTransform: 'uppercase',
        }}>versuz.dev</div>
      </div>

      {/* Caption safe area indicator */}
      <div style={{
        position: 'absolute', bottom: 80, left: 80, right: 80, height: 1,
        background: PALETTE.rule,
      }} />
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 18,
        letterSpacing: '0.3em', color: PALETTE.fgMuted, textTransform: 'uppercase',
      }}>↓ caption area</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SCENE I — LINKEDIN (5s)
// Left mark scales in, headline types on right, kicker line slides in.
// ─────────────────────────────────────────────────────────────────────────
const SceneLinkedIn = () => {
  const t = useTime();
  // Mark
  const zOp = animate({ from: 0, to: 1, start: 0.2, end: 0.7 })(t);
  const vOp = animate({ from: 0, to: 1, start: 0.5, end: 1.0 })(t);
  const zX  = animate({ from: -40, to: 0, start: 0.2, end: 0.7, ease: Easing.easeOutCubic })(t);
  const vX  = animate({ from: -40, to: 0, start: 0.5, end: 1.0, ease: Easing.easeOutCubic })(t);
  // Headline line 1 (clip reveal — width grows)
  const line1W = animate({ from: 0, to: 1, start: 1.1, end: 1.8, ease: Easing.easeOutCubic })(t);
  // Headline line 2 (color shift)
  const line2W = animate({ from: 0, to: 1, start: 1.9, end: 2.6, ease: Easing.easeOutCubic })(t);
  // Kicker
  const kickerOp = animate({ from: 0, to: 1, start: 2.8, end: 3.2 })(t);
  const kickerY  = animate({ from: 16, to: 0, start: 2.8, end: 3.3, ease: Easing.easeOutCubic })(t);
  // Vertical rule divider
  const ruleH = animate({ from: 0, to: 1, start: 0.8, end: 1.4, ease: Easing.easeOutCubic })(t);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: PALETTE.bone, display: 'grid', gridTemplateColumns: '0.6fr 1fr', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ paddingLeft: 80 }}>
        <AnimMark
          size={240}
          zOpacity={zOp} vOpacity={vOp}
          zTransform={`translateX(${zX}px)`}
          vTransform={`translateX(${vX}px)`}
        />
      </div>
      {/* Vertical rule */}
      <div style={{
        position: 'absolute', top: '20%', bottom: '20%',
        left: '36%', width: 1, background: PALETTE.rule,
        transform: `scaleY(${ruleH})`, transformOrigin: 'top',
      }} />
      <div style={{ paddingRight: 80, paddingLeft: 60, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Clip-path reveal for headlines */}
        <span style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 72,
          color: PALETTE.ink, letterSpacing: '-0.02em', lineHeight: 1.05,
          clipPath: `inset(0 ${(1 - line1W) * 100}% 0 0)`,
        }}>Public benchmark for</span>
        <span style={{
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 72,
          color: PALETTE.ember, letterSpacing: '-0.02em', lineHeight: 1.05,
          clipPath: `inset(0 ${(1 - line2W) * 100}% 0 0)`,
        }}>AI agent skills.</span>
        <span style={{
          marginTop: 28,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 20,
          letterSpacing: '0.25em', color: PALETTE.fgMuted, textTransform: 'uppercase',
          opacity: kickerOp, transform: `translateY(${kickerY}px)`,
        }}>100K+ ranked · versuz.dev</span>
      </div>
    </div>
  );
};


// =====================================================================
// SCENE REGISTRY + TAB UI
// =====================================================================
// Format aspect ratio nicely. e.g. 1080x1080 -> "1:1", 1080x1350 -> "4:5".
const aspectLabel = (w, h) => {
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
};

const SCENES = [
  // Campaign ads (featured) — scene components defined in versuz-ads.jsx and exposed via window
  { id: 'first-ad',     group: 'Campaign', name: 'First ad · portrait',   w: 1080, h: 1350, duration: 14.0, comp: window.SceneFirstAd },
  { id: 'first-ad-tt',  group: 'Campaign', name: 'First ad · TikTok',     w: 1080, h: 1920, duration: 15.0, comp: window.SceneFirstAdTikTok },
  { id: 'first-ad-li',  group: 'Campaign', name: 'First ad · LinkedIn',   w: 1200, h: 627,  duration: 11.0, comp: window.SceneFirstAdLinkedIn },
  { id: 'versus-ad',    group: 'Campaign', name: 'Versus · portrait',     w: 1080, h: 1350, duration: 14.0, comp: window.SceneVersusAd },
  { id: 'versus-ad-tt', group: 'Campaign', name: 'Versus · TikTok',       w: 1080, h: 1920, duration: 14.0, comp: window.SceneVersusAdTikTok },
  { id: 'versus-ad-li', group: 'Campaign', name: 'Versus · LinkedIn',     w: 1200, h: 627,  duration: 11.0, comp: window.SceneVersusAdLinkedIn },
  { id: 'climb-tt',     group: 'Campaign', name: 'Climb · TikTok',        w: 1080, h: 1920, duration: 13.0, comp: window.SceneClimbAdTikTok },
  { id: 'climb-li',     group: 'Campaign', name: 'Climb · LinkedIn',      w: 1200, h: 627,  duration: 11.0, comp: window.SceneClimbAdLinkedIn },
  { id: 'judges-tt',    group: 'Campaign', name: 'Judges · TikTok',       w: 1080, h: 1920, duration: 13.0, comp: window.SceneJudgesAdTikTok },
  { id: 'judges-li',    group: 'Campaign', name: 'Judges · LinkedIn',     w: 1200, h: 627,  duration: 11.0, comp: window.SceneJudgesAdLinkedIn },
  // Logo (1:1 / square viewports)
  { id: 'reveal',    group: 'Logo',     name: 'Reveal',        w: 1280, h: 720,  duration: 3.5, comp: SceneLogoReveal },
  { id: 'heartbeat', group: 'Logo',     name: 'Heartbeat',     w: 1280, h: 720,  duration: 4.0, comp: SceneHeartbeat,  loop: true },
  { id: 'glitch',    group: 'Logo',     name: 'Glitch',        w: 1280, h: 720,  duration: 3.0, comp: SceneGlitch },
  // Wordmark/typo
  { id: 'typer',     group: 'Wordmark', name: 'Typewriter',    w: 1280, h: 720,  duration: 3.0, comp: SceneTypewriter },
  { id: 'italic',    group: 'Wordmark', name: 'Italic snap',   w: 1280, h: 720,  duration: 3.0, comp: SceneItalicSnap, loop: true },
  // Social motion
  { id: 'ig-sq',     group: 'Social',   name: 'Instagram 1:1', w: 1080, h: 1080, duration: 6.0, comp: SceneIGSquare,   loop: true },
  { id: 'ig-pr',     group: 'Social',   name: 'Instagram 4:5', w: 1080, h: 1350, duration: 6.0, comp: SceneIGPortrait },
  { id: 'tiktok',    group: 'Social',   name: 'TikTok 9:16',   w: 1080, h: 1920, duration: 7.0, comp: SceneTikTok },
  { id: 'li',        group: 'Social',   name: 'LinkedIn',      w: 1200, h: 627,  duration: 5.0, comp: SceneLinkedIn },
];

const App = () => {
  const [activeId, setActiveId] = useState('first-ad');
  const scene = SCENES.find(s => s.id === activeId) || SCENES[0];
  const groups = useMemo(() => {
    const m = {};
    for (const s of SCENES) (m[s.group] ||= []).push(s);
    return m;
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.ink, color: PALETTE.bone, display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header style={{
        height: 72, padding: '0 32px', borderBottom: `1px solid rgba(250,248,243,0.08)`,
        display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width={32} height={22} viewBox={M_VB}>
            <path d={MARK_Z_PATH} fill={PALETTE.bone} />
            <path d={MARK_V_PATH} fill={PALETTE.ember} />
          </svg>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            verSuz<span style={{ display: 'inline-block', width: 8, height: 8, background: PALETTE.ember, marginLeft: 6, transform: 'translateY(-2px)' }} />
          </span>
          <span style={{
            marginLeft: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,248,243,0.5)',
            border: `1px solid rgba(250,248,243,0.18)`, padding: '4px 10px',
          }}>Motion · v01</span>
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', color: 'rgba(250,248,243,0.4)', textTransform: 'uppercase', marginLeft: 'auto' }}>
          {scene.w}×{scene.h} · {scene.duration}s {scene.loop ? '· loop' : ''}
        </span>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Scene tabs — always visible across the top */}
        <nav style={{
          background: '#14110F', borderBottom: `1px solid rgba(250,248,243,0.08)`,
          padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 24,
          overflowX: 'auto', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            letterSpacing: '0.22em', color: PALETTE.ember,
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            <span style={{ display: 'inline-block', width: 14, height: 1, background: PALETTE.ember, marginRight: 8, verticalAlign: 'middle' }} />
            {SCENES.length} scenes
          </span>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                letterSpacing: '0.22em', color: 'rgba(250,248,243,0.4)',
                textTransform: 'uppercase', marginRight: 4,
              }}>{group}</span>
              {items.map(s => {
                const active = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(194,65,12,0.12)'; e.currentTarget.style.color = PALETTE.bone; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(250,248,243,0.78)'; } }}
                    style={{
                      padding: '8px 14px',
                      background: active ? PALETTE.ember : 'transparent',
                      color: active ? PALETTE.bone : 'rgba(250,248,243,0.78)',
                      border: `1px solid ${active ? PALETTE.ember : 'rgba(250,248,243,0.14)'}`,
                      cursor: 'pointer',
                      fontFamily: "'Instrument Serif', serif", fontSize: 18,
                      fontStyle: active ? 'italic' : 'normal',
                      letterSpacing: '-0.01em', lineHeight: 1,
                      whiteSpace: 'nowrap',
                      transition: 'background-color .12s, color .12s, border-color .12s',
                    }}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Stage canvas */}
        <main style={{
          padding: 24, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: PALETTE.ink, flex: 1, minHeight: 0, overflow: 'hidden',
          position: 'relative',
        }}>
          <Stage
            key={activeId}
            width={scene.w}
            height={scene.h}
            duration={scene.duration}
            background={PALETTE.bone}
            autoplay={true}
            loop={scene.loop !== false}
            persistKey={`vz-motion:${activeId}`}
          >
            {React.createElement(scene.comp)}
          </Stage>
        </main>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
