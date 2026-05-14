// Versuz logo primitives — animated mark + wordmark
// Uses the user's actual logo SVG paths (the bone V + ember starburst)

const EMBER_PATH = "M116.27 81.3808L114.162 80.1639C113.795 79.9518 113.709 79.4483 113.964 79.1091C142.921 40.5254 132.734 35.9022 105.716 35.8245C105.326 35.8234 105 35.5075 105 35.1176V33.8699C105 33.485 105.317 33.171 105.702 33.1626C136.003 32.5034 150.073 24.2678 170.944 0.442974C171.166 0.189158 171.542 0.121685 171.834 0.2904L172.77 0.830622C173.14 1.04462 173.229 1.54624 172.968 1.88496C155.468 24.5426 152.601 34.1472 185.251 33.1998C185.65 33.1883 186 33.5072 186 33.9063V35.1668C186 35.5369 185.705 35.8447 185.336 35.8731C151.561 38.4695 137.874 51.4135 117.208 81.165C116.998 81.4667 116.588 81.5645 116.27 81.3808Z";

const V_PATH = "M100.649 103.822C95.7007 110.758 86.5625 123.517 84.0523 126.844C83.767 127.222 83.2076 127.166 82.9569 126.764C38.8041 55.9798 24.1992 36.9077 0.711355 36.535C0.321556 36.5288 0 36.2133 0 35.8235V33.5294C0 33.1395 0.316031 32.8235 0.705879 32.8235H84.5294C84.9193 32.8235 85.2353 33.1395 85.2353 33.5294V34.8953C85.2353 35.2302 84.9836 35.5222 84.6559 35.5914C56.2782 41.5791 62.5187 50.9493 100.632 102.99C100.812 103.236 100.826 103.574 100.649 103.822Z";

// Versuz mark — props let you control assembly animation
//   progress = 0..1 reveals the logo (0 = nothing, 1 = full)
//   variant: 'light' (ink V on bone) | 'dark' (bone V on ink)
function VersuzMark({
  size = 200,
  progress = 1,
  variant = 'light',
  ember = '#C2410C',
}) {
  const inkColor = variant === 'dark' ? '#EFEBE6' : '#151411';
  const aspect = 186 / 128;

  // Star: scale in with rotation overshoot
  const starProgress = clamp((progress - 0.0) / 0.5, 0, 1);
  const starEase = Easing.easeOutBack(starProgress);
  const starScale = starEase;
  const starRot = (1 - starProgress) * -60;

  // V: rise from below + scale up
  const vProgress = clamp((progress - 0.35) / 0.65, 0, 1);
  const vEase = Easing.easeOutCubic(vProgress);
  const vScale = 0.7 + 0.3 * vEase;
  const vY = (1 - vEase) * 30;

  return (
    <svg
      width={size}
      height={size / aspect}
      viewBox="0 0 186 128"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Versuz"
    >
      {/* V chevron */}
      <g
        style={{
          transform: `translateY(${vY}px) scale(${vScale})`,
          transformOrigin: '42px 80px',
          opacity: vEase,
        }}
      >
        <path d={V_PATH} fill={inkColor} />
      </g>
      {/* Ember starburst */}
      <g
        style={{
          transform: `rotate(${starRot}deg) scale(${starScale})`,
          transformOrigin: '145px 41px',
          opacity: starProgress,
        }}
      >
        <path d={EMBER_PATH} fill={ember} />
      </g>
    </svg>
  );
}

// Just the ember star (for accent/burst moments)
function EmberStar({ size = 80, progress = 1, color = '#C2410C', spin = 0 }) {
  const p = clamp(progress, 0, 1);
  const ease = Easing.easeOutBack(p);
  return (
    <svg
      width={size}
      height={size * (88 / 186)}
      viewBox="105 0 81 88"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g
        style={{
          transform: `rotate(${spin}deg) scale(${ease})`,
          transformOrigin: '145px 41px',
          opacity: p,
        }}
      >
        <path d={EMBER_PATH} fill={color} />
      </g>
    </svg>
  );
}

// Wordmark — uses Instrument Serif italic to evoke the typo SVG.
// For high-fidelity moments, use the actual typo SVG inline instead.
function VersuzWordmark({ size = 48, color = '#151411', accent = '#C2410C', progress = 1 }) {
  const letters = 'Versuz'.split('');
  const total = letters.length;
  return (
    <span
      aria-label="Versuz"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'Instrument Serif, serif',
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.04em',
        color,
      }}
    >
      {letters.map((ch, i) => {
        const localStart = i / total;
        const localEnd = localStart + 1 / total;
        const lp = clamp((progress - localStart) / (localEnd - localStart), 0, 1);
        const lpEase = Easing.easeOutCubic(lp);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: lpEase,
              transform: `translateY(${(1 - lpEase) * 12}px)`,
              color: ch === 'z' ? accent : color,
              willChange: 'transform, opacity',
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

// Inline the typo SVG for high-fidelity wordmark moments.
// Variant 'dark' uses the black version, 'light' uses white-on-ink.
function VersuzWordmarkSVG({ height = 80, variant = 'dark', progress = 1 }) {
  // Clip from left to reveal
  const clipPct = progress * 100;
  const fill = variant === 'light' ? '#EFEBE6' : '#151411';
  const ember = '#C2410C';
  return (
    <div
      style={{
        height,
        width: height * (529 / 133),
        position: 'relative',
        opacity: progress > 0 ? 1 : 0,
        clipPath: `inset(0 ${100 - clipPct}% 0 0)`,
        transition: 'none',
      }}
    >
      {/* We reproduce the wordmark from typo SVG; for simplicity, use img */}
      <img
        src={variant === 'light' ? 'assets/versuz-wordmark-white.svg' : 'assets/versuz-wordmark-black.svg'}
        style={{
          height: '100%',
          width: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
        alt="Versuz"
      />
    </div>
  );
}

Object.assign(window, {
  VersuzMark,
  EmberStar,
  VersuzWordmark,
  VersuzWordmarkSVG,
  EMBER_PATH,
  V_PATH,
});
