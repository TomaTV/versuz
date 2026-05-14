// =====================================================================
// Versuz Motion — shared animation primitives + ad helpers
// Loads BEFORE versuz-ads.jsx and versuz-motion.jsx.
// Exposes: AnimMark, AnimWordmark, FinalLogoOverlay, AdTerminal,
//          TerminalLine, BenchBar, eyebrow styles, terminal palette.
// =====================================================================
const { useState: _useState, useEffect: _useEffect } = React;
const { Easing: _Easing, animate: _animate, clamp: _clamp, useTime: _useTime } = window;
const { PALETTE: _PALETTE, MARK_V_PATH: _MV, MARK_Z_PATH: _MZ, MARK_VIEWBOX: _MVB, MARK_AR: _MAR } = window;

// ---------- Mark ---------------------------------------------------------
const AnimMark = ({
  size = 200,
  vColor = _PALETTE.ember, zColor = _PALETTE.ink,
  vTransform = '', zTransform = '',
  vOpacity = 1, zOpacity = 1,
  className = '', style = {},
}) => {
  const w = size * _MAR;
  return (
    <svg width={w} height={size} viewBox={_MVB} className={className} style={{ display: 'block', overflow: 'visible', ...style }}>
      <g style={{ transform: zTransform, opacity: zOpacity, transformOrigin: '40px 80px', transformBox: 'fill-box' }}>
        <path d={_MZ} fill={zColor} />
      </g>
      <g style={{ transform: vTransform, opacity: vOpacity, transformOrigin: '145px 40px', transformBox: 'fill-box' }}>
        <path d={_MV} fill={vColor} />
      </g>
    </svg>
  );
};

// ---------- Wordmark ----------------------------------------------------
const AnimWordmark = ({
  size = 96, color = _PALETTE.ink, dotColor = _PALETTE.ember,
  letterStyles = [], dotStyle = {}, showDot = true,
  italicS = true, style = {},
}) => {
  const letters = ['v', 'e', 'r', 'S', 'u', 'z'];
  const dot = Math.max(4, Math.round(size * 0.16));
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'flex-end',
      fontFamily: "'Instrument Serif', serif", fontWeight: 400,
      letterSpacing: '-0.02em', lineHeight: 1, color,
      fontSize: size * 1.35, ...style,
    }}>
      {letters.map((ch, i) => (
        <span key={i} style={{
          display: 'inline-block',
          fontStyle: italicS && ch === 'S' ? 'italic' : 'normal',
          ...(letterStyles[i] || {}),
        }}>{ch}</span>
      ))}
      {showDot && (
        <span style={{
          display: 'inline-block',
          width: dot, height: dot, background: dotColor,
          marginLeft: size * 0.18, marginBottom: size * 0.08,
          ...dotStyle,
        }} />
      )}
    </span>
  );
};

// ---------- Terminal palette --------------------------------------------
const TERM_BG    = '#14110F';
const TERM_TEXT  = '#E8E2D4';
const TERM_DIM   = '#7A7268';
const TERM_GREEN = '#84A98C';
const TERM_AMBER = '#D97706';

// ---------- AdTerminal — chrome wrapper ---------------------------------
// Renders a terminal window with traffic lights and a centered title.
// `inset` is a CSS shorthand object (e.g. {top, right, bottom, left}).
// `density` controls font scale: 'compact' | 'normal' | 'large'.
const AdTerminal = ({
  inset = { top: 60, right: 60, bottom: 60, left: 60 },
  title = '~/skills/pdf-extract — versuz',
  opacity = 1,
  density = 'normal',
  bodyPadding,
  children,
}) => {
  const sizes = {
    compact: { dotSize: 10, titleFs: 13, titleH: 44, padX: 16, bodyP: '22px 28px' },
    normal:  { dotSize: 12, titleFs: 16, titleH: 56, padX: 20, bodyP: '28px 32px' },
    large:   { dotSize: 14, titleFs: 20, titleH: 64, padX: 24, bodyP: '32px 36px' },
  }[density];
  return (
    <div style={{
      position: 'absolute', ...inset,
      opacity,
      display: 'flex', flexDirection: 'column',
      background: TERM_BG, color: TERM_TEXT,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{
        height: sizes.titleH, padding: `0 ${sizes.padX}px`,
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
        flexShrink: 0, position: 'relative',
      }}>
        <span style={{ width: sizes.dotSize, height: sizes.dotSize, borderRadius: '50%', background: '#FF5F57' }} />
        <span style={{ width: sizes.dotSize, height: sizes.dotSize, borderRadius: '50%', background: '#FEBC2E' }} />
        <span style={{ width: sizes.dotSize, height: sizes.dotSize, borderRadius: '50%', background: '#28C840' }} />
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: sizes.titleFs, color: TERM_DIM, letterSpacing: '0.06em',
        }}>{title}</span>
      </div>
      <div style={{
        flex: 1, padding: bodyPadding || sizes.bodyP,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
};

// ---------- TerminalLine ---------------------------------------------------
// A single line with icon + text, fade-in at `at`.
const TerminalLine = ({ at, icon, text, color, t, fontSize = 22, iconSize = 20, marginTop = 10 }) => {
  const op = _animate({ from: 0, to: 1, start: at, end: at + 0.2 })(t);
  const ty = _animate({ from: 8, to: 0, start: at, end: at + 0.3, ease: _Easing.easeOutCubic })(t);
  return (
    <div style={{ marginTop, opacity: op, transform: `translateY(${ty}px)`, display: 'flex', gap: 14, alignItems: 'baseline' }}>
      <span style={{ color: color || TERM_GREEN, fontSize: iconSize, fontWeight: 500 }}>{icon}</span>
      <span style={{ color: color === _PALETTE.ember ? _PALETTE.ember : TERM_TEXT, fontSize, fontWeight: color === _PALETTE.ember ? 500 : 400 }}>{text}</span>
    </div>
  );
};

// ---------- BenchBar ------------------------------------------------------
// A single bench suite progress bar with live score + delta.
const BenchBar = ({ bar, t, fontSize = 19 }) => {
  const op = _animate({ from: 0, to: 1, start: bar.start - 0.2, end: bar.start + 0.1 })(t);
  const p = _clamp((t - bar.start) / bar.dur, 0, 1);
  const done = t >= bar.start + bar.dur;
  const displayScore = (bar.score * p).toFixed(1);
  const delta = (bar.score - bar.baseline).toFixed(1);
  return (
    <div style={{ opacity: op }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize, color: done ? TERM_TEXT : TERM_DIM, marginBottom: 6 }}>
        <span>{bar.name}</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ color: TERM_DIM, fontSize: fontSize - 4 }}>{Math.round(p * 100)}%</span>
          <span style={{ color: done ? _PALETTE.ember : TERM_DIM, fontSize: fontSize + 3, fontWeight: 500, minWidth: 80, textAlign: 'right' }}>{displayScore}</span>
          <span style={{ color: done ? TERM_GREEN : 'transparent', fontSize: fontSize - 4, minWidth: 50, textAlign: 'right' }}>+{delta}</span>
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: done ? _PALETTE.ember : TERM_AMBER }} />
      </div>
    </div>
  );
};

// ---------- FinalLogoOverlay ---------------------------------------------
// Standard logo + wordmark + tagline + URL reveal.
// All times relative to `start` (the absolute t where reveal begins).
const FinalLogoOverlay = ({
  start,
  t, // current useTime() value, passed in by parent
  markSize = 300,
  wmSize = 110,
  tagSize = 56,
  urlBottom = 120,
  urlText = 'versuz.dev · $ npx versuz',
  taglineBefore = 'skills go in.',
  taglineAfter = 'only one wins.',
  taglineMultiline = false,
  layout = 'vertical', // 'vertical' | 'horizontal'
  gap = 36,
}) => {
  const logoOp = _animate({ from: 0, to: 1, start: start + 0.3, end: start + 1.0 })(t);
  const lt = t - start - 0.3;
  const zE = _animate({ from: 0,   to: 1, start: 0,   end: 0.45, ease: _Easing.easeOutCubic })(lt);
  const vE = _animate({ from: 0,   to: 1, start: 0.2, end: 0.65, ease: _Easing.easeOutCubic })(lt);
  const zY = _animate({ from: 30,  to: 0, start: 0,   end: 0.45, ease: _Easing.easeOutCubic })(lt);
  const vY = _animate({ from: -30, to: 0, start: 0.2, end: 0.65, ease: _Easing.easeOutCubic })(lt);
  const wmOp = _animate({ from: 0,  to: 1, start: 0.7, end: 1.1 })(lt);
  const wmY  = _animate({ from: 16, to: 0, start: 0.7, end: 1.1, ease: _Easing.easeOutCubic })(lt);
  const tagOp = _animate({ from: 0, to: 1, start: 1.2, end: 1.6 })(lt);
  const urlOp = _animate({ from: 0, to: 1, start: 1.8, end: 2.2 })(lt);

  if (layout === 'horizontal') {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: _PALETTE.bone,
        opacity: logoOp,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 48, pointerEvents: 'none',
      }}>
        <AnimMark
          size={markSize}
          zOpacity={zE} vOpacity={vE}
          zTransform={`scale(${0.85 + zE * 0.15})`}
          vTransform={`scale(${0.85 + vE * 0.15})`}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: wmOp }}>
          <AnimWordmark size={wmSize} />
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: tagSize, color: _PALETTE.fgMuted, letterSpacing: '-0.02em', opacity: tagOp }}>
            {taglineBefore} <span style={{ color: _PALETTE.ember }}>{taglineAfter}</span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, letterSpacing: '0.25em', color: _PALETTE.ink, textTransform: 'uppercase', opacity: urlOp, marginTop: 8 }}>
            {urlText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: _PALETTE.bone,
      opacity: logoOp,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap, pointerEvents: 'none',
    }}>
      <AnimMark
        size={markSize}
        zOpacity={zE} vOpacity={vE}
        zTransform={`translateY(${zY}px) scale(${0.85 + zE * 0.15})`}
        vTransform={`translateY(${vY}px) scale(${0.85 + vE * 0.15})`}
      />
      <div style={{ opacity: wmOp, transform: `translateY(${wmY}px)` }}>
        <AnimWordmark size={wmSize} />
      </div>
      <span style={{
        fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
        fontSize: tagSize, color: _PALETTE.fgMuted, letterSpacing: '-0.02em',
        opacity: tagOp, marginTop: 16, textAlign: 'center',
      }}>
        {taglineMultiline ? (
          <>{taglineBefore}<br/><span style={{ color: _PALETTE.ember }}>{taglineAfter}</span></>
        ) : (
          <>{taglineBefore} <span style={{ color: _PALETTE.ember }}>{taglineAfter}</span></>
        )}
      </span>
      <div style={{
        position: 'absolute', bottom: urlBottom,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 22,
        letterSpacing: '0.25em', color: _PALETTE.ink, textTransform: 'uppercase',
        opacity: urlOp,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <span>{urlText.split('·')[0].trim()}</span>
        <span style={{ width: 6, height: 6, background: _PALETTE.ember }} />
        <span style={{ color: _PALETTE.fgMuted }}>{(urlText.split('·')[1] || '').trim()}</span>
      </div>
    </div>
  );
};

Object.assign(window, {
  AnimMark, AnimWordmark,
  AdTerminal, TerminalLine, BenchBar,
  FinalLogoOverlay,
  TERM_BG, TERM_TEXT, TERM_DIM, TERM_GREEN, TERM_AMBER,
});
