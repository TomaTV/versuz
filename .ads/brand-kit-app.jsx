// =====================================================================
// Versuz Brand Kit — main app
// Sections: Logo Variants · Animations · Patterns · Social · Micro · Export
// =====================================================================

const { useState, useEffect, useRef, useMemo } = React;
const { PALETTE, MARK_V_PATH, MARK_Z_PATH, MARK_VIEWBOX, MARK_AR,
        VzMark, VzWordmark, VzLockup, VzLockupVertical,
        markAsSVG, wordmarkAsSVG, lockupAsSVG } = window;

// ---------- tiny helpers --------------------------------------------------
const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
};

const downloadBlob = (data, filename, mime) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
};

// Toast feedback for copy/download.
const ToastCtx = React.createContext({ push: () => {} });
const ToastHost = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const push = (msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 1800);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: PALETTE.ink, color: PALETTE.bone, padding: '10px 16px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ✓ {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => React.useContext(ToastCtx);

// Render-to-PNG using an offscreen <img> + canvas.
const svgToPng = (svgString, scale = 2, w = 1200, h = 630) => new Promise((resolve, reject) => {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(b => { URL.revokeObjectURL(url); resolve(b); }, 'image/png');
  };
  img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
  img.src = url;
});

// ---------- design tokens used across the kit -----------------------------
const TOKENS = {
  colors: PALETTE,
  type: {
    display: "'Instrument Serif', serif",
    mono:    "'IBM Plex Mono', monospace",
    sans:    "'Inter', system-ui, sans-serif",
  },
};

// =====================================================================
// SHARED UI — Section / Tile / CopyBtn
// =====================================================================
const SectionHead = ({ num, eyebrow, title, sub }) => (
  <header style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'baseline', marginBottom: 48 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="bk-eyebrow">§ {num}</span>
      <span className="bk-eyebrow" style={{ color: PALETTE.fgMuted, textTransform: 'none', letterSpacing: '0.04em' }}>{eyebrow}</span>
    </div>
    <div>
      <h2 style={{ fontFamily: TOKENS.type.display, fontSize: 64, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontFamily: TOKENS.type.display, fontSize: 22, lineHeight: 1.4, color: PALETTE.fgMuted, margin: '20px 0 0', maxWidth: 680 }}>{sub}</p>}
    </div>
  </header>
);

const CopyBtn = ({ label = 'copy', onCopy, getText, getBlob, filename, mime, kind = 'ghost' }) => {
  const toast = useToast();
  const handle = async () => {
    if (getBlob) {
      const b = await getBlob();
      downloadBlob(b, filename, mime);
      toast.push(`downloaded · ${filename}`);
    } else {
      const text = typeof getText === 'function' ? await getText() : getText;
      const ok = await copyToClipboard(text || '');
      toast.push(ok ? `copied · ${label}` : 'copy failed');
      onCopy && onCopy(text);
    }
  };
  return (
    <button className={`bk-btn bk-btn-${kind}`} onClick={handle}>
      <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
    </button>
  );
};

// =====================================================================
// 1. LOGO VARIANTS
// =====================================================================
const LOGO_VARIANTS = [
  { id: 'mark-duo-bone',    kind: 'mark', label: 'Mark · duotone / bone',  bg: PALETTE.bone, build: (s) => <VzMark size={s} />,                                  svg: (s) => markAsSVG({ bg: PALETTE.bone, size: s }) },
  { id: 'mark-duo-ink',     kind: 'mark', label: 'Mark · duotone / ink',   bg: PALETTE.ink,  build: (s) => <VzMark size={s} zColor={PALETTE.bone} />,             svg: (s) => markAsSVG({ vColor: PALETTE.ember, zColor: PALETTE.bone, bg: PALETTE.ink, size: s }) },
  { id: 'mark-ink-bone',    kind: 'mark', label: 'Mark · mono ink / bone', bg: PALETTE.bone, build: (s) => <VzMark size={s} color={PALETTE.ink} />,               svg: (s) => markAsSVG({ mono: PALETTE.ink, bg: PALETTE.bone, size: s }) },
  { id: 'mark-bone-ink',    kind: 'mark', label: 'Mark · mono bone / ink', bg: PALETTE.ink,  build: (s) => <VzMark size={s} color={PALETTE.bone} />,              svg: (s) => markAsSVG({ mono: PALETTE.bone, bg: PALETTE.ink, size: s }) },
  { id: 'wm-ink-bone',      kind: 'wm',   label: 'Wordmark · ink / bone',  bg: PALETTE.bone, build: (s) => <VzWordmark size={s} color={PALETTE.ink} dotColor={PALETTE.ember} />,  svg: (s) => wordmarkAsSVG({ color: PALETTE.ink, dotColor: PALETTE.ember, bg: PALETTE.bone, width: Math.round(s*3.2), height: s }) },
  { id: 'wm-bone-ink',      kind: 'wm',   label: 'Wordmark · bone / ink',  bg: PALETTE.ink,  build: (s) => <VzWordmark size={s} color={PALETTE.bone} dotColor={PALETTE.ember} />, svg: (s) => wordmarkAsSVG({ color: PALETTE.bone, dotColor: PALETTE.ember, bg: PALETTE.ink, width: Math.round(s*3.2), height: s }) },
];

const VariantCard = ({ v }) => {
  const sizes = [24, 72, 200];
  const onBg = v.bg;
  const onInk = onBg === PALETTE.ink;
  return (
    <article
      className="bk-card"
      onClick={async () => { /* click body = copy biggest */ }}
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{
        background: onBg, padding: '36px 24px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 16,
        borderBottom: `1px solid ${PALETTE.rule}`, minHeight: 280, overflow: 'hidden',
      }}>
        {sizes.map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div>{v.build(s)}</div>
            <span style={{ fontFamily: TOKENS.type.mono, fontSize: 9, letterSpacing: '0.12em', color: onInk ? PALETTE.fgMuted : PALETTE.fgMuted, textTransform: 'uppercase' }}>{s}px</span>
          </div>
        ))}
      </div>
      <footer style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: PALETTE.bone,
      }}>
        <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PALETTE.fgMuted }}>{v.label}</span>
        <CopyBtn label="copy svg" getText={() => v.svg(200)} />
      </footer>
    </article>
  );
};

const VariantsSection = () => (
  <section className="bk-section">
    <SectionHead num="01" eyebrow="logo variants" title="Eight ways to wear the mark." sub="Mark, wordmark, and lockups across light & dark grounds. Click any size group to copy its SVG. Every variant ships at 24 / 72 / 200 px." />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
      {LOGO_VARIANTS.slice(0, 6).map(v => <VariantCard key={v.id} v={v} />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
      {/* horizontal lockup — wider card */}
      <article className="bk-card">
        <div style={{ background: PALETTE.bone, padding: '60px 40px', borderBottom: `1px solid ${PALETTE.rule}`, display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'flex-start' }}>
          <VzLockup size={24} />
          <VzLockup size={48} />
          <VzLockup size={96} />
        </div>
        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: PALETTE.bone }}>
          <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PALETTE.fgMuted }}>Lockup · horizontal · ember + ink</span>
          <CopyBtn label="copy svg" getText={() => lockupAsSVG({ width: 700, height: 200, bg: null })} />
        </footer>
      </article>
      <article className="bk-card">
        <div style={{ background: PALETTE.bone, padding: '40px 24px', borderBottom: `1px solid ${PALETTE.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <VzLockupVertical size={36} />
        </div>
        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: PALETTE.bone }}>
          <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: PALETTE.fgMuted }}>Lockup · vertical · square contexts</span>
          <CopyBtn label="copy svg" getText={() => `<!-- vertical lockup: mark stacked above wordmark -->\n${markAsSVG({ size: 200 })}\n${wordmarkAsSVG({ width: 600, height: 160 })}`} />
        </footer>
      </article>
    </div>
  </section>
);

// =====================================================================
// 2. LOGO ANIMATIONS
// =====================================================================
const ANIM_CSS = {
  reveal: `/* Versuz · Reveal — Z scales in then V scales in (stagger), wordmark types, dot pulses. ~1.5s */
@keyframes vz-stroke-in { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes vz-letter-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes vz-dot-pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }

.vz-reveal .vz-stroke-z { animation: vz-stroke-in .30s cubic-bezier(.2,.7,.3,1) .00s both; transform-origin: 50px 80px; transform-box: fill-box; }
.vz-reveal .vz-stroke-v { animation: vz-stroke-in .30s cubic-bezier(.2,.7,.3,1) .10s both; transform-origin: 145px 40px; transform-box: fill-box; }
.vz-reveal .vz-wm-letters > * { display: inline-block; opacity: 0; animation: vz-letter-in .12s ease-out both; }
.vz-reveal .vz-wm-letters > *:nth-child(1) { animation-delay: .50s; }
.vz-reveal .vz-wm-letters > *:nth-child(2) { animation-delay: .58s; }
.vz-reveal .vz-wm-letters > *:nth-child(3) { animation-delay: .66s; }
.vz-reveal .vz-wm-letters > *:nth-child(4) { animation-delay: .74s; }
.vz-reveal .vz-wm-letters > *:nth-child(5) { animation-delay: .82s; }
.vz-reveal .vz-wm-letters > *:nth-child(6) { animation-delay: .90s; }
.vz-reveal .vz-wm-dot { animation: vz-dot-pulse .4s ease-in-out 1.10s both; transform-origin: center; }`,

  heartbeat: `/* Versuz · Heartbeat — dot pulses subtly every 2s. Loop. */
@keyframes vz-heartbeat { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.85; } }
.vz-heartbeat .vz-wm-dot { animation: vz-heartbeat 2s ease-in-out infinite; transform-origin: center; }`,

  hover: `/* Versuz · Hover ember — Z stroke fades, V stroke brightens on hover. */
.vz-anim-hover-ember .vz-stroke-z { transition: opacity .25s ease; opacity: 1; }
.vz-anim-hover-ember .vz-stroke-v { transition: opacity .25s ease; opacity: 0.7; }
.vz-anim-hover-ember:hover .vz-stroke-z { opacity: 0.7; }
.vz-anim-hover-ember:hover .vz-stroke-v { opacity: 1; }`,

  glitch: `/* Versuz · Glitch — desaturate + RGB-shift 's' and 'z' once on load. */
@keyframes vz-glitch-s { 0%, 100% { transform: translateX(0); color: inherit; } 30% { transform: translateX(-1px); color: #B91C1C; } 60% { transform: translateX(1px); color: inherit; } }
@keyframes vz-glitch-z { 0%, 100% { transform: translateX(0); color: inherit; } 30% { transform: translateX(1px); color: #1E40AF; } 60% { transform: translateX(-1px); color: inherit; } }
@keyframes vz-glitch-wash { 0%, 100% { filter: none; } 40% { filter: grayscale(0.6); } }
.vz-glitch .vz-wm-letters { animation: vz-glitch-wash .35s ease-in-out 1; }
.vz-glitch .vz-wm-letters > [data-ltr="S"] { animation: vz-glitch-s .35s ease-in-out 1; display: inline-block; }
.vz-glitch .vz-wm-letters > [data-ltr="z"] { animation: vz-glitch-z .35s ease-in-out 1; display: inline-block; }`,
};

const AnimationTile = ({ id, name, blurb, cssKey, mode }) => {
  // mode: 'oneShot' | 'loop' | 'hover'
  const [key, setKey] = useState(0); // re-mount to replay one-shot
  const [looping, setLooping] = useState(mode === 'loop');
  const isOneShot = mode === 'oneShot';
  const isHover = mode === 'hover';

  const className = (() => {
    if (id === 'reveal' && (looping || key > 0)) return 'vz-reveal';
    if (id === 'heartbeat' && looping) return 'vz-heartbeat';
    if (id === 'glitch' && (key > 0 || looping)) return 'vz-glitch';
    if (id === 'hover') return 'vz-anim-hover-ember';
    return '';
  })();

  return (
    <article className="bk-card">
      <div key={key} style={{
        background: PALETTE.bone, padding: 40, minHeight: 220,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: `1px solid ${PALETTE.rule}`,
      }}>
        <span className={className} style={{ display: 'inline-flex' }}>
          <VzLockup size={42} />
        </span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: PALETTE.bone }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: TOKENS.type.display, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{name}</span>
          <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, color: PALETTE.fgMuted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {isOneShot ? 'one-shot' : isHover ? 'hover' : 'loop'}
          </span>
        </div>
        <p style={{ margin: 0, fontFamily: TOKENS.type.sans, fontSize: 13, lineHeight: 1.5, color: PALETTE.fgMuted }}>{blurb}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {!isHover && (
            <button className="bk-btn bk-btn-ink" onClick={() => {
              if (isOneShot) setKey(k => k + 1);
              else setLooping(l => !l);
            }}>
              <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {isOneShot ? 'play' : (looping ? 'pause' : 'play')}
              </span>
            </button>
          )}
          {isHover && (
            <span className="bk-btn bk-btn-ink" style={{ cursor: 'default' }}>
              <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                hover the mark ↑
              </span>
            </span>
          )}
          <CopyBtn label="copy css" getText={ANIM_CSS[cssKey]} />
          <CopyBtn label="copy keyframes" getText={ANIM_CSS[cssKey].split('\n').filter(l => l.startsWith('@keyframes') || (l.startsWith(' ') && !l.startsWith('  ')) || /^\s*\d+%/.test(l) || l.includes('{') || l.includes('}')).join('\n')} />
        </div>
      </div>
    </article>
  );
};

const AnimationsSection = () => (
  <section className="bk-section">
    <SectionHead num="02" eyebrow="motion" title="Four animations." sub="One reveal for first paint. One heartbeat for waits. One hover for affordance. One glitch for the adversarial theme." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
      <AnimationTile id="reveal"    name="Reveal"      mode="oneShot" cssKey="reveal"    blurb="Flames scale in with a 0.1s stagger, wordmark types letter-by-letter, then the dot pulses. ~1.5s total." />
      <AnimationTile id="heartbeat" name="Heartbeat"   mode="loop"    cssKey="heartbeat" blurb="The dot pulses every 2s — mark and wordmark static. Use as a loading or live-status state." />
      <AnimationTile id="hover"     name="Hover ember" mode="hover"   cssKey="hover"     blurb="On hover the left flame fades to 70% while the right brightens — a candle catching wind. Reverses on leave." />
      <AnimationTile id="glitch"    name="Glitch"      mode="oneShot" cssKey="glitch"    blurb="Wordmark desaturates briefly. The s shifts 1px crimson, the z shifts 1px azure. Use once on first paint." />
    </div>
  </section>
);

// =====================================================================
// 3. BRAND PATTERNS
// =====================================================================
const buildEmberDots = () => {
  // deterministic 60x60 grid with 5–7 ember 4x4 squares
  // positions hand-picked to feel scattered, not gridded
  const dots = [
    [4, 12], [22, 6], [42, 18], [10, 30], [34, 36],
    [50, 26], [16, 50], [44, 52],
  ];
  return dots;
};
const EMBER_DOTS = buildEmberDots();

const emberDotPatternSVG = ({ size = 60 } = {}) => {
  const rects = EMBER_DOTS.map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="4" fill="${PALETTE.ember}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 60 60"><rect width="60" height="60" fill="${PALETTE.bone}"/>${rects}</svg>`;
};

const squareMosaicSVG = ({ tile = 24, cols = 25, rows = 17 } = {}) => {
  // 80% bone, 10% ember, 5% azure, 5% sage — asymmetric.
  // Use a seeded LCG so output is stable.
  let s = 0x1f00ffee;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  const rects = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = r();
      let f = PALETTE.bone;
      if (t < 0.10) f = PALETTE.ember;
      else if (t < 0.15) f = PALETTE.azure;
      else if (t < 0.20) f = PALETTE.sage;
      else continue; // empty = bone (skip rect to keep file small)
      rects.push(`<rect x="${x * tile}" y="${y * tile}" width="${tile}" height="${tile}" fill="${f}"/>`);
    }
  }
  const w = cols * tile, h = rows * tile;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${PALETTE.bone}"/>${rects.join('')}</svg>`;
};

const verticalRulePatternSVG = ({ w = 600, h = 400 } = {}) => {
  let rules = '';
  let col = 0;
  for (let x = 0; x <= w; x += 64) {
    const isMajor = (col % 4 === 0) && col !== 0;
    const stroke = isMajor ? 2 : 1;
    rules += `<rect x="${x - stroke/2}" y="0" width="${stroke}" height="${h}" fill="${PALETTE.ember}"/>`;
    col++;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${PALETTE.bone}"/>${rules}</svg>`;
};

const PATTERNS = [
  {
    id: 'embers', name: 'Ember dot grid',
    blurb: 'Tileable 60×60 with 8 small ember squares. Looks like dim coals across the page.',
    svg: emberDotPatternSVG(),
    css: `background-color: ${PALETTE.bone}; background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(emberDotPatternSVG())}"); background-repeat: repeat; background-size: 60px 60px;`,
  },
  {
    id: 'mosaic', name: 'Square mosaic',
    blurb: 'Sparse tessellation — 80% bone, 10% ember, 5% azure, 5% sage. Use for Twitter banners and OG accents.',
    svg: squareMosaicSVG(),
    css: `background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(squareMosaicSVG())}"); background-size: cover;`,
  },
  {
    id: 'rules', name: 'Vertical rule pattern',
    blurb: '1px ember rules every 64px on bone, with a 2px rule every fourth column. Section dividers, hero scaffolding.',
    svg: verticalRulePatternSVG(),
    css: `background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(verticalRulePatternSVG())}"); background-repeat: no-repeat;`,
  },
];

const PatternTile = ({ p }) => (
  <article className="bk-card">
    <div style={{
      background: `url("data:image/svg+xml;utf8,${encodeURIComponent(p.svg)}") repeat`,
      backgroundSize: p.id === 'embers' ? '60px 60px' : 'cover',
      backgroundColor: PALETTE.bone,
      height: 280, borderBottom: `1px solid ${PALETTE.rule}`,
    }} />
    <footer style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, background: PALETTE.bone }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: TOKENS.type.display, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{p.name}</span>
        <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, color: PALETTE.fgMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{p.id}</span>
      </div>
      <p style={{ margin: 0, fontFamily: TOKENS.type.sans, fontSize: 13, lineHeight: 1.5, color: PALETTE.fgMuted }}>{p.blurb}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <CopyBtn label="copy css" getText={p.css} />
        <CopyBtn label="copy svg" getText={p.svg} />
        <CopyBtn label="download svg" filename={`versuz-pattern-${p.id}.svg`} mime="image/svg+xml" getBlob={() => new Blob([p.svg], { type: 'image/svg+xml' })} />
      </div>
    </footer>
  </article>
);

const PatternsSection = () => (
  <section className="bk-section">
    <SectionHead num="03" eyebrow="patterns" title="Three decorative tiles." sub="Coal-ember scatter, sparse mosaic, ember rules. All hand-placed, deterministic, square-cornered." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
      {PATTERNS.map(p => <PatternTile key={p.id} p={p} />)}
    </div>
  </section>
);

// =====================================================================
// 4. SOCIAL FORMATS
// =====================================================================
const SOCIAL_FORMATS = [
  { id: 'ig-square',   name: 'Instagram square',  w: 1080, h: 1080 },
  { id: 'ig-portrait', name: 'Instagram portrait', w: 1080, h: 1350 },
  { id: 'tiktok',      name: 'TikTok / Reels',     w: 1080, h: 1920 },
  { id: 'linkedin',    name: 'LinkedIn',           w: 1200, h: 627  },
  { id: 'twitter',     name: 'Twitter banner',     w: 1500, h: 500  },
  { id: 'og',          name: 'OG image',           w: 1200, h: 630  },
];

// Helper to embed the V+Z mark at a target height, top-left anchored at (x,y).
// mark is 186×128 native; scale = h/128 gives matching aspect.
const markGroup = (x, y, h) => {
  const sc = h / MARK_H;
  return `<g transform="translate(${x} ${y}) scale(${sc.toFixed(3)})"><path d="${MARK_Z_PATH}" fill="${PALETTE.ink}"/><path d="${MARK_V_PATH}" fill="${PALETTE.ember}"/></g>`;
};
const markWidth = (h) => Math.round(h * MARK_AR);

// SVG builders for each social format. Composed strings that work standalone.
const socialSVG = {
  'ig-square': (W = 1080, H = 1080) => {
    const mh = 220, mw = markWidth(mh);
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Instrument Serif, serif">
  <rect width="${W}" height="${H}" fill="${PALETTE.bone}"/>
  <rect x="${W-160}" y="0" width="160" height="160" fill="${PALETTE.ember}"/>
  ${markGroup((W - mw) / 2, H/2 - mh - 40, mh)}
  <text x="${W/2}" y="${H/2 + 180}" text-anchor="middle" font-size="120" fill="${PALETTE.ink}" letter-spacing="-2">ver<tspan font-style="italic">S</tspan>uz</text>
  <rect x="${W/2 + 220}" y="${H/2 + 130}" width="22" height="22" fill="${PALETTE.ember}"/>
  <text x="${W/2}" y="${H/2 + 290}" text-anchor="middle" font-style="italic" font-size="44" fill="${PALETTE.fgMuted}">skills go in. only one wins.</text>
  <text x="60" y="${H - 60}" font-family="IBM Plex Mono, monospace" font-size="22" fill="${PALETTE.fgMuted}" letter-spacing="3">VERSUZ.DEV</text>
</svg>`;
  },

  'ig-portrait': (W = 1080, H = 1350) => {
    const mh = 160;
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Instrument Serif, serif">
  <rect width="${W}" height="${H}" fill="${PALETTE.bone}"/>
  ${markGroup(80, 100, mh)}
  <text x="${80 + markWidth(mh) + 40}" y="220" font-size="100" fill="${PALETTE.ink}" letter-spacing="-2">ver<tspan font-style="italic">S</tspan>uz</text>
  <rect x="${80 + markWidth(mh) + 320}" y="180" width="20" height="20" fill="${PALETTE.ember}"/>
  <text x="80"  y="${H/2 - 20}"  font-style="italic" font-size="140" fill="${PALETTE.ink}" letter-spacing="-4">Skills go in.</text>
  <text x="80"  y="${H/2 + 140}" font-style="italic" font-size="140" fill="${PALETTE.ember}" letter-spacing="-4">Only one wins.</text>
  <line x1="80" y1="${H - 180}" x2="${W - 80}" y2="${H - 180}" stroke="${PALETTE.rule}" stroke-width="1"/>
  <text x="80" y="${H - 110}" font-family="IBM Plex Mono, monospace" font-size="28" fill="${PALETTE.ink}" letter-spacing="4">VERSUZ.DEV</text>
  <text x="${W - 80}" y="${H - 110}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="28" fill="${PALETTE.fgMuted}" letter-spacing="4">$ NPX VERSUZ</text>
</svg>`;
  },

  tiktok: (W = 1080, H = 1920) => {
    const mh = 380, mw = markWidth(mh);
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Instrument Serif, serif">
  <rect width="${W}" height="${H}" fill="${PALETTE.bone}"/>
  <rect x="80" y="80" width="${W - 160}" height="${H - 160 - 240}" fill="none" stroke="${PALETTE.rule}" stroke-width="1" stroke-dasharray="4 8"/>
  ${markGroup((W - mw) / 2, H/2 - mh - 60, mh)}
  <text x="${W/2}" y="${H/2 + 140}" text-anchor="middle" font-size="180" fill="${PALETTE.ink}" letter-spacing="-4">ver<tspan font-style="italic">S</tspan>uz</text>
  <rect x="${W/2 + 360}" y="${H/2 + 60}" width="36" height="36" fill="${PALETTE.ember}"/>
  <text x="${W/2}" y="${H/2 + 290}" text-anchor="middle" font-style="italic" font-size="56" fill="${PALETTE.fgMuted}">skills go in. only one wins.</text>
  <text x="${W/2}" y="${H - 280}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="26" fill="${PALETTE.fgMuted}" letter-spacing="4">↓ CAPTION SAFE AREA</text>
</svg>`;
  },

  linkedin: (W = 1200, H = 627) => {
    const mh = 240;
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Instrument Serif, serif">
  <rect width="${W}" height="${H}" fill="${PALETTE.bone}"/>
  <line x1="${W * 0.36}" y1="80" x2="${W * 0.36}" y2="${H - 80}" stroke="${PALETTE.rule}" stroke-width="1"/>
  ${markGroup(80, (H - mh) / 2, mh)}
  <text x="${W * 0.36 + 60}" y="${H/2 - 30}" font-style="italic" font-size="64" fill="${PALETTE.ink}" letter-spacing="-2">Public benchmark for</text>
  <text x="${W * 0.36 + 60}" y="${H/2 + 40}" font-style="italic" font-size="64" fill="${PALETTE.ember}" letter-spacing="-2">AI agent skills.</text>
  <text x="${W * 0.36 + 60}" y="${H/2 + 130}" font-family="IBM Plex Mono, monospace" font-size="20" fill="${PALETTE.fgMuted}" letter-spacing="3">100K+ RANKED · VERSUZ.DEV</text>
</svg>`;
  },

  twitter: (W = 1500, H = 500) => {
    const mh = 130, mw = markWidth(mh);
    // wordmark is roughly fs * 2.6 wide for 5 letters at fs=110
    const fs = 100;
    const wmW = fs * 2.4;
    const lockupW = mw + 28 + wmW + 28; // mark + gap + wordmark + dot
    const lx = (W - lockupW) / 2;
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Instrument Serif, serif">
  <rect width="${W}" height="${H}" fill="${PALETTE.bone}"/>
  <g opacity="0.5">
    ${(() => {
      let s = 0x4242a0; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
      let out = '';
      for (let y = 0; y < 21; y++) for (let x = 0; x < 63; x++) {
        const t = r(); let f = null;
        if (t < 0.10) f = PALETTE.ember; else if (t < 0.13) f = PALETTE.azure; else if (t < 0.16) f = PALETTE.sage;
        if (f) out += `<rect x="${x*24}" y="${y*24}" width="24" height="24" fill="${f}" opacity="0.55"/>`;
      }
      return out;
    })()}
  </g>
  <rect x="${lx - 30}" y="${H/2 - mh/2 - 20}" width="${lockupW + 60}" height="${mh + 40}" fill="${PALETTE.bone}"/>
  ${markGroup(lx, (H - mh) / 2, mh)}
  <text x="${lx + mw + 28}" y="${H/2 + fs * 0.32}" font-size="${fs}" fill="${PALETTE.ink}" letter-spacing="-3">ver<tspan font-style="italic">S</tspan>uz</text>
  <rect x="${lx + mw + 28 + wmW}" y="${H/2 + fs * 0.10}" width="20" height="20" fill="${PALETTE.ember}"/>
</svg>`;
  },

  og: (W = 1200, H = 630) => {
    const mh = 110;
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Instrument Serif, serif">
  <rect width="${W}" height="${H}" fill="${PALETTE.bone}"/>
  ${markGroup(60, 60, mh)}
  <text x="${60 + markWidth(mh) + 32}" y="${60 + mh * 0.78}" font-size="80" fill="${PALETTE.ink}" letter-spacing="-2">ver<tspan font-style="italic">S</tspan>uz</text>
  <rect x="${60 + markWidth(mh) + 32 + 220}" y="${60 + mh * 0.55}" width="18" height="18" fill="${PALETTE.ember}"/>
  <text x="60" y="${H/2 + 20}" font-style="italic" font-size="116" fill="${PALETTE.ink}" letter-spacing="-3">Skills go in.</text>
  <text x="60" y="${H/2 + 140}" font-style="italic" font-size="116" fill="${PALETTE.ember}" letter-spacing="-3">Only one wins.</text>
  <text x="${W - 60}" y="${H - 60}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="22" fill="${PALETTE.fgMuted}" letter-spacing="3">VERSUZ.DEV</text>
</svg>`;
  },
};

const SocialTile = ({ f }) => {
  const svg = socialSVG[f.id](f.w, f.h);
  const aspect = f.w / f.h;
  return (
    <article className="bk-card">
      <div style={{
        background: PALETTE.bone,
        borderBottom: `1px solid ${PALETTE.rule}`,
        padding: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: aspect > 1 ? '100%' : `${aspect * 360}px`,
          aspectRatio: `${f.w} / ${f.h}`,
          maxHeight: 360,
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
          backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          border: `1px solid ${PALETTE.rule}`,
        }} />
      </div>
      <footer style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, background: PALETTE.bone }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: TOKENS.type.display, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{f.name}</span>
          <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, color: PALETTE.fgMuted, letterSpacing: '0.12em' }}>{f.w}×{f.h}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CopyBtn label="download svg" filename={`versuz-${f.id}.svg`} mime="image/svg+xml" getBlob={() => new Blob([svg], { type: 'image/svg+xml' })} />
          <CopyBtn label="download png @2x" filename={`versuz-${f.id}@2x.png`} mime="image/png" getBlob={() => svgToPng(svg, 2, f.w, f.h)} />
        </div>
      </footer>
    </article>
  );
};

const SocialSection = () => (
  <section className="bk-section">
    <SectionHead num="04" eyebrow="social formats" title="Six ready-to-post canvases." sub="Each rendered as standalone SVG, downloadable as 2× PNG. Inter and Instrument Serif will fall back to system fonts unless installed locally." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
      {SOCIAL_FORMATS.map(f => <SocialTile key={f.id} f={f} />)}
    </div>
  </section>
);

// =====================================================================
// 5. UI MICRO-INTERACTIONS
// =====================================================================
const MICRO_CSS = {
  button: `.vz-btn-demo {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border: 1px solid ${PALETTE.ink}; background: ${PALETTE.bone}; color: ${PALETTE.ink};
  font: 500 14px/1 'Inter', sans-serif; cursor: pointer;
  transition: background-color .15s ease, color .15s ease;
}
.vz-btn-demo:hover { background: ${PALETTE.ember}; border-color: ${PALETTE.ember}; color: ${PALETTE.bone}; }
.vz-btn-demo:active { box-shadow: inset 0 -2px 0 rgba(0,0,0,0.18); }`,

  link: `.vz-link-demo {
  display: inline; color: ${PALETTE.ink}; font: 400 16px/1.5 'Inter', sans-serif;
  border-bottom: 1px solid transparent; transition: border-color .18s ease;
}
.vz-link-demo:hover { border-bottom-color: ${PALETTE.ember}; }`,

  card: `.vz-card-demo {
  padding: 24px; background: ${PALETTE.bone};
  border: 1px solid ${PALETTE.rule};
  transition: border-color .18s ease;
}
.vz-card-demo:hover { border-color: ${PALETTE.ember}; }`,

  pill: `.vz-pill-demo {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; background: ${PALETTE.bone}; border: 1px solid ${PALETTE.rule};
  font: 500 12px/1 'IBM Plex Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase;
  color: ${PALETTE.ink}; cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease;
}
.vz-pill-demo:hover {
  background: color-mix(in oklab, ${PALETTE.ember} 8%, ${PALETTE.bone});
  border-color: color-mix(in oklab, ${PALETTE.ember} 30%, ${PALETTE.rule});
}`,
};

const MicroDemo = ({ name, kind, blurb }) => {
  const css = MICRO_CSS[kind];
  return (
    <div className="bk-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 200 }}>
      <div style={{ background: PALETTE.bone, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${PALETTE.rule}` }}>
        {kind === 'button' && <button className="vz-btn-demo">Submit skill ↗</button>}
        {kind === 'link' && <span>Read the <a href="#" className="vz-link-demo">methodology v04</a> for details.</span>}
        {kind === 'card' && (
          <div className="vz-card-demo" style={{ maxWidth: 220 }}>
            <span style={{ fontFamily: TOKENS.type.mono, fontSize: 10, letterSpacing: '0.16em', color: PALETTE.fgMuted, textTransform: 'uppercase' }}>Cycle #184</span>
            <p style={{ fontFamily: TOKENS.type.display, fontSize: 24, margin: '8px 0 0', letterSpacing: '-0.02em' }}>pdf-extract</p>
          </div>
        )}
        {kind === 'pill' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="vz-pill-demo">extract</span>
            <span className="vz-pill-demo">parse</span>
            <span className="vz-pill-demo">retrieve</span>
          </div>
        )}
      </div>
      <div style={{ padding: '20px 24px', background: PALETTE.bone, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontFamily: TOKENS.type.display, fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{name}</span>
        <p style={{ margin: 0, fontFamily: TOKENS.type.sans, fontSize: 13, lineHeight: 1.5, color: PALETTE.fgMuted }}>{blurb}</p>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          <CopyBtn label="copy css" getText={css} />
        </div>
      </div>
    </div>
  );
};

const MicroSection = () => {
  // inject the CSS once so the demos render.
  useEffect(() => {
    const id = 'vz-micro-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = Object.values(MICRO_CSS).join('\n\n');
    document.head.appendChild(style);
  }, []);
  return (
    <section className="bk-section">
      <SectionHead num="05" eyebrow="micro-interactions" title="No shadows. Just color & inset." sub="The whole product is built from four hover states and one click state. Each is < 200ms, all with `ease`." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        <MicroDemo name="Button hover" kind="button" blurb="Bone → ember swap on hover; inset 0 −2px 0 rgba(0,0,0,0.18) on press, no drop shadow." />
        <MicroDemo name="Link hover"   kind="link"   blurb="Underline appears on hover via border-bottom 1px ember. No color change — the underline is the affordance." />
        <MicroDemo name="Card hover"   kind="card"   blurb="Border rule → ember at 180ms. No lift, no shadow. Calm." />
        <MicroDemo name="Pill hover"   kind="pill"   blurb="Bone → color-mix(ember 8%, bone). Just enough warmth to register without competing." />
      </div>
    </section>
  );
};

// =====================================================================
// 6. EXPORT PANEL
// =====================================================================
const tokensAsCSSVars = () => {
  const c = PALETTE;
  return `:root {
  --vz-bone-cream: ${c.bone};
  --vz-ember:      ${c.ember};
  --vz-azure:      ${c.azure};
  --vz-sage:       ${c.sage};
  --vz-amber:      ${c.amber};
  --vz-crimson:    ${c.crimson};
  --vz-ink:        ${c.ink};
  --vz-fg-muted:   ${c.fgMuted};
  --vz-rule:       ${c.rule};

  --vz-font-display: 'Instrument Serif', serif;
  --vz-font-mono:    'IBM Plex Mono', monospace;
  --vz-font-sans:    'Inter', system-ui, sans-serif;
}`;
};

const tokensAsTailwind = () => `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bone-cream': '${PALETTE.bone}',
        ember:        '${PALETTE.ember}',
        azure:        '${PALETTE.azure}',
        sage:         '${PALETTE.sage}',
        amber:        '${PALETTE.amber}',
        crimson:      '${PALETTE.crimson}',
        ink:          '${PALETTE.ink}',
        'fg-muted':   '${PALETTE.fgMuted}',
        rule:         '${PALETTE.rule}',
      },
      fontFamily: {
        display: ['Instrument Serif', 'serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};`;

const tokensAsJSON = () => JSON.stringify({
  color: Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, { value: v, type: 'color' }])),
  typography: {
    display: { value: "'Instrument Serif', serif" },
    mono:    { value: "'IBM Plex Mono', monospace" },
    sans:    { value: "'Inter', system-ui, sans-serif" },
  },
}, null, 2);

// Build a ZIP with all SVGs + tokens — uses JSZip from CDN if available.
const buildAndDownloadZip = async (toast) => {
  if (!window.JSZip) {
    toast.push('JSZip not loaded — falling back to individual downloads');
    return;
  }
  const zip = new window.JSZip();
  // logo variants
  zip.file('logo/mark-duotone.svg', markAsSVG({}));
  zip.file('logo/mark-ink.svg',     markAsSVG({ mono: PALETTE.ink }));
  zip.file('logo/mark-bone.svg',    markAsSVG({ mono: PALETTE.bone }));
  zip.file('logo/wordmark.svg',      wordmarkAsSVG({}));
  zip.file('logo/wordmark-dark.svg', wordmarkAsSVG({ color: PALETTE.bone, bg: PALETTE.ink }));
  zip.file('logo/lockup-h.svg',      lockupAsSVG({}));
  // patterns
  zip.file('patterns/ember-dots.svg',     PATTERNS[0].svg);
  zip.file('patterns/square-mosaic.svg',  PATTERNS[1].svg);
  zip.file('patterns/vertical-rules.svg', PATTERNS[2].svg);
  // social
  for (const f of SOCIAL_FORMATS) zip.file(`social/${f.id}.svg`, socialSVG[f.id](f.w, f.h));
  // tokens
  zip.file('tokens/colors.css',           tokensAsCSSVars());
  zip.file('tokens/tailwind.config.js',   tokensAsTailwind());
  zip.file('tokens/tokens.json',          tokensAsJSON());
  zip.file('README.md', `# Versuz Brand Kit\n\nFlame mark, wordmark, patterns, social formats, and tokens.\nGenerated from the brand-kit artifact.\n`);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'versuz-brand-kit.zip', 'application/zip');
  toast.push('downloaded · versuz-brand-kit.zip');
};

const ExportPanel = () => {
  const toast = useToast();
  return (
    <section className="bk-section">
      <SectionHead num="06" eyebrow="export" title="Take everything home." sub="One zip for the full kit. Three flavors of tokens for whichever stack you're in." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
        <article className="bk-card" style={{ padding: 32, background: PALETTE.ink, color: PALETTE.bone }}>
          <span style={{ fontFamily: TOKENS.type.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: PALETTE.ember }}>Bundle</span>
          <h3 style={{ fontFamily: TOKENS.type.display, fontSize: 40, fontStyle: 'italic', margin: '12px 0 16px', letterSpacing: '-0.02em' }}>The full kit.</h3>
          <p style={{ fontFamily: TOKENS.type.sans, fontSize: 14, lineHeight: 1.5, color: 'rgba(250,248,243,0.6)', margin: '0 0 24px' }}>
            Logo variants · patterns · social formats · tokens — packed in one zip. Drop into Figma, hand to print, ship to socials.
          </p>
          <button className="bk-btn bk-btn-ember" onClick={() => buildAndDownloadZip(toast)}>
            <span style={{ fontFamily: TOKENS.type.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Download all SVGs as ZIP ↓</span>
          </button>
        </article>
        <article className="bk-card" style={{ padding: 32 }}>
          <span style={{ fontFamily: TOKENS.type.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: PALETTE.fgMuted }}>Tokens</span>
          <h3 style={{ fontFamily: TOKENS.type.display, fontSize: 40, fontStyle: 'italic', margin: '12px 0 16px', letterSpacing: '-0.02em' }}>Plug into your stack.</h3>
          <p style={{ fontFamily: TOKENS.type.sans, fontSize: 14, lineHeight: 1.5, color: PALETTE.fgMuted, margin: '0 0 24px' }}>
            Same nine colors, three syntaxes. Copy whichever matches your toolchain.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CopyBtn label="copy css variables"   getText={tokensAsCSSVars()} kind="ink" />
            <CopyBtn label="copy tailwind config" getText={tokensAsTailwind()} kind="ink" />
            <CopyBtn label="copy json tokens"     getText={tokensAsJSON()}     kind="ink" />
          </div>
        </article>
      </div>
    </section>
  );
};

// =====================================================================
// HEADER / HERO / FOOTER
// =====================================================================
const Header = () => (
  <header style={{
    position: 'sticky', top: 0, zIndex: 50, height: 64,
    background: `${PALETTE.bone}EE`, backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${PALETTE.rule}`,
  }}>
    <div style={{
      maxWidth: 1320, margin: '0 auto', height: '100%', padding: '0 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <VzLockup size={22} />
        <span style={{
          marginLeft: 8, fontFamily: TOKENS.type.mono, fontSize: 10,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: PALETTE.fgMuted,
          border: `1px solid ${PALETTE.rule}`, padding: '4px 10px',
        }}>Brand Kit · v01</span>
      </div>
      <nav style={{ display: 'flex', gap: 4, fontFamily: TOKENS.type.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: PALETTE.fgMuted }}>
        {[
          ['variants', '#variants'],
          ['motion',   '#motion'],
          ['patterns', '#patterns'],
          ['social',   '#social'],
          ['micro',    '#micro'],
          ['export',   '#export'],
        ].map(([n, h]) => (
          <a key={n} href={h} style={{ padding: '8px 12px', color: 'inherit', textDecoration: 'none' }}>{n}</a>
        ))}
      </nav>
    </div>
  </header>
);

const Hero = () => {
  // Trigger reveal animation once on first paint.
  const [revealKey, setRevealKey] = useState(0);
  const [glitchKey, setGlitchKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setGlitchKey(k => k + 1), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <section style={{
      padding: '120px 48px 100px', maxWidth: 1320, margin: '0 auto',
      borderBottom: `1px solid ${PALETTE.rule}`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="bk-eyebrow">§ 00</span>
          <span className="bk-eyebrow" style={{ color: PALETTE.fgMuted, textTransform: 'none', letterSpacing: '0.04em' }}>brand kit</span>
        </div>
        <div>
          <div key={revealKey} className="vz-reveal" style={{ display: 'inline-flex', marginBottom: 32 }}>
            <VzLockup size={64} />
          </div>
          <h1 style={{
            fontFamily: TOKENS.type.display, fontSize: 'clamp(72px, 9vw, 140px)', fontWeight: 400,
            letterSpacing: '-0.04em', lineHeight: 0.92, margin: 0, maxWidth: 1000,
          }}>
            Skills go in.{' '}
            <em style={{ color: PALETTE.ember }}>Only one wins.</em>
          </h1>
          <p style={{
            margin: '32px 0 40px', fontFamily: TOKENS.type.display,
            fontSize: 22, lineHeight: 1.5, color: PALETTE.fgMuted, maxWidth: 640,
          }}>
            The complete identity kit for Versuz — the public benchmark and marketplace for AI agent skills. Logos, motion, patterns, social posters, and tokens. Bone, ember, ink. No gradients, no shadows.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <button className="bk-btn bk-btn-ink" onClick={() => setRevealKey(k => k + 1)}>
              <span style={{ fontFamily: TOKENS.type.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Replay reveal ↻</span>
            </button>
            <a href="#export" className="bk-btn bk-btn-ember">
              <span style={{ fontFamily: TOKENS.type.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Download kit ↓</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer style={{
    borderTop: `1px solid ${PALETTE.rule}`,
    padding: '40px 48px', maxWidth: 1320, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
    fontFamily: TOKENS.type.mono, fontSize: 10, color: PALETTE.fgMuted,
    letterSpacing: '0.16em', textTransform: 'uppercase',
  }}>
    <span>© 2026 Versuz · brand kit v01</span>
    <span>versuz.dev · npx versuz</span>
  </footer>
);

// =====================================================================
// APP ROOT
// =====================================================================
const App = () => (
  <ToastHost>
    <Header />
    <Hero />
    <main style={{ maxWidth: 1320, margin: '0 auto', padding: '0 48px' }}>
      <div id="variants"><VariantsSection /></div>
      <div id="motion"><AnimationsSection /></div>
      <div id="patterns"><PatternsSection /></div>
      <div id="social"><SocialSection /></div>
      <div id="micro"><MicroSection /></div>
      <div id="export"><ExportPanel /></div>
    </main>
    <Footer />
  </ToastHost>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
