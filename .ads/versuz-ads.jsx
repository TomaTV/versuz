// =====================================================================
// Versuz Motion — ad scenes
// Loads after versuz-anim-marks.jsx, before versuz-motion.jsx.
// Exposes 10 ad scene components via window.
// =====================================================================
const { useTime, Easing, animate, clamp } = window;
const { PALETTE } = window;
const { AnimMark, AnimWordmark, AdTerminal, TerminalLine, BenchBar, FinalLogoOverlay,
        TERM_BG, TERM_TEXT, TERM_DIM, TERM_GREEN, TERM_AMBER } = window;

// =====================================================================
// SHARED AD DATA
// =====================================================================
const AD_CMD = '$ npx versuz submit ./pdf-extract';
const AD_OUTPUT_LINES = [
  { offset: 0.25, text: 'skill packaged · 4.2KB',         icon: '✓', color: TERM_GREEN },
  { offset: 0.55, text: 'uploading to arena…',            icon: '→', color: TERM_DIM   },
  { offset: 0.95, text: 'uploaded · cycle #184',          icon: '✓', color: TERM_GREEN },
  { offset: 1.35, text: 'running 4 benchmark suites…',    icon: '▸', color: TERM_AMBER },
];
const AD_BENCH_SUITES_FULL = [
  { name: 'pdf-bench-200',    startOffset: 1.7, dur: 1.3, score: 94.2, baseline: 87.1 },
  { name: 'table-extract',    startOffset: 2.0, dur: 1.4, score: 91.6, baseline: 85.4 },
  { name: 'form-recognition', startOffset: 2.3, dur: 1.5, score: 88.9, baseline: 82.7 },
  { name: 'ocr-mix',          startOffset: 2.6, dur: 1.6, score: 93.5, baseline: 79.1 },
];
const AD_LEADERBOARD = [
  { rank: 1, id: 'pdf-extract', author: 'you',      elo: 1648, delta: 24,  highlight: true },
  { rank: 2, id: 'pdf-fast',    author: 'maple',    elo: 1612, delta: -8                    },
  { rank: 3, id: 'csv-surgeon', author: 'rowan-yu', elo: 1594, delta: 4                     },
  { rank: 4, id: 'pdf-quick',   author: 'jet-ai',   elo: 1578, delta: -2                    },
];

// Renders the CMD + cursor + output + benches + summary + leaderboard inside a terminal body.
// Returns JSX. Used by Portrait and TikTok variants of First Ad.
const renderFirstAdBody = ({ t, cmdStart, cmdSpeed, fontSize, iconSize, lbStart, benchEnd }) => {
  const cmdEnd = cmdStart + AD_CMD.length * cmdSpeed;
  const outputLines = AD_OUTPUT_LINES.map(l => ({ ...l, at: cmdEnd + l.offset }));
  const benchSuites = AD_BENCH_SUITES_FULL.map(b => ({ ...b, start: cmdEnd + b.startOffset }));
  const cmdChars = clamp(Math.floor((t - cmdStart) / cmdSpeed), 0, AD_CMD.length);
  const cmdText = AD_CMD.slice(0, cmdChars);
  const cursorBlink = (Math.floor(t * 2.5) % 2 === 0);
  const showCursor = t >= cmdStart && t < outputLines[0].at - 0.1;
  const summaryOp = animate({ from: 0, to: 1, start: benchEnd + 0.15, end: benchEnd + 0.45 })(t);
  const lbPanelOp = animate({ from: 0, to: 1, start: lbStart - 0.1, end: lbStart + 0.4 })(t);
  const lbPanelY  = animate({ from: 60, to: 0, start: lbStart - 0.1, end: lbStart + 0.5, ease: Easing.easeOutCubic })(t);
  const lbRowAnim = (i) => {
    const start = lbStart + i * 0.10;
    return {
      opacity: animate({ from: 0, to: 1, start, end: start + 0.4 })(t),
      transform: `translateY(${animate({ from: 18, to: 0, start, end: start + 0.5, ease: Easing.easeOutCubic })(t)}px)`,
    };
  };

  const FS = fontSize, IS = iconSize;
  return (
    <div style={{ fontSize: FS, lineHeight: 1.55, letterSpacing: '0.01em' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ whiteSpace: 'pre' }}>{cmdText}</span>
        {showCursor && <span style={{ display: 'inline-block', width: FS * 0.55, height: FS * 1.1, background: PALETTE.ember, marginLeft: 4, transform: `translateY(${FS * 0.18}px)`, opacity: cursorBlink ? 1 : 0 }} />}
      </div>
      {outputLines.map((l, i) => (
        <TerminalLine key={i} {...l} t={t} fontSize={FS - 4} iconSize={IS} />
      ))}
      <div style={{ marginTop: FS, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {benchSuites.map((b, i) => <BenchBar key={i} bar={b} t={t} fontSize={FS - 7} />)}
      </div>
      <div style={{ marginTop: 22, opacity: summaryOp, display: 'flex', gap: 14, alignItems: 'baseline', paddingTop: 16, borderTop: `1px solid rgba(255,255,255,0.10)` }}>
        <span style={{ color: PALETTE.ember, fontWeight: 500, fontSize: FS - 4 }}>★</span>
        <span style={{ fontSize: FS - 6 }}>
          <span style={{ color: TERM_DIM }}>aggregate</span>{' '}
          <span style={{ color: TERM_TEXT, fontWeight: 500 }}>92.05</span>{' '}
          <span style={{ color: TERM_DIM }}>· elo</span>{' '}
          <span style={{ color: PALETTE.ember, fontWeight: 500 }}>1648 ↗ +24</span>
        </span>
      </div>
      <div style={{ marginTop: 22, opacity: lbPanelOp, transform: `translateY(${lbPanelY}px)`, paddingTop: 18, borderTop: `1px solid rgba(255,255,255,0.10)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ color: PALETTE.ember, fontSize: FS - 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>cycle #184 · standings</span>
          <span style={{ color: TERM_DIM, fontSize: FS - 9 }}>top 4</span>
        </div>
        {AD_LEADERBOARD.map((r, i) => (
          <div key={r.id} style={{
            ...lbRowAnim(i),
            display: 'grid', gridTemplateColumns: `${FS * 2}px 1fr ${FS * 4.6}px ${FS * 3.6}px`,
            gap: 14, alignItems: 'baseline', padding: '8px 0',
            borderBottom: i < AD_LEADERBOARD.length - 1 ? `1px solid rgba(255,255,255,0.06)` : 'none',
            background: r.highlight ? 'rgba(194,65,12,0.14)' : 'transparent',
          }}>
            <span style={{ color: r.highlight ? PALETTE.ember : TERM_DIM, fontSize: FS - 7, fontWeight: 500, paddingLeft: r.highlight ? 10 : 0 }}>#{String(r.rank).padStart(2, '0')}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: r.highlight ? 'italic' : 'normal', fontSize: FS - 2, color: r.highlight ? PALETTE.ember : TERM_TEXT, letterSpacing: '-0.01em' }}>{r.id}</span>
              <span style={{ fontSize: FS - 13, color: TERM_DIM, letterSpacing: '0.04em' }}>{r.author}</span>
            </span>
            <span style={{ fontSize: FS - 6, fontWeight: 500, color: r.highlight ? PALETTE.ember : TERM_TEXT, textAlign: 'right' }}>{r.elo}</span>
            <span style={{ fontSize: FS - 11, color: r.delta > 0 ? TERM_GREEN : PALETTE.crimson, textAlign: 'right', paddingRight: r.highlight ? 10 : 0 }}>
              {r.delta > 0 ? '↗ +' : '↘ '}{Math.abs(r.delta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================================================
// 1. FIRST AD · PORTRAIT  (1080×1350, 14s)
// =====================================================================
const SceneFirstAd = () => {
  const t = useTime();
  const cmdStart = 0.5, cmdSpeed = 0.045;
  const cmdEnd = cmdStart + AD_CMD.length * cmdSpeed;
  const benchEnd = cmdEnd + 2.6 + 1.6;
  const lbStart = benchEnd + 0.4;
  const LOGO_START = 10.8;
  const termOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.6, ease: Easing.easeInCubic })(t);
  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <AdTerminal inset={{ top: 60, right: 60, bottom: 60, left: 60 }} opacity={termOp}>
        {renderFirstAdBody({ t, cmdStart, cmdSpeed, fontSize: 26, iconSize: 22, lbStart, benchEnd })}
      </AdTerminal>
      <FinalLogoOverlay start={LOGO_START + 0.4} t={t} markSize={320} wmSize={120} tagSize={56} />
    </div>
  );
};

// =====================================================================
// 2. FIRST AD · TIKTOK  (1080×1920, 15s)
// =====================================================================
const SceneFirstAdTikTok = () => {
  const t = useTime();
  const cmdStart = 1.6, cmdSpeed = 0.045;
  const cmdEnd = cmdStart + AD_CMD.length * cmdSpeed;
  const benchEnd = cmdEnd + 2.6 + 1.6;
  const lbStart = benchEnd + 0.4;
  const LOGO_START = 11.8;
  const headlineOp = animate({ from: 0, to: 1, start: 0.2, end: 0.9 })(t);
  const headlineY  = animate({ from: 20, to: 0, start: 0.2, end: 0.9, ease: Easing.easeOutCubic })(t);
  const fadeOp = animate({ from: 1, to: 0, start: LOGO_START - 0.4, end: LOGO_START + 0.2 })(t);
  const termOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.6, ease: Easing.easeInCubic })(t);
  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 120, left: 60, right: 60, opacity: headlineOp * fadeOp, transform: `translateY(${headlineY}px)`, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, letterSpacing: '0.28em', color: PALETTE.ember, textTransform: 'uppercase' }}>introducing</span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 110, lineHeight: 0.95, letterSpacing: '-0.04em', color: PALETTE.ink }}>The public arena for</span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 110, fontStyle: 'italic', lineHeight: 0.95, letterSpacing: '-0.04em', color: PALETTE.ember }}>AI agent skills.</span>
      </div>
      <AdTerminal inset={{ top: 500, right: 60, bottom: 140, left: 60 }} opacity={termOp} density="large">
        {renderFirstAdBody({ t, cmdStart, cmdSpeed, fontSize: 30, iconSize: 26, lbStart, benchEnd })}
      </AdTerminal>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', opacity: fadeOp, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, letterSpacing: '0.3em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>↓ caption safe area</div>
      <FinalLogoOverlay start={LOGO_START + 0.4} t={t} markSize={420} wmSize={160} tagSize={70} urlBottom={220} taglineMultiline />
    </div>
  );
};

// =====================================================================
// 3. FIRST AD · LINKEDIN  (1200×627, 11s)
// =====================================================================
const SceneFirstAdLinkedIn = () => {
  const t = useTime();
  const cmdStart = 0.5, cmdSpeed = 0.04;
  const cmdEnd = cmdStart + AD_CMD.length * cmdSpeed;
  const outputLines = [
    { at: cmdEnd + 0.25, text: 'skill packaged · 4.2KB',         icon: '✓', color: TERM_GREEN },
    { at: cmdEnd + 0.55, text: 'benchmarked across 4 suites',    icon: '▸', color: TERM_AMBER },
    { at: cmdEnd + 0.95, text: 'aggregate 92.05 · ranked #1',    icon: '✓', color: PALETTE.ember },
  ];
  const termCloseAt = 4.6;
  const badgeStart = termCloseAt;
  const badgeOp = animate({ from: 0, to: 1, start: badgeStart, end: badgeStart + 0.6 })(t);
  const badgeY  = animate({ from: 30, to: 0, start: badgeStart, end: badgeStart + 0.7, ease: Easing.easeOutCubic })(t);
  const badgeFade = animate({ from: 1, to: 0, start: 8.4, end: 8.9, ease: Easing.easeInCubic })(t);
  const LOGO_START = 8.7;
  const cmdChars = clamp(Math.floor((t - cmdStart) / cmdSpeed), 0, AD_CMD.length);
  const cmdText = AD_CMD.slice(0, cmdChars);
  const cursorBlink = (Math.floor(t * 2.5) % 2 === 0);
  const showCursor = t >= cmdStart && t < outputLines[0].at - 0.1;
  const termOp = animate({ from: 1, to: 0, start: termCloseAt, end: termCloseAt + 0.5, ease: Easing.easeInCubic })(t);
  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <AdTerminal inset={{ top: 60, right: 60, bottom: 60, left: 60 }} opacity={termOp} density="compact">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ whiteSpace: 'pre', fontSize: 22 }}>{cmdText}</span>
          {showCursor && <span style={{ display: 'inline-block', width: 12, height: 24, background: PALETTE.ember, marginLeft: 4, transform: 'translateY(3px)', opacity: cursorBlink ? 1 : 0 }} />}
        </div>
        {outputLines.map((l, i) => <TerminalLine key={i} {...l} t={t} fontSize={20} iconSize={20} />)}
      </AdTerminal>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: badgeOp * badgeFade, transform: `translateY(${badgeY}px)`, pointerEvents: 'none' }}>
        <div style={{ padding: '48px 80px', background: PALETTE.bone, border: `2px solid ${PALETTE.ink}`, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', maxWidth: 920 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.24em', color: PALETTE.ember, textTransform: 'uppercase' }}>
            <span style={{ display: 'inline-block', width: 16, height: 1, background: PALETTE.ember, marginRight: 10, verticalAlign: 'middle' }} />
            cycle #184 · winner
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 96, color: PALETTE.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>pdf-extract</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, color: PALETTE.ember, fontWeight: 500 }}>↗ +24 ELO</span>
          </div>
          <div style={{ display: 'flex', gap: 32, fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: PALETTE.fgMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>
            <span>aggregate <span style={{ color: PALETTE.ink, fontWeight: 500 }}>92.05</span></span>
            <span>elo <span style={{ color: PALETTE.ink, fontWeight: 500 }}>1648</span></span>
            <span>rank <span style={{ color: PALETTE.ember, fontWeight: 500 }}>#01</span></span>
          </div>
        </div>
      </div>
      <FinalLogoOverlay start={LOGO_START} t={t} layout="horizontal" markSize={220} wmSize={88} tagSize={36} urlText="versuz.dev · 100k+ ranked" />
    </div>
  );
};

// =====================================================================
// VERSUS shared data
// =====================================================================
const VERSUS_LEFT_LINES  = [
  { offset: 0.0,  text: 'parsing 14 pages',       icon: '✓' },
  { offset: 0.4,  text: 'tables detected: 8',     icon: '✓' },
  { offset: 0.8,  text: 'cells extracted: 312',   icon: '✓' },
  { offset: 1.3,  text: 'headers normalized',     icon: '✓' },
  { offset: 1.8,  text: 'judge OPUS  → 94',       icon: '★', color: PALETTE.ember },
  { offset: 2.3,  text: 'judge SONNET → 89',      icon: '★', color: PALETTE.ember },
  { offset: 2.8,  text: 'judge HAIKU → 91',       icon: '★', color: PALETTE.ember },
];
const VERSUS_RIGHT_LINES = [
  { offset: 0.1,  text: 'parsing 14 pages',       icon: '✓' },
  { offset: 0.6,  text: 'tables detected: 6',     icon: '~', color: PALETTE.amber },
  { offset: 1.1,  text: 'cells extracted: 248',   icon: '~', color: PALETTE.amber },
  { offset: 1.7,  text: '2 header mismatches',    icon: '!', color: PALETTE.crimson },
  { offset: 2.1,  text: 'judge OPUS  → 86',       icon: '★', color: TERM_DIM },
  { offset: 2.6,  text: 'judge SONNET → 79',      icon: '★', color: TERM_DIM },
  { offset: 3.1,  text: 'judge HAIKU → 82',       icon: '★', color: TERM_DIM },
];

// =====================================================================
// 4. VERSUS AD · PORTRAIT  (1080×1350, 14s)
// =====================================================================
const SceneVersusAd = () => {
  const t = useTime();
  const vsScale = animate({ from: 0, to: 1, start: 0.15, end: 0.7, ease: Easing.easeOutBack })(t);
  const vsTop   = animate({ from: 0.5, to: 0.1, start: 1.4, end: 2.0, ease: Easing.easeInOutCubic })(t);
  const vsScaleEnd = animate({ from: 1, to: 0.45, start: 1.4, end: 2.0, ease: Easing.easeInOutCubic })(t);
  const leftX  = animate({ from: -300, to: 0, start: 1.8, end: 2.6, ease: Easing.easeOutCubic })(t);
  const rightX = animate({ from:  300, to: 0, start: 2.0, end: 2.8, ease: Easing.easeOutCubic })(t);
  const leftOp  = animate({ from: 0, to: 1, start: 1.8, end: 2.3 })(t);
  const rightOp = animate({ from: 0, to: 1, start: 2.0, end: 2.5 })(t);
  const promptY  = animate({ from: 30, to: 0, start: 3.4, end: 4.0, ease: Easing.easeOutCubic })(t);
  const promptOp = animate({ from: 0, to: 1, start: 3.4, end: 3.9 })(t);
  const STREAM_START = 4.6;
  const verdictStart = 8.6;
  const verdictX = animate({ from: 1500, to: 0, start: verdictStart, end: verdictStart + 0.4, ease: Easing.easeOutCubic })(t);
  const verdictOp = animate({ from: 0, to: 1, start: verdictStart, end: verdictStart + 0.3 })(t);
  const LOGO_START = 10.8;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5, ease: Easing.easeInCubic })(t);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, letterSpacing: '0.3em', color: PALETTE.fgMuted, textTransform: 'uppercase', opacity: animate({ from: 0, to: 1, start: 0.3, end: 0.8 })(t) }}>two skills enter</div>
        <div style={{ position: 'absolute', left: '50%', top: `${vsTop * 100}%`, transform: `translate(-50%, -50%) scale(${vsScale * vsScaleEnd})`, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 280, lineHeight: 1, letterSpacing: '-0.04em', color: PALETTE.ember, transformOrigin: 'center' }}>vs</div>
        <SkillCard side="left"  x={leftX}  op={leftOp}  label="challenger" name="pdf-extract" author="by you" pkg="pkg 4.2KB" elo={1624} portrait />
        <SkillCard side="right" x={rightX} op={rightOp} label="defender"   name="pdf-fast"    author="by maple" pkg="pkg 5.8KB" elo={1620} portrait />
        <div style={{ position: 'absolute', left: 60, right: 60, top: 470, opacity: promptOp, transform: `translateY(${promptY}px)`, padding: 22, border: `1px solid ${PALETTE.ink}`, background: PALETTE.bone }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.24em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>same prompt · same data</span>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, color: PALETTE.ink, marginTop: 8 }}>
            <span style={{ color: PALETTE.ember }}>$</span> extract tables from <span style={{ color: PALETTE.ember }}>quarterly_report.pdf</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 60, top: 600, width: 460, bottom: 230, background: TERM_BG, padding: 24, overflow: 'hidden' }}>
          {VERSUS_LEFT_LINES.map((l, i) => <StreamLine key={i} l={{ ...l, at: STREAM_START + l.offset }} t={t} />)}
        </div>
        <div style={{ position: 'absolute', right: 60, top: 600, width: 460, bottom: 230, background: TERM_BG, padding: 24, overflow: 'hidden' }}>
          {VERSUS_RIGHT_LINES.map((l, i) => <StreamLine key={i} l={{ ...l, at: STREAM_START + l.offset }} t={t} />)}
        </div>
        <VerdictBar opacity={verdictOp} translateX={verdictX} />
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.3} t={t} markSize={300} urlText="versuz.dev · $ npx versuz battle" />
    </div>
  );
};

// Reusable: a skill challenger/defender card
const SkillCard = ({ side, x, op, label, name, author, pkg, elo, portrait, horizontal }) => {
  const isLeft = side === 'left';
  const darkBg = isLeft;
  const styleBase = {
    opacity: op, transform: `translateX(${x}px)`,
    padding: 28,
    background: darkBg ? PALETTE.ink : PALETTE.bone,
    color: darkBg ? PALETTE.bone : PALETTE.ink,
    border: darkBg ? 'none' : `1px solid ${PALETTE.rule}`,
  };
  let pos = {};
  if (portrait) pos = { position: 'absolute', top: 220, width: 460, [isLeft ? 'left' : 'right']: 60 };
  else if (horizontal) pos = { position: 'absolute', top: 90, width: 380, [isLeft ? 'left' : 'right']: 60 };
  else pos = { width: '100%' };

  return (
    <div style={{ ...pos, ...styleBase }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: '0.24em', color: darkBg ? PALETTE.ember : PALETTE.fgMuted, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 56, color: darkBg ? PALETTE.bone : PALETTE.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 10 }}>{name}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: darkBg ? 'rgba(250,248,243,0.55)' : PALETTE.fgMuted, letterSpacing: '0.06em', marginTop: 6 }}>{author} · {pkg}</div>
      <div style={{ marginTop: 18, fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: darkBg ? PALETTE.ember : PALETTE.ink, fontWeight: 500 }}>{elo} <span style={{ fontSize: 14, color: darkBg ? 'rgba(250,248,243,0.55)' : PALETTE.fgMuted, fontWeight: 400 }}>prior elo</span></div>
    </div>
  );
};

const StreamLine = ({ l, t, fontSize = 18, iconSize = 18 }) => {
  const op = animate({ from: 0, to: 1, start: l.at, end: l.at + 0.2 })(t);
  const ty = animate({ from: 6, to: 0, start: l.at, end: l.at + 0.3, ease: Easing.easeOutCubic })(t);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', opacity: op, transform: `translateY(${ty}px)`, marginTop: 6 }}>
      <span style={{ color: l.color || TERM_GREEN, fontSize: iconSize, fontWeight: 500, width: 16 }}>{l.icon}</span>
      <span style={{ color: TERM_TEXT, fontFamily: "'IBM Plex Mono', monospace", fontSize }}>{l.text}</span>
    </div>
  );
};

const VerdictBar = ({ opacity, translateX, bottom = 100, fontSize = 56 }) => (
  <div style={{
    position: 'absolute', left: 60, right: 60, bottom,
    opacity, transform: `translateX(${translateX}px)`,
    padding: '28px 36px', background: PALETTE.ember, color: PALETTE.bone,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
  }}>
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase' }}>verdict</span>
    <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize, letterSpacing: '-0.02em', flex: 1, textAlign: 'center' }}>pdf-extract wins.</span>
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 500, letterSpacing: '0.06em' }}>↗ +24 ELO</span>
  </div>
);

// =====================================================================
// 5. VERSUS AD · TIKTOK  (1080×1920, 14s)
// =====================================================================
const SceneVersusAdTikTok = () => {
  const t = useTime();
  const vsScale = animate({ from: 0, to: 1, start: 0.15, end: 0.7, ease: Easing.easeOutBack })(t);
  const vsTop   = animate({ from: 0.5, to: 0.12, start: 1.4, end: 2.0, ease: Easing.easeInOutCubic })(t);
  const vsScaleEnd = animate({ from: 1, to: 0.4, start: 1.4, end: 2.0, ease: Easing.easeInOutCubic })(t);
  const leftY = animate({ from: -100, to: 0, start: 1.8, end: 2.6, ease: Easing.easeOutCubic })(t);
  const rightY = animate({ from: 100, to: 0, start: 2.0, end: 2.8, ease: Easing.easeOutCubic })(t);
  const leftOp = animate({ from: 0, to: 1, start: 1.8, end: 2.3 })(t);
  const rightOp = animate({ from: 0, to: 1, start: 2.0, end: 2.5 })(t);
  const promptOp = animate({ from: 0, to: 1, start: 3.4, end: 3.9 })(t);
  const STREAM_START = 4.6;
  const verdictX = animate({ from: 1500, to: 0, start: 8.6, end: 9.0, ease: Easing.easeOutCubic })(t);
  const verdictOp = animate({ from: 0, to: 1, start: 8.6, end: 8.9 })(t);
  const LOGO_START = 10.6;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5, ease: Easing.easeInCubic })(t);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        {/* Top eyebrow */}
        <div style={{ position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, letterSpacing: '0.3em', color: PALETTE.fgMuted, textTransform: 'uppercase', opacity: animate({ from: 0, to: 1, start: 0.3, end: 0.8 })(t) }}>two skills enter · one wins</div>
        {/* VS center */}
        <div style={{ position: 'absolute', left: '50%', top: `${vsTop * 100}%`, transform: `translate(-50%, -50%) scale(${vsScale * vsScaleEnd})`, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 360, lineHeight: 1, letterSpacing: '-0.04em', color: PALETTE.ember, transformOrigin: 'center' }}>vs</div>
        {/* Challenger card top */}
        <div style={{ position: 'absolute', top: 280, left: 60, right: 60, opacity: leftOp, transform: `translateY(${leftY}px)`, padding: 32, background: PALETTE.ink, color: PALETTE.bone }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, letterSpacing: '0.24em', color: PALETTE.ember, textTransform: 'uppercase' }}>challenger</span>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 72, color: PALETTE.bone, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 10 }}>pdf-extract</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, color: 'rgba(250,248,243,0.55)', letterSpacing: '0.06em' }}>by you · pkg 4.2KB</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, color: PALETTE.ember, fontWeight: 500 }}>1624</span>
          </div>
        </div>
        {/* Defender card bottom */}
        <div style={{ position: 'absolute', top: 600, left: 60, right: 60, opacity: rightOp, transform: `translateY(${rightY}px)`, padding: 32, background: PALETTE.bone, color: PALETTE.ink, border: `1px solid ${PALETTE.rule}` }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, letterSpacing: '0.24em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>defender</span>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 72, color: PALETTE.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 10 }}>pdf-fast</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, color: PALETTE.fgMuted, letterSpacing: '0.06em' }}>by maple · pkg 5.8KB</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, color: PALETTE.ink, fontWeight: 500 }}>1620</span>
          </div>
        </div>
        {/* Prompt below cards */}
        <div style={{ position: 'absolute', top: 920, left: 60, right: 60, opacity: promptOp, padding: 24, border: `1px solid ${PALETTE.ink}`, background: PALETTE.bone }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.24em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>same prompt · same data</span>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, color: PALETTE.ink, marginTop: 8 }}>
            <span style={{ color: PALETTE.ember }}>$</span> extract tables from <span style={{ color: PALETTE.ember }}>quarterly_report.pdf</span>
          </div>
        </div>
        {/* Two output panels stacked */}
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1130, height: 280, background: TERM_BG, padding: 28, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <div>{VERSUS_LEFT_LINES.map((l, i) => <StreamLine key={i} l={{ ...l, at: STREAM_START + l.offset }} t={t} fontSize={20} iconSize={20} />)}</div>
          <div>{VERSUS_RIGHT_LINES.map((l, i) => <StreamLine key={i} l={{ ...l, at: STREAM_START + l.offset }} t={t} fontSize={20} iconSize={20} />)}</div>
        </div>
        {/* Verdict */}
        <div style={{
          position: 'absolute', left: 60, right: 60, bottom: 240,
          opacity: verdictOp, transform: `translateX(${verdictX}px)`,
          padding: '36px 40px', background: PALETTE.ember, color: PALETTE.bone,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, letterSpacing: '0.3em', textTransform: 'uppercase' }}>verdict</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 88, letterSpacing: '-0.02em', lineHeight: 1 }}>pdf-extract wins.</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 500, letterSpacing: '0.1em' }}>↗ +24 ELO</span>
        </div>
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.3} t={t} markSize={420} wmSize={160} tagSize={70} urlBottom={240} taglineMultiline urlText="versuz.dev · $ npx versuz battle" />
    </div>
  );
};

// =====================================================================
// 6. VERSUS AD · LINKEDIN  (1200×627, 11s)
// =====================================================================
const SceneVersusAdLinkedIn = () => {
  const t = useTime();
  const eyebrowOp = animate({ from: 0, to: 1, start: 0.2, end: 0.7 })(t);
  const leftX  = animate({ from: -200, to: 0, start: 0.6, end: 1.3, ease: Easing.easeOutCubic })(t);
  const rightX = animate({ from:  200, to: 0, start: 0.8, end: 1.5, ease: Easing.easeOutCubic })(t);
  const leftOp  = animate({ from: 0, to: 1, start: 0.6, end: 1.1 })(t);
  const rightOp = animate({ from: 0, to: 1, start: 0.8, end: 1.3 })(t);
  const STREAM_START = 2.0;
  const verdictX = animate({ from: 1400, to: 0, start: 6.4, end: 6.8, ease: Easing.easeOutCubic })(t);
  const verdictOp = animate({ from: 0, to: 1, start: 6.4, end: 6.7 })(t);
  const LOGO_START = 7.8;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5, ease: Easing.easeInCubic })(t);

  // Compressed stream lines (5 each for landscape)
  const leftLines  = VERSUS_LEFT_LINES.slice(2);   // skip first 2, keep richer
  const rightLines = VERSUS_RIGHT_LINES.slice(2);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', top: 36, left: 0, right: 0, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.3em', color: PALETTE.fgMuted, textTransform: 'uppercase', opacity: eyebrowOp }}>two skills enter · one wins</div>
        {/* Center VS */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: `translate(-50%, -50%)`,
          fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
          fontSize: 160, lineHeight: 1, color: PALETTE.ember,
          opacity: animate({ from: 0, to: 1, start: 0.6, end: 1.0 })(t),
        }}>vs</div>
        {/* Left card */}
        <div style={{ position: 'absolute', left: 60, top: 90, width: 380, opacity: leftOp, transform: `translateX(${leftX}px)`, padding: 24, background: PALETTE.ink, color: PALETTE.bone }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.24em', color: PALETTE.ember, textTransform: 'uppercase' }}>challenger</span>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 42, color: PALETTE.bone, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 8 }}>pdf-extract</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'rgba(250,248,243,0.55)', letterSpacing: '0.06em', marginTop: 6 }}>by you · 1624 prior</div>
        </div>
        {/* Right card */}
        <div style={{ position: 'absolute', right: 60, top: 90, width: 380, opacity: rightOp, transform: `translateX(${rightX}px)`, padding: 24, background: PALETTE.bone, color: PALETTE.ink, border: `1px solid ${PALETTE.rule}` }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.24em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>defender</span>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 42, color: PALETTE.ink, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 8 }}>pdf-fast</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.fgMuted, letterSpacing: '0.06em', marginTop: 6 }}>by maple · 1620 prior</div>
        </div>
        {/* Output streams side-by-side */}
        <div style={{ position: 'absolute', left: 60, right: 60, top: 280, bottom: 180, background: TERM_BG, padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, overflow: 'hidden' }}>
          <div>{leftLines.map((l, i) => <StreamLine key={i} l={{ ...l, at: STREAM_START + l.offset - 0.8 }} t={t} fontSize={14} iconSize={14} />)}</div>
          <div>{rightLines.map((l, i) => <StreamLine key={i} l={{ ...l, at: STREAM_START + l.offset - 0.8 }} t={t} fontSize={14} iconSize={14} />)}</div>
        </div>
        {/* Verdict */}
        <div style={{
          position: 'absolute', left: 60, right: 60, bottom: 60,
          opacity: verdictOp, transform: `translateX(${verdictX}px)`,
          padding: '20px 28px', background: PALETTE.ember, color: PALETTE.bone,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase' }}>verdict</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 44, letterSpacing: '-0.02em', flex: 1, textAlign: 'center' }}>pdf-extract wins.</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 500, letterSpacing: '0.06em' }}>↗ +24 ELO</span>
        </div>
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.2} t={t} layout="horizontal" markSize={220} wmSize={88} tagSize={36} urlText="versuz.dev · $ npx versuz battle" />
    </div>
  );
};

// =====================================================================
// CLIMB shared data
// =====================================================================
// Cycles: an underdog skill climbs from #82 to #1 over 5 cycles
const CLIMB_CYCLES = [
  { cycle: 180, rank: 82, elo: 1402, start: 1.0 },
  { cycle: 181, rank: 34, elo: 1488, start: 2.6 },
  { cycle: 182, rank: 12, elo: 1562, start: 4.2 },
  { cycle: 183, rank: 3,  elo: 1612, start: 5.8 },
  { cycle: 184, rank: 1,  elo: 1648, start: 7.4 },
];

// Compute interpolated rank and elo for current time
const climbState = (t) => {
  const cs = CLIMB_CYCLES;
  if (t < cs[0].start) return { cycle: cs[0].cycle, rank: cs[0].rank, elo: cs[0].elo, p: 0 };
  for (let i = 0; i < cs.length; i++) {
    const cur = cs[i], next = cs[i + 1];
    if (!next || t < next.start) {
      const dwell = 1.0; // dwell within a cycle before transitioning
      if (!next || t < cur.start + dwell) {
        return { cycle: cur.cycle, rank: cur.rank, elo: cur.elo, p: 0 };
      }
      // Transition phase
      const transDur = next.start - cur.start - dwell;
      const p = clamp((t - cur.start - dwell) / transDur, 0, 1);
      const eased = Easing.easeInOutCubic(p);
      return {
        cycle: cur.cycle,
        rank: cur.rank + (next.rank - cur.rank) * eased,
        elo:  cur.elo + (next.elo - cur.elo) * eased,
        p: eased,
        nextCycle: next.cycle,
      };
    }
  }
  const last = cs[cs.length - 1];
  return { cycle: last.cycle, rank: last.rank, elo: last.elo, p: 0 };
};

// =====================================================================
// 7. CLIMB AD · TIKTOK  (1080×1920, 13s)
// =====================================================================
const SceneClimbAdTikTok = () => {
  const t = useTime();
  const state = climbState(t);
  // Headline visibility (fade in early, fade out at end)
  const headlineOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(t);
  const meterOp = animate({ from: 0, to: 1, start: 0.6, end: 1.1 })(t);
  // Final result badge after climb
  const RESULT_AT = 9.5;
  const resultOp = animate({ from: 0, to: 1, start: RESULT_AT, end: RESULT_AT + 0.5 })(t);
  const resultY  = animate({ from: 30, to: 0, start: RESULT_AT, end: RESULT_AT + 0.6, ease: Easing.easeOutCubic })(t);
  const LOGO_START = 11.0;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5 })(t);

  // Rank meter: rank 100 at bottom, rank 1 at top
  // Meter goes from y=520 (top, rank 1) to y=1480 (bottom, rank 100)
  const meterTop = 520, meterBot = 1480, meterX = 540;
  const markerY = meterTop + ((state.rank - 1) / 99) * (meterBot - meterTop);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        {/* Headline */}
        <div style={{ position: 'absolute', top: 120, left: 60, right: 60, opacity: headlineOp, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, letterSpacing: '0.28em', color: PALETTE.ember, textTransform: 'uppercase' }}>the climb</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 84, lineHeight: 0.95, letterSpacing: '-0.04em', color: PALETTE.ink }}>5 cycles.</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 84, lineHeight: 0.95, letterSpacing: '-0.04em', color: PALETTE.ember }}>One #1.</span>
        </div>

        {/* Cycle counter */}
        <div style={{ position: 'absolute', top: 420, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: meterOp }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.28em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>cycle</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, color: PALETTE.ink, fontWeight: 500, letterSpacing: '0.04em' }}>#{state.cycle}</span>
        </div>

        {/* Rank meter (vertical bar) */}
        <div style={{ position: 'absolute', left: meterX - 2, top: meterTop, width: 4, height: meterBot - meterTop, background: PALETTE.rule, opacity: meterOp }} />
        {/* Tick labels */}
        {[1, 25, 50, 75, 100].map(r => {
          const y = meterTop + ((r - 1) / 99) * (meterBot - meterTop);
          return (
            <div key={r} style={{ position: 'absolute', left: meterX + 30, top: y - 12, opacity: meterOp * 0.7, fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: PALETTE.fgMuted, letterSpacing: '0.06em' }}>
              <span style={{ display: 'inline-block', width: 18, height: 1, background: PALETTE.rule, marginRight: 10, transform: 'translate(-30px, 12px)' }} />
              #{String(r).padStart(2, '0')}
            </div>
          );
        })}

        {/* Marker — skill position */}
        <div style={{
          position: 'absolute', left: meterX - 22, top: markerY - 22,
          width: 44, height: 44, background: PALETTE.ember,
          opacity: meterOp,
          transition: 'top .05s linear',
        }}>
          <div style={{ position: 'absolute', left: 60, top: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: PALETTE.ember, fontWeight: 500, whiteSpace: 'nowrap' }}>
            #{String(Math.round(state.rank)).padStart(2, '0')} <span style={{ color: PALETTE.fgMuted, fontWeight: 400 }}>· {Math.round(state.elo)} elo</span>
          </div>
        </div>

        {/* Skill name footer */}
        <div style={{ position: 'absolute', bottom: 380, left: 60, right: 60, opacity: meterOp, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 64, color: PALETTE.ink, letterSpacing: '-0.02em' }}>pdf-extract</div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: PALETTE.fgMuted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>by you · 247 skills competing</span>
        </div>

        {/* Result badge */}
        <div style={{
          position: 'absolute', bottom: 200, left: 60, right: 60,
          opacity: resultOp, transform: `translateY(${resultY}px)`,
          padding: '28px 36px', background: PALETTE.ember, color: PALETTE.bone,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase' }}>from</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 96, letterSpacing: '-0.02em', lineHeight: 1 }}>#82 → #01</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase' }}>5 cycles</span>
        </div>
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.3} t={t} markSize={400} wmSize={150} tagSize={66} urlBottom={240} taglineMultiline urlText="versuz.dev · climb the bracket" />
    </div>
  );
};

// =====================================================================
// 8. CLIMB AD · LINKEDIN  (1200×627, 11s)
// =====================================================================
const SceneClimbAdLinkedIn = () => {
  const t = useTime();
  const state = climbState(t);
  const headlineOp = animate({ from: 0, to: 1, start: 0.2, end: 0.7 })(t);
  const chartOp = animate({ from: 0, to: 1, start: 0.6, end: 1.1 })(t);
  const LOGO_START = 8.7;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5 })(t);

  // Chart bounds (right half of LinkedIn canvas)
  const chartLeft = 600, chartRight = 1140, chartTop = 100, chartBot = 490;
  // X axis: cycles 180→184 mapped to chartLeft→chartRight
  // Y axis: rank 1 at top, rank 100 at bottom (inverted)
  const xForCycle = (c) => chartLeft + ((c - 180) / 4) * (chartRight - chartLeft);
  const yForRank  = (r) => chartTop + ((r - 1) / 99) * (chartBot - chartTop);

  // Path drawn up to current cycle progress
  // Each cycle, the path extends from previous node to current
  const visibleNodes = CLIMB_CYCLES.filter(c => t >= c.start);
  const segPath = visibleNodes.length > 0
    ? 'M ' + visibleNodes.map(c => `${xForCycle(c.cycle).toFixed(1)},${yForRank(c.rank).toFixed(1)}`).join(' L ')
    : '';

  // Current marker position (interpolated)
  const markerX = xForCycle(state.cycle + state.p);
  const markerY = yForRank(state.rank);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        {/* Left half — text */}
        <div style={{ position: 'absolute', top: 80, left: 60, right: 560, opacity: headlineOp, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.28em', color: PALETTE.ember, textTransform: 'uppercase' }}>the climb</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 72, lineHeight: 0.98, letterSpacing: '-0.03em', color: PALETTE.ink }}>From #82 to #01.</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, lineHeight: 1.3, color: PALETTE.fgMuted, marginTop: 6 }}>5 cycles. Same skill. The bracket re-evaluates every 24h.</span>
        </div>
        <div style={{ position: 'absolute', bottom: 80, left: 60, opacity: headlineOp, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.24em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>now</span>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 32, color: PALETTE.ember, letterSpacing: '-0.01em' }}>pdf-extract</div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: PALETTE.fgMuted, letterSpacing: '0.06em' }}>cycle #{state.cycle} · rank #{String(Math.round(state.rank)).padStart(2,'0')} · {Math.round(state.elo)} elo</span>
        </div>

        {/* Right half — chart */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: chartOp, pointerEvents: 'none' }}>
          {/* Grid lines */}
          {[1, 25, 50, 75, 100].map(r => (
            <g key={r}>
              <line x1={chartLeft} x2={chartRight} y1={yForRank(r)} y2={yForRank(r)} stroke={PALETTE.rule} strokeWidth="1" />
              <text x={chartLeft - 16} y={yForRank(r) + 5} fontFamily="IBM Plex Mono, monospace" fontSize="13" fill={PALETTE.fgMuted} textAnchor="end" letterSpacing="2">#{String(r).padStart(2,'0')}</text>
            </g>
          ))}
          {/* Cycle x-axis labels */}
          {CLIMB_CYCLES.map(c => (
            <text key={c.cycle} x={xForCycle(c.cycle)} y={chartBot + 26} fontFamily="IBM Plex Mono, monospace" fontSize="13" fill={t >= c.start ? PALETTE.ink : PALETTE.fgMuted} textAnchor="middle" letterSpacing="2">{c.cycle}</text>
          ))}
          {/* Line path */}
          {segPath && (
            <path d={segPath} fill="none" stroke={PALETTE.ember} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {/* Node dots */}
          {visibleNodes.map(c => (
            <rect key={c.cycle} x={xForCycle(c.cycle) - 6} y={yForRank(c.rank) - 6} width="12" height="12" fill={PALETTE.ember} />
          ))}
          {/* Current marker (square) */}
          <rect x={markerX - 8} y={markerY - 8} width="16" height="16" fill={PALETTE.ink} />
        </svg>
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.2} t={t} layout="horizontal" markSize={220} wmSize={88} tagSize={36} urlText="versuz.dev · climb the bracket" />
    </div>
  );
};

// =====================================================================
// JUDGES shared data
// =====================================================================
const JUDGES = [
  { id: 'opus',   name: 'OPUS 4.7',   score: 94, kicker: 'frontier' },
  { id: 'sonnet', name: 'SONNET 4.5', score: 89, kicker: 'workhorse' },
  { id: 'haiku',  name: 'HAIKU 4',    score: 91, kicker: 'fast judge' },
];

// =====================================================================
// 9. JUDGES AD · TIKTOK  (1080×1920, 13s)
// =====================================================================
const SceneJudgesAdTikTok = () => {
  const t = useTime();
  const headlineOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(t);
  const promptY  = animate({ from: 20, to: 0, start: 0.8, end: 1.3, ease: Easing.easeOutCubic })(t);
  const promptOp = animate({ from: 0, to: 1, start: 0.8, end: 1.2 })(t);

  // Each judge appears + thinks + scores
  // Judge i: slides in at 1.6+0.4*i, "thinks" until 3.5+0.5*i, score reveals at 3.5+0.5*i
  const judgeAnim = (i) => {
    const inAt = 1.6 + i * 0.35;
    const scoreAt = 3.5 + i * 0.6;
    const opIn = animate({ from: 0, to: 1, start: inAt, end: inAt + 0.4 })(t);
    const yIn  = animate({ from: 30, to: 0, start: inAt, end: inAt + 0.5, ease: Easing.easeOutCubic })(t);
    const thinking = t >= inAt + 0.4 && t < scoreAt;
    const scored = t >= scoreAt;
    const scoreOp = animate({ from: 0, to: 1, start: scoreAt, end: scoreAt + 0.3 })(t);
    const scoreScale = animate({ from: 0.4, to: 1, start: scoreAt, end: scoreAt + 0.4, ease: Easing.easeOutBack })(t);
    // Pulse during thinking
    const pulse = thinking ? 1 + 0.04 * Math.sin(t * 8) : 1;
    return { opIn, yIn, thinking, scored, scoreOp, scoreScale, pulse };
  };

  // Aggregate at 6.5
  const AGG_AT = 6.5;
  const aggOp = animate({ from: 0, to: 1, start: AGG_AT, end: AGG_AT + 0.5 })(t);
  const aggY  = animate({ from: 30, to: 0, start: AGG_AT, end: AGG_AT + 0.6, ease: Easing.easeOutCubic })(t);

  const LOGO_START = 9.5;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5 })(t);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        {/* Top headline */}
        <div style={{ position: 'absolute', top: 110, left: 60, right: 60, opacity: headlineOp, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, letterSpacing: '0.28em', color: PALETTE.ember, textTransform: 'uppercase' }}>the judges</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 90, lineHeight: 0.95, letterSpacing: '-0.04em', color: PALETTE.ink }}>Three frontier models.</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 90, lineHeight: 0.95, letterSpacing: '-0.04em', color: PALETTE.ember }}>One verdict.</span>
        </div>

        {/* Prompt panel */}
        <div style={{ position: 'absolute', top: 480, left: 60, right: 60, opacity: promptOp, transform: `translateY(${promptY}px)`, padding: 24, border: `1px solid ${PALETTE.ink}`, background: PALETTE.bone }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: '0.24em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>same prompt · all judges</span>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, color: PALETTE.ink, marginTop: 8 }}>
            <span style={{ color: PALETTE.ember }}>$</span> extract tables from <span style={{ color: PALETTE.ember }}>form_10K.pdf</span>
          </div>
        </div>

        {/* Judge cards */}
        <div style={{ position: 'absolute', top: 680, left: 60, right: 60, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {JUDGES.map((j, i) => {
            const a = judgeAnim(i);
            return (
              <div key={j.id} style={{
                opacity: a.opIn,
                transform: `translateY(${a.yIn}px) scale(${a.pulse})`,
                padding: 28,
                background: TERM_BG,
                color: TERM_TEXT,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 20,
                alignItems: 'center',
                border: a.scored ? `1px solid ${PALETTE.ember}` : `1px solid transparent`,
                transition: 'border-color .2s linear',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, letterSpacing: '0.22em', color: PALETTE.ember, textTransform: 'uppercase', fontWeight: 500 }}>{j.name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: TERM_DIM, letterSpacing: '0.1em' }}>
                    {a.thinking ? 'evaluating…' : a.scored ? 'verdict' : '—'}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 64, fontWeight: 500, lineHeight: 1,
                  color: a.scored ? PALETTE.ember : TERM_DIM,
                  opacity: a.scored ? a.scoreOp : 1,
                  transform: a.scored ? `scale(${a.scoreScale})` : 'scale(1)',
                  transformOrigin: 'right center',
                  minWidth: 140, textAlign: 'right',
                }}>
                  {a.scored ? j.score : (a.thinking ? '··' : '—')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Aggregate */}
        <div style={{
          position: 'absolute', bottom: 230, left: 60, right: 60,
          opacity: aggOp, transform: `translateY(${aggY}px)`,
          padding: '28px 36px', background: PALETTE.ember, color: PALETTE.bone,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, letterSpacing: '0.3em', textTransform: 'uppercase' }}>aggregate</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 84, letterSpacing: '-0.02em', lineHeight: 1 }}>91.3</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, letterSpacing: '0.06em', fontWeight: 500 }}>↗ +24 ELO</span>
        </div>
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.3} t={t} markSize={400} wmSize={150} tagSize={66} urlBottom={240} taglineMultiline urlText="versuz.dev · 3 judges · 1 verdict" />
    </div>
  );
};

// =====================================================================
// 10. JUDGES AD · LINKEDIN  (1200×627, 11s)
// =====================================================================
const SceneJudgesAdLinkedIn = () => {
  const t = useTime();
  const headlineOp = animate({ from: 0, to: 1, start: 0.2, end: 0.7 })(t);
  const promptOp = animate({ from: 0, to: 1, start: 0.6, end: 1.0 })(t);

  const judgeAnim = (i) => {
    const inAt = 1.0 + i * 0.3;
    const scoreAt = 2.6 + i * 0.45;
    const opIn = animate({ from: 0, to: 1, start: inAt, end: inAt + 0.4 })(t);
    const xIn  = animate({ from: 30, to: 0, start: inAt, end: inAt + 0.5, ease: Easing.easeOutCubic })(t);
    const thinking = t >= inAt + 0.4 && t < scoreAt;
    const scored = t >= scoreAt;
    const scoreOp = animate({ from: 0, to: 1, start: scoreAt, end: scoreAt + 0.3 })(t);
    const pulse = thinking ? 1 + 0.03 * Math.sin(t * 8) : 1;
    return { opIn, xIn, thinking, scored, scoreOp, pulse };
  };

  const AGG_AT = 5.0;
  const aggOp = animate({ from: 0, to: 1, start: AGG_AT, end: AGG_AT + 0.4 })(t);
  const aggY  = animate({ from: 20, to: 0, start: AGG_AT, end: AGG_AT + 0.5, ease: Easing.easeOutCubic })(t);

  const LOGO_START = 7.8;
  const sceneOp = animate({ from: 1, to: 0, start: LOGO_START, end: LOGO_START + 0.5 })(t);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.bone, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: sceneOp, position: 'absolute', inset: 0 }}>
        {/* Top left: headline */}
        <div style={{ position: 'absolute', top: 60, left: 60, right: 60, opacity: headlineOp, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.28em', color: PALETTE.ember, textTransform: 'uppercase' }}>the judges</span>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 48, lineHeight: 1, letterSpacing: '-0.03em', color: PALETTE.ink }}>Three frontier models. <span style={{ color: PALETTE.ember }}>One verdict.</span></span>
          </div>
        </div>
        {/* Prompt centered */}
        <div style={{ position: 'absolute', top: 180, left: 60, right: 60, opacity: promptOp, padding: 14, border: `1px solid ${PALETTE.ink}`, background: PALETTE.bone, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.22em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>prompt</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: PALETTE.ink, flex: 1, textAlign: 'left' }}>
            <span style={{ color: PALETTE.ember }}>$</span> extract tables from <span style={{ color: PALETTE.ember }}>form_10K.pdf</span>
          </span>
        </div>
        {/* Three judge cards horizontally */}
        <div style={{ position: 'absolute', top: 260, left: 60, right: 60, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {JUDGES.map((j, i) => {
            const a = judgeAnim(i);
            return (
              <div key={j.id} style={{
                opacity: a.opIn,
                transform: `translateX(${a.xIn}px) scale(${a.pulse})`,
                padding: 20, background: TERM_BG, color: TERM_TEXT,
                display: 'flex', flexDirection: 'column', gap: 10,
                border: a.scored ? `1px solid ${PALETTE.ember}` : `1px solid transparent`,
                transition: 'border-color .2s linear',
              }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: '0.22em', color: PALETTE.ember, textTransform: 'uppercase', fontWeight: 500 }}>{j.name}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: TERM_DIM, letterSpacing: '0.1em' }}>
                  {a.thinking ? 'evaluating…' : a.scored ? 'verdict' : '—'}
                </span>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 48, fontWeight: 500, lineHeight: 1, color: a.scored ? PALETTE.ember : TERM_DIM, opacity: a.scored ? a.scoreOp : 1, textAlign: 'right', marginTop: 4 }}>
                  {a.scored ? j.score : (a.thinking ? '··' : '—')}
                </div>
              </div>
            );
          })}
        </div>
        {/* Aggregate bar */}
        <div style={{
          position: 'absolute', bottom: 60, left: 60, right: 60,
          opacity: aggOp, transform: `translateY(${aggY}px)`,
          padding: '18px 28px', background: PALETTE.ember, color: PALETTE.bone,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase' }}>aggregate</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1 }}>91.3</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, letterSpacing: '0.06em', fontWeight: 500 }}>↗ +24 ELO</span>
        </div>
      </div>
      <FinalLogoOverlay start={LOGO_START + 0.2} t={t} layout="horizontal" markSize={220} wmSize={88} tagSize={36} urlText="versuz.dev · 3 judges · 1 verdict" />
    </div>
  );
};

Object.assign(window, {
  SceneFirstAd, SceneFirstAdTikTok, SceneFirstAdLinkedIn,
  SceneVersusAd, SceneVersusAdTikTok, SceneVersusAdLinkedIn,
  SceneClimbAdTikTok, SceneClimbAdLinkedIn,
  SceneJudgesAdTikTok, SceneJudgesAdLinkedIn,
});
