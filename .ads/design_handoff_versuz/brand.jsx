// Versuz logo + brand marks

// Brand palette — ember primary + 4 semantic secondaries
const BRAND_PALETTE = {
  ink: '#14120E',
  bone: '#F2EEE6',
  paper: '#ECE7DD',
  ember: '#C2410C',     // primary accent
  sage: '#3F7D4F',      // green — leader / win
  crimson: '#B23A3A',   // red — loss / negative delta
  azure: '#2A5FA8',     // blue — judges / verification
  amber: '#D69E2E',     // yellow — featured / hot
  slate: '#6B6557',
};

// THE MARK — two opposing chevrons that read as "V" stacked on inverted "V" (= "vs").
// Pure geometry: 4 strokes, ember accent stroke marks the meeting point.
// Square footprint, monoline weight, scales from 16px favicon to billboard.
const VersuzMark = ({ size = 32, accentColor = '#C2410C' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block', flexShrink: 0 }} aria-label="Versuz">
      {/* Top chevron (V) — opens upward */}
      <path d="M 8 14 L 16 14 L 32 36 L 48 14 L 56 14 L 36 42 L 28 42 Z" fill="#14120E" />
      {/* Bottom chevron (Λ) in ember — opens downward, mirrored */}
      <path d="M 8 50 L 16 50 L 32 28 L 48 50 L 56 50 L 36 22 L 28 22 Z" fill={accentColor} />
    </svg>
  );
};

// Per-skill mini glyph — 2-color geometric mark from skill id hash
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const SkillGlyph = ({ id = '', size = 20 }) => {
  const h = hash(id);
  const variant = h % 6;
  const accent = (h >> 4) % 2 === 0;
  // pick one of the 4 secondary colors deterministically for variety
  const tints = ['#3F7D4F', '#B23A3A', '#2A5FA8', '#D69E2E', '#C2410C'];
  const acc = tints[(h >> 7) % tints.length];
  const fg = '#14120E';
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="0" y="0" width="20" height="20" fill="#F2EEE6" />
      {variant === 0 && <circle cx="10" cy="10" r="6" fill={fg} />}
      {variant === 1 && <rect x="4" y="4" width="12" height="12" fill={fg} />}
      {variant === 2 && <path d="M 10 3 L 17 17 L 3 17 Z" fill={fg} />}
      {variant === 3 && <path d="M 3 4 L 17 4 L 10 17 Z" fill={fg} />}
      {variant === 4 && <path d="M 10 3 A 7 7 0 0 1 10 17 Z" fill={fg} />}
      {variant === 5 && (<>
        <rect x="3" y="3" width="14" height="14" fill={fg} />
        <rect x="3" y="9" width="14" height="2" fill="#F2EEE6" />
      </>)}
      {accent && <rect x="0" y="17" width="20" height="3" fill={acc} />}
    </svg>
  );
};

// Wordmark — Versuz in display caps; small sizes drop the accent dot for legibility
const VersuzWordmark = ({ size = 22, color = 'currentColor', accentColor = 'var(--accent)' }) => {
  const small = size < 28;
  return (
    <span
      aria-label="Versuz"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-display)',
        fontSize: size * 1.15,
        fontWeight: 400,
        letterSpacing: '-0.025em',
        lineHeight: 1,
        color,
      }}
    >
      Versu<em style={{
        fontStyle: small ? 'normal' : 'italic',
        color: small ? color : accentColor,
      }}>z</em>
      {!small && (
        <span style={{
          width: size * 0.16, height: size * 0.16,
          background: accentColor, marginLeft: size * 0.1,
          alignSelf: 'flex-end', marginBottom: size * 0.05,
        }} />
      )}
    </span>
  );
};

// Decorative oversized stencil character (used as background element)
const StencilGlyph = ({ char = 'Z', size = 600, opacity = 0.04 }) => (
  <div aria-hidden style={{
    fontFamily: 'var(--font-display)',
    fontSize: size,
    fontWeight: 400,
    fontStyle: 'italic',
    color: 'var(--accent)',
    opacity,
    lineHeight: 0.8,
    letterSpacing: '-0.06em',
    pointerEvents: 'none',
    userSelect: 'none',
  }}>{char}</div>
);

// A bracket frame — corner ticks that bracket content (editorial framing device)
const Bracket = ({ children, padding = 24, color = 'var(--border-strong)' }) => (
  <div style={{ position: 'relative', padding }}>
    {[
      { top: 0, left: 0, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
      { top: 0, right: 0, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
      { bottom: 0, left: 0, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
      { bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
    ].map((style, i) => (
      <span key={i} aria-hidden style={{
        position: 'absolute', width: 18, height: 18, ...style,
      }} />
    ))}
    {children}
  </div>
);

// Eyebrow label — small mono text with a leading rule
const Eyebrow = ({ children, color = 'var(--accent)' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 12,
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500,
  }}>
    <span style={{ width: 24, height: 1, background: color, opacity: 0.5 }} />
    {children}
  </span>
);

// Section number — large editorial figure
const FigureNumber = ({ n, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1 }}>
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase',
    }}>§ {n}</span>
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--fg-muted)', letterSpacing: '0.04em',
    }}>{label}</span>
  </div>
);

Object.assign(window, { VersuzMark, VersuzWordmark, StencilGlyph, Bracket, Eyebrow, FigureNumber, SkillGlyph, BRAND_PALETTE });
