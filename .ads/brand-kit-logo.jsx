// =====================================================================
// Versuz Brand Kit — logo primitives (Mark, Wordmark, Lockups)
// =====================================================================
// Mark = the user-supplied logo: a Z-shaped ink stroke crossing a V-shaped
// ember stroke. Two distinct paths in a 186x128 viewBox.
//   - Z stroke (ink, left/bottom)
//   - V stroke (ember, right/top)
// =====================================================================

const PALETTE = {
  bone:    '#FAF8F3',
  ember:   '#C2410C',
  azure:   '#1E40AF',
  sage:    '#84A98C',
  amber:   '#D97706',
  crimson: '#B91C1C',
  ink:     '#0A0908',
  fgMuted: '#6B6B6B',
  rule:    '#E8E4DC',
};

// User-supplied logo paths — exposed so we can re-export as SVG strings too.
const MARK_V_PATH = "M116.27 81.3808L114.162 80.1639C113.795 79.9518 113.709 79.4483 113.964 79.1091C142.921 40.5254 132.734 35.9022 105.716 35.8245C105.326 35.8234 105 35.5075 105 35.1176V33.8699C105 33.485 105.317 33.171 105.702 33.1626C136.003 32.5034 150.073 24.2678 170.944 0.442974C171.166 0.189158 171.542 0.121685 171.834 0.2904L172.77 0.830622C173.14 1.04462 173.229 1.54624 172.968 1.88496C155.468 24.5426 152.601 34.1472 185.251 33.1998C185.65 33.1883 186 33.5072 186 33.9063V35.1668C186 35.5369 185.705 35.8447 185.336 35.8731C151.561 38.4695 137.874 51.4135 117.208 81.165C116.998 81.4667 116.588 81.5645 116.27 81.3808Z";
const MARK_Z_PATH = "M100.649 103.822C95.7007 110.758 86.5625 123.517 84.0523 126.844C83.767 127.222 83.2076 127.166 82.9569 126.764C38.8041 55.9798 24.1992 36.9077 0.711355 36.535C0.321556 36.5288 0 36.2133 0 35.8235V33.5294C0 33.1395 0.316031 32.8235 0.705879 32.8235H84.5294C84.9193 32.8235 85.2353 33.1395 85.2353 33.5294V34.8953C85.2353 35.2302 84.9836 35.5222 84.6559 35.5914C56.2782 41.5791 62.5187 50.9493 100.632 102.99C100.812 103.236 100.826 103.574 100.649 103.822Z";

const MARK_VIEWBOX = "0 0 186 128";
const MARK_W = 186, MARK_H = 128, MARK_AR = MARK_W / MARK_H;

// THE MARK — V + Z strokes. Color via props.
// `size` is the rendered HEIGHT in px (preserves aspect ratio).
const VzMark = ({ size = 64, color, vColor, zColor, vOpacity = 1, zOpacity = 1, className = '', style = {} }) => {
  // Default duotone: V ember, Z ink. If `color` provided, use as monochrome override.
  const v = vColor || color || PALETTE.ember;
  const z = zColor || color || PALETTE.ink;
  const h = size;
  const w = Math.round(size * MARK_AR);
  return (
    <svg
      width={w} height={h}
      viewBox={MARK_VIEWBOX}
      className={`vz-mark ${className}`}
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-label="Versuz mark"
    >
      {/* Z first (behind), then V on top — matches the visual stacking */}
      <path className="vz-stroke vz-stroke-z" d={MARK_Z_PATH} fill={z} opacity={zOpacity} style={{ transformOrigin: '50px 80px', transformBox: 'fill-box' }} />
      <path className="vz-stroke vz-stroke-v" d={MARK_V_PATH} fill={v} opacity={vOpacity} style={{ transformOrigin: '145px 40px', transformBox: 'fill-box' }} />
    </svg>
  );
};

// THE WORDMARK — "verSuz" in Instrument Serif; the 's' italic; trailing ember dot.
// size = cap height in px (the rendered font-size becomes ~size * 1.35 to match optical cap).
const VzWordmark = ({ size = 48, color = PALETTE.ink, dotColor = PALETTE.ember, showDot = true, className = '', style = {}, animate = false }) => {
  const dotSide = Math.max(4, Math.round(size * 0.18));
  return (
    <span
      className={`vz-wordmark ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: Math.max(2, size * 0.12),
        fontFamily: "'Instrument Serif', serif",
        fontWeight: 400,
        fontStyle: 'normal',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        fontSize: size * 1.35,
        color,
        ...style,
      }}
      aria-label="versuz"
    >
      <span className="vz-wm-letters" style={{ display: 'inline-flex' }}>
        <span data-ltr="v">v</span>
        <span data-ltr="e">e</span>
        <span data-ltr="r">r</span>
        <span data-ltr="S" style={{ fontStyle: 'italic' }}>S</span>
        <span data-ltr="u">u</span>
        <span data-ltr="z">z</span>
      </span>
      {showDot && (
        <span
          className="vz-wm-dot"
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: dotSide,
            height: dotSide,
            background: dotColor,
            marginBottom: Math.max(2, size * 0.08),
          }}
        />
      )}
    </span>
  );
};

// HORIZONTAL LOCKUP — mark + wordmark.
const VzLockup = ({ size = 48, color = PALETTE.ink, markColor = PALETTE.ember, dotColor = PALETTE.ember, className = '', style = {}, animate = false }) => (
  <span
    className={`vz-lockup vz-lockup-h ${animate ? 'vz-anim-hover-ember' : ''} ${className}`}
    style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.35, ...style }}
  >
    <VzMark size={size * 1.05} color={markColor} />
    <VzWordmark size={size} color={color} dotColor={dotColor} />
  </span>
);

// VERTICAL LOCKUP — mark above wordmark.
const VzLockupVertical = ({ size = 48, color = PALETTE.ink, markColor = PALETTE.ember, dotColor = PALETTE.ember, className = '', style = {} }) => (
  <span
    className={`vz-lockup vz-lockup-v ${className}`}
    style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.45, ...style }}
  >
    <VzMark size={size * 2} color={markColor} />
    <VzWordmark size={size} color={color} dotColor={dotColor} />
  </span>
);

// Build a standalone SVG string for export (no external CSS deps).
// For monochrome variants: pass `mono` and it overrides both V and Z.
const markAsSVG = ({ vColor = PALETTE.ember, zColor = PALETTE.ink, mono, bg, size = 200 }) => {
  const v = mono || vColor;
  const z = mono || zColor;
  const w = Math.round(size * MARK_AR);
  const bgRect = bg ? `<rect width="${w}" height="${size}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="${MARK_VIEWBOX}">${bgRect}<path d="${MARK_Z_PATH}" fill="${z}"/><path d="${MARK_V_PATH}" fill="${v}"/></svg>`;
};

const wordmarkAsSVG = ({ color = PALETTE.ink, dotColor = PALETTE.ember, bg, width = 600, height = 200 }) => {
  // Render the wordmark as <text> + a dot rect. Consumers must have Instrument Serif available.
  const bgRect = bg ? `<rect width="${width}" height="${height}" fill="${bg}"/>` : '';
  const fs = Math.round(height * 0.78);
  const baseY = Math.round(height * 0.78);
  const dot = Math.round(height * 0.13);
  const dotX = Math.round(width * 0.78);
  const dotY = baseY - dot;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Instrument Serif, serif">${bgRect}<text x="${Math.round(width*0.1)}" y="${baseY}" font-size="${fs}" font-weight="400" letter-spacing="-2" fill="${color}">ver<tspan font-style="italic">S</tspan>uz</text><rect x="${dotX}" y="${dotY}" width="${dot}" height="${dot}" fill="${dotColor}"/></svg>`;
};

const lockupAsSVG = ({ vColor = PALETTE.ember, zColor = PALETTE.ink, color = PALETTE.ink, dotColor = PALETTE.ember, bg, width = 700, height = 200 }) => {
  const bgRect = bg ? `<rect width="${width}" height="${height}" fill="${bg}"/>` : '';
  const markH = Math.round(height * 0.78);
  const markW = Math.round(markH * MARK_AR);
  const markY = Math.round((height - markH) / 2);
  const wmStart = markW + Math.round(height * 0.4);
  const fs = Math.round(height * 0.7);
  const baseY = Math.round(height * 0.75);
  const dot = Math.round(height * 0.12);
  const dotX = Math.round(width * 0.92);
  const dotY = baseY - dot;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Instrument Serif, serif">${bgRect}<g transform="translate(${Math.round(height*0.15)} ${markY}) scale(${markH/MARK_H})"><path d="${MARK_Z_PATH}" fill="${zColor}"/><path d="${MARK_V_PATH}" fill="${vColor}"/></g><text x="${wmStart}" y="${baseY}" font-size="${fs}" font-weight="400" letter-spacing="-2" fill="${color}">ver<tspan font-style="italic">S</tspan>uz</text><rect x="${dotX}" y="${dotY}" width="${dot}" height="${dot}" fill="${dotColor}"/></svg>`;
};

Object.assign(window, {
  PALETTE,
  MARK_V_PATH,
  MARK_Z_PATH,
  MARK_VIEWBOX,
  MARK_AR,
  VzMark,
  VzWordmark,
  VzLockup,
  VzLockupVertical,
  markAsSVG,
  wordmarkAsSVG,
  lockupAsSVG,
});
