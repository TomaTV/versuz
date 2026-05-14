// Versuz ad scenes — batch 3 : Versus (vertical + LinkedIn),
// Climb LinkedIn, Judges (vertical + LinkedIn).

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

// ─── Cinematic motion helpers ───────────────────────────────────────────────
// Subtle continuous oscillation. Used to keep elements "alive" after they've
// settled — a real video has micro-motion everywhere, frozen pixels read as
// AfterEffects placeholder.
const breathe = (time, period = 4, amp = 1) =>
  Math.sin((time / period) * Math.PI * 2) * amp;

// Entry overshoot, gentler than Easing.easeOutBack (~7% vs ~10%). Visually
// reads as "land with a tiny settle" — not a cartoon bounce.
const easeOutSoftBack = (p) => {
  const c = 1.3, c3 = c + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

// Smoother counter ramp than easeOutCubic. Quart decelerates slower at the
// end → numbers feel like they "settle" into their final value.
const counterEase = (p) => Easing.easeOutQuart(p);

// Counter wrapper that reserves the FINAL value's width via a hidden ghost
// element. Without this, "0 → 18,400" widens the text on each tick and any
// adjacent element in a flex/grid layout shifts horizontally — visible as
// the "things decale when stuff appears" bug. Both inner spans inherit the
// parent's font, so the ghost defines the layout box exactly.
function StableNum({ value, finalValue, align = 'left' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ visibility: 'hidden' }}>{finalValue}</span>
      <span style={{
        position: 'absolute',
        left: align === 'right' ? 'auto' : 0,
        right: align === 'right' ? 0 : 'auto',
        top: 0,
      }}>{value}</span>
    </span>
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function PatternDots({ color = 'rgba(20,18,14,0.05)', size = 28 }) {
  const time = useTime();
  // Slow diagonal drift — wraps at the pattern size, so it's seamless.
  const offset = ((time * 6) % size + size) % size;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${offset}px ${offset}px`,
        pointerEvents: 'none',
      }}
    />
  );
}

function FinalLogoOverlay({ visibleAfter = 0, accent = EMBER, dark = false }) {
  const time = useTime();
  // Fade 0.2s. Scene call sites use visibleAfter = duration - 0.5. The
  // export script freezes RAF at t = duration - 0.15, so the overlay needs
  // to reach 100% opacity well before that : at duration - 0.3 (= visibleAfter + 0.2)
  // local = 1.0 already. With a 0.2s fade and 0.15s freeze margin, we land
  // crisply opaque every time.
  const local = clamp((time - visibleAfter) / 0.2, 0, 1);
  if (local <= 0) return null;
  const fadeE = Easing.easeInOutSine(local);
  const scaleE = easeOutSoftBack(local);
  // Entry scale only — no continuous breathe scale. At rest scale = 1.0
  // exactly so Chromium can rasterize the SVG mark crisply.
  const bg = dark ? INK_DEEP : BONE;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        background: bg,
        opacity: fadeE,
      }}
    >
      <div
        style={{
          transform: `scale(${0.92 + 0.08 * scaleE})`,
          transformOrigin: 'center',
        }}
      >
        <VersuzMark size={140} variant={dark ? 'dark' : 'light'} />
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(246,244,239,0.7)' : INK2,
          opacity: Easing.easeInOutSine(clamp((local - 0.3) / 0.7, 0, 1)),
          transform: `translateY(${(1 - scaleE) * 6}px)`,
        }}
      >
        versuz<span style={{ color: accent, marginLeft: 6 }}>.</span>dev
      </div>
    </div>
  );
}

// ─── SceneVersusVertical (1080×1920, 7s) ────────────────────────────────────
// Two skills face off. Stars on the left = popular, score on the right = quality.
// Tagline : "Stars don't prove quality."

function SceneVersusVertical() {
  const time = useTime();

  const SKILL_A = { name: 'pdf-glow', author: 'starhouse', stars: 18400, score: 41, color: AZURE };
  const SKILL_B = { name: 'pdf-extract', author: 'tomas', stars: 247, score: 88, color: EMBER };

  // Phase progress
  const showHeader = clamp((time - 0.15) / 0.4, 0, 1);
  const showA = clamp((time - 0.45) / 0.5, 0, 1);
  const showB = clamp((time - 0.95) / 0.5, 0, 1);
  const showStars = clamp((time - 1.5) / 0.7, 0, 1);
  const showScores = clamp((time - 3.2) / 0.7, 0, 1);
  const verdict = clamp((time - 4.6) / 0.5, 0, 1);
  const taglineP = clamp((time - 5.4) / 0.6, 0, 1);

  // Stars + score counters — easeOutQuart settles softer than cubic.
  const starsA = Math.round(SKILL_A.stars * counterEase(showStars));
  const starsB = Math.round(SKILL_B.stars * counterEase(showStars));
  const scoreA = Math.round(SKILL_A.score * counterEase(showScores));
  const scoreB = Math.round(SKILL_B.score * counterEase(showScores));

  // No continuous scale-breathe on the "vs" text — that would keep it on a
  // fractional-scale compositing layer (Chromium uses bilinear filtering
  // on those → blurry text). Entry scale 0.7→1.0 only, ends at exact 1.0
  // so the renderer can rasterize crisply at rest.
  const headerSettled = Math.pow(clamp(showHeader, 0, 1), 6);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={32} />

      {/* Top header */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(showHeader),
          transform: `translateY(${(1 - easeOutSoftBack(showHeader)) * 10}px)`,
        }}
      >
        skill <span style={{ color: EMBER }}>vs</span> skill
      </div>

      {/* Skill A — top half */}
      <SkillPanel
        skill={SKILL_A}
        starsDisplay={starsA}
        scoreDisplay={scoreA}
        showCard={showA}
        showStars={showStars}
        showScore={showScores}
        top={220}
        height={680}
        loser={verdict > 0.3}
        time={time}
        breathePhase={0}
      />

      {/* VS divider — scales in with overshoot, then breathes. */}
      <div
        style={{
          position: 'absolute',
          top: 920,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Instrument Serif, serif',
          fontStyle: 'italic',
          fontSize: 120,
          letterSpacing: '-0.05em',
          color: EMBER,
          opacity: Easing.easeInOutSine(showHeader),
          lineHeight: 1,
          transform: `scale(${0.7 + 0.3 * easeOutSoftBack(showHeader)})`,
          transformOrigin: 'center',
        }}
      >
        vs
      </div>

      {/* Skill B — bottom half */}
      <SkillPanel
        skill={SKILL_B}
        starsDisplay={starsB}
        scoreDisplay={scoreB}
        showCard={showB}
        showStars={showStars}
        showScore={showScores}
        top={1080}
        height={680}
        winner={verdict > 0.3}
        time={time}
        breathePhase={Math.PI}
      />

      {/* Tagline at the bottom — rises with overshoot, then breathes
          (breathe gated by taglineP^6 so it stays still during the rise). */}
      <Sprite start={5.4} end={7}>
        {() => {
          const settled = Math.pow(clamp(taglineP, 0, 1), 6);
          return (
            <div
              style={{
                position: 'absolute',
                left: 60,
                right: 60,
                bottom: 80,
                fontFamily: 'Instrument Serif, serif',
                fontSize: 64,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                color: INK,
                opacity: Easing.easeInOutSine(taglineP),
                transform: `translateY(${(1 - easeOutSoftBack(taglineP)) * 22 + Math.round(breathe(time, 4.0, 1.5) * settled)}px)`,
              }}
            >
              Stars don&apos;t prove{' '}
              <em style={{ color: EMBER }}>quality.</em>
            </div>
          );
        }}
      </Sprite>

      <FinalLogoOverlay visibleAfter={6.5} />
    </div>
  );
}

function SkillPanel({ skill, starsDisplay, scoreDisplay, showCard, showStars, showScore, top, height, winner, loser, time = 0, breathePhase = 0, finalStars, finalScore }) {
  const dim = loser ? 0.4 : 1;
  // Entry rises with subtle overshoot. After full settle (gated by ^6),
  // a slow vertical breathe keeps the card from feeling pasted onto the
  // canvas. No continuous scale-breathe — that would keep card text on a
  // fractional-scale compositing layer (= bilinear-filtered blur).
  const entryE = easeOutSoftBack(showCard);
  const settled = Math.pow(clamp(showCard, 0, 1), 6);
  // Integer-px breathe — fractional translateY puts the text layer on a
  // subpixel position which Chromium renders with bilinear filtering on
  // some setups → text blur. Snapping to whole pixels keeps text sharp
  // while still giving the card a subtle "alive" motion.
  const bs = Math.round(Math.sin((time / 4.2) * Math.PI * 2 + breathePhase) * 1.2 * settled);
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top,
        height,
        background: PAPER,
        border: `2px solid ${winner ? EMBER : 'transparent'}`,
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        opacity: Easing.easeInOutSine(showCard) * dim,
        transform: `translateY(${(1 - entryE) * 36 + bs}px)`,
        transition: 'border 0.4s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 18,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: skill.color,
        }}
      >
        <span style={{ width: 14, height: 14, background: skill.color }} />
        {skill.author}
      </div>
      <div
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 96,
          letterSpacing: '-0.035em',
          lineHeight: 1,
          color: INK,
        }}
      >
        {skill.name}
      </div>

      <div style={{ display: 'flex', gap: 56, marginTop: 12 }}>
        <Metric
          label="github stars"
          value={`★ ${starsDisplay.toLocaleString('en-US')}`}
          finalValue={`★ ${(finalStars ?? skill.stars).toLocaleString('en-US')}`}
          accent={INK2}
          opacity={showStars}
        />
        <Metric
          label="bench score"
          value={`${scoreDisplay}/100`}
          finalValue={`${finalScore ?? skill.score}/100`}
          accent={winner ? EMBER : (loser ? INK2 : skill.color)}
          opacity={showScore}
          big
        />
      </div>
    </div>
  );
}

function Metric({ label, value, finalValue, accent, opacity, big }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity }}>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: big ? 80 : 56,
          letterSpacing: '-0.02em',
          color: accent,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {finalValue != null
          ? <StableNum value={value} finalValue={finalValue} />
          : value}
      </span>
    </div>
  );
}

// ─── SceneVersusLinkedIn (1200×627, 9s) ─────────────────────────────────────
// Horizontal version. Left = skill A (loser), right = skill B (winner).
// Center = tagline. Subtitle at the bottom.

function SceneVersusLinkedIn() {
  const time = useTime();

  const SKILL_A = { name: 'pdf-glow', author: 'starhouse', stars: 18400, score: 41, color: AZURE };
  const SKILL_B = { name: 'pdf-extract', author: 'tomas', stars: 247, score: 88, color: EMBER };

  const showHeader = clamp((time - 0.2) / 0.5, 0, 1);
  const showA = clamp((time - 0.5) / 0.5, 0, 1);
  const showB = clamp((time - 1.0) / 0.5, 0, 1);
  const showStars = clamp((time - 1.8) / 0.7, 0, 1);
  const showScores = clamp((time - 3.6) / 0.7, 0, 1);
  const verdict = clamp((time - 5.4) / 0.5, 0, 1);
  const tagline = clamp((time - 6.4) / 0.5, 0, 1);

  const starsA = Math.round(SKILL_A.stars * counterEase(showStars));
  const starsB = Math.round(SKILL_B.stars * counterEase(showStars));
  const scoreA = Math.round(SKILL_A.score * counterEase(showScores));
  const scoreB = Math.round(SKILL_B.score * counterEase(showScores));

  // No scale-breathe on "vs" text — keeps it sharp at rest (see SceneVersusVertical).
  const headerSettled = Math.pow(clamp(showHeader, 0, 1), 6);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={28} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(showHeader),
          transform: `translateY(${(1 - easeOutSoftBack(showHeader)) * 6}px)`,
        }}
      >
        skill <span style={{ color: EMBER }}>vs</span> skill — same task
      </div>

      {/* Left card — A */}
      <CompactSkillCard
        skill={SKILL_A}
        starsDisplay={starsA}
        scoreDisplay={scoreA}
        showCard={showA}
        showStars={showStars}
        showScore={showScores}
        left={50}
        top={100}
        width={430}
        height={420}
        loser={verdict > 0.3}
        time={time}
        breathePhase={0}
      />

      {/* Center VS — scales in with overshoot then breathes. */}
      <div
        style={{
          position: 'absolute',
          left: 530,
          top: 230,
          width: 140,
          textAlign: 'center',
          fontFamily: 'Instrument Serif, serif',
          fontStyle: 'italic',
          fontSize: 110,
          letterSpacing: '-0.05em',
          color: EMBER,
          opacity: Easing.easeInOutSine(showHeader),
          lineHeight: 1,
          transform: `scale(${0.7 + 0.3 * easeOutSoftBack(showHeader)})`,
          transformOrigin: 'center',
        }}
      >
        vs
      </div>

      {/* Right card — B */}
      <CompactSkillCard
        skill={SKILL_B}
        starsDisplay={starsB}
        scoreDisplay={scoreB}
        showCard={showB}
        showStars={showStars}
        showScore={showScores}
        left={720}
        top={100}
        width={430}
        height={420}
        winner={verdict > 0.3}
        time={time}
        breathePhase={Math.PI}
      />

      {/* Tagline at the bottom — rise + soft breathe (gated post-settle) */}
      {(() => {
        const taglineSettled = Math.pow(clamp(tagline, 0, 1), 6);
        return (
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: 'Instrument Serif, serif',
              fontSize: 44,
              letterSpacing: '-0.025em',
              color: INK,
              opacity: Easing.easeInOutSine(tagline),
              transform: `translateY(${(1 - easeOutSoftBack(tagline)) * 18 + Math.round(breathe(time, 4.2, 1.2) * taglineSettled)}px)`,
            }}
          >
            Stars don&apos;t prove <em style={{ color: EMBER }}>quality.</em>
          </div>
        );
      })()}

      <FinalLogoOverlay visibleAfter={8.5} />
    </div>
  );
}

function CompactSkillCard({ skill, starsDisplay, scoreDisplay, showCard, showStars, showScore, left, top, width, height, winner, loser, time = 0, breathePhase = 0, finalStars, finalScore }) {
  const dim = loser ? 0.4 : 1;
  const entryE = easeOutSoftBack(showCard);
  // Integer-px breathe — see SkillPanel for rationale.
  const settled = Math.pow(clamp(showCard, 0, 1), 6);
  const bs = Math.round(Math.sin((time / 4.0) * Math.PI * 2 + breathePhase) * 1.0 * settled);
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: PAPER,
        border: `2px solid ${winner ? EMBER : 'transparent'}`,
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        opacity: Easing.easeInOutSine(showCard) * dim,
        transform: `translateY(${(1 - entryE) * 28 + bs}px)`,
        transition: 'border 0.4s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: skill.color,
        }}
      >
        <span style={{ width: 8, height: 8, background: skill.color }} />
        {skill.author}
      </div>
      <div
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 54,
          letterSpacing: '-0.035em',
          lineHeight: 1,
          color: INK,
        }}
      >
        {skill.name}
      </div>

      <div style={{ display: 'flex', gap: 32, marginTop: 'auto' }}>
        <Metric
          label="stars"
          value={`★ ${starsDisplay.toLocaleString('en-US')}`}
          finalValue={`★ ${(finalStars ?? skill.stars).toLocaleString('en-US')}`}
          accent={INK2}
          opacity={showStars}
        />
        <Metric
          label="score"
          value={`${scoreDisplay}/100`}
          finalValue={`${finalScore ?? skill.score}/100`}
          accent={winner ? EMBER : (loser ? INK2 : skill.color)}
          opacity={showScore}
          big
        />
      </div>
    </div>
  );
}

// ─── SceneClimbLinkedIn (1200×627, 9s) ──────────────────────────────────────
// Horizontal "rank-up" : sparkline left → labels right, hero skill goes from
// #47 to #3 with sparkline rising.

function SceneClimbLinkedIn() {
  const time = useTime();

  // Sparkline data : 10 cycles, hero skill score over time.
  const ELO_PRE = 1518;
  const ELO_POST = 1748;
  const RANK_PRE = 47;
  const RANK_POST = 3;

  const showHeader = clamp((time - 0.2) / 0.5, 0, 1);
  const showSkill = clamp((time - 0.5) / 0.5, 0, 1);
  const showHeadline = clamp((time - 1.0) / 0.5, 0, 1);
  const sparkP = clamp((time - 1.4) / 3.0, 0, 1); // sparkline reveals 1.4→4.4
  const showRankPre = clamp((time - 1.4) / 0.5, 0, 1);
  const showRankPost = clamp((time - 4.6) / 0.5, 0, 1);
  const showElo = clamp((time - 5.4) / 0.5, 0, 1);
  const tagline = clamp((time - 6.6) / 0.5, 0, 1);

  // Generate 10 points along an arc going up
  const NUM_PTS = 10;
  const points = Array.from({ length: NUM_PTS }, (_, i) => {
    const t = i / (NUM_PTS - 1);
    // Smooth curve from RANK_PRE down to RANK_POST (rank is reversed: small = top)
    const rank = RANK_PRE - (RANK_PRE - RANK_POST) * Easing.easeInOutCubic(t);
    return rank;
  });

  // Map sparkline to SVG path
  const sparkW = 560;
  const sparkH = 280;
  const sparkX = 60;
  const sparkY = 200;
  const maxRank = RANK_PRE;
  const minRank = RANK_POST;
  const pathPts = points.map((r, i) => {
    const x = (i / (NUM_PTS - 1)) * sparkW;
    const y = ((r - minRank) / (maxRank - minRank)) * sparkH;
    return [x, y];
  });
  const visiblePts = Math.max(1, Math.floor(sparkP * NUM_PTS));
  const pathD = pathPts
    .slice(0, visiblePts)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
  const lastPt = pathPts[Math.min(visiblePts - 1, NUM_PTS - 1)];

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={28} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 60,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: showHeader,
        }}
      >
        leaderboard · <span style={{ color: EMBER }}>10 cycles</span>
      </div>

      {/* Sparkline SVG — breathe gated by sparkP^6 so it stays still while
          the line draws in. */}
      <svg
        width={sparkW}
        height={sparkH}
        style={{
          position: 'absolute',
          left: sparkX,
          top: sparkY + breathe(time, 5.0, 1.0) * Math.pow(clamp(sparkP, 0, 1), 6),
          overflow: 'visible',
        }}
      >
        {/* Axis ghost */}
        <line x1={0} y1={sparkH} x2={sparkW} y2={sparkH} stroke="rgba(20,18,14,0.12)" strokeWidth={1} />
        {/* Sparkline */}
        <path d={pathD} stroke={EMBER} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot — pulses when it lands */}
        {visiblePts >= NUM_PTS && (() => {
          const sinceLand = clamp((time - (1.4 + 3.0)) / 0.4, 0, 1);
          const r = 9 + (1 - sinceLand) * 6 + breathe(time, 1.5, 0.8) * sinceLand;
          return (
            <>
              <circle cx={lastPt[0]} cy={lastPt[1]} r={r + 6} fill={EMBER} opacity={0.18 * sinceLand} />
              <circle cx={lastPt[0]} cy={lastPt[1]} r={r} fill={EMBER} />
            </>
          );
        })()}
      </svg>

      {/* Right column : labels and numbers */}
      <div style={{ position: 'absolute', left: 690, top: 80, right: 60 }}>
        {/* Skill identity — what's climbing */}
        <div
          style={{
            opacity: Easing.easeInOutSine(showSkill),
            transform: `translateY(${(1 - easeOutSoftBack(showSkill)) * 14}px)`,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: INK2,
              marginBottom: 2,
            }}
          >
            <span style={{ display: 'inline-block', width: 8, height: 8, background: EMBER, marginRight: 8, verticalAlign: 'middle' }} />
            skill
          </div>
          <div
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: 'italic',
              fontSize: 56,
              letterSpacing: '-0.035em',
              lineHeight: 1,
              color: EMBER,
            }}
          >
            pdf-extract
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.16em',
              color: INK2,
              marginTop: 4,
            }}
          >
            by tomas · MIT
          </div>
        </div>

        {/* Headline — "Watch them climb" smaller now */}
        <div
          style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 34,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: INK,
            opacity: Easing.easeInOutSine(showHeadline),
            transform: `translateY(${(1 - easeOutSoftBack(showHeadline)) * 12}px)`,
          }}
        >
          Watch it <em style={{ color: EMBER }}>climb.</em>
        </div>

        {/* Rank pre */}
        <div
          style={{
            marginTop: 36,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            opacity: Easing.easeInOutSine(showRankPre) * (1 - showRankPost * 0.4),
            transform: `translateY(${(1 - easeOutSoftBack(showRankPre)) * 10}px)`,
          }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: INK2, minWidth: 80 }}>
            Cycle 1
          </span>
          <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 44, color: INK2, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', textDecoration: showRankPost > 0.3 ? 'line-through' : 'none', textDecorationColor: 'rgba(20,18,14,0.45)' }}>
            #{RANK_PRE}
          </span>
        </div>

        {/* Rank post — big "#3" lands with overshoot + breathes. */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            opacity: Easing.easeInOutSine(showRankPost),
            transform: `translateX(${(1 - easeOutSoftBack(showRankPost)) * 22}px)`,
          }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: EMBER, minWidth: 80 }}>
            Cycle 10
          </span>
          <span
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 88,
              color: EMBER,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.025em',
              lineHeight: 1,
              display: 'inline-block',
              transform: `scale(${0.85 + 0.15 * easeOutSoftBack(showRankPost)})`,
              transformOrigin: 'left center',
            }}
          >
            #{RANK_POST}
          </span>
        </div>

        {/* ELO delta */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            opacity: Easing.easeInOutSine(showElo),
            transform: `translateY(${(1 - easeOutSoftBack(showElo)) * 10}px)`,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14,
            letterSpacing: '0.12em',
            color: SAGE,
            textTransform: 'uppercase',
          }}
        >
          <span>ELO</span>
          <span style={{ color: INK2, fontVariantNumeric: 'tabular-nums' }}>{ELO_PRE}</span>
          <span style={{ color: INK2 }}>→</span>
          <span style={{ color: SAGE, fontVariantNumeric: 'tabular-nums', fontSize: 18 }}>{ELO_POST}</span>
          <span style={{ color: SAGE, marginLeft: 6, transform: `translateY(${Math.round(breathe(time, 2.4, 1.5) * Math.pow(clamp(showElo, 0, 1), 6))}px)`, display: 'inline-block' }}>↗ +{ELO_POST - ELO_PRE}</span>
        </div>
      </div>

      {/* Tagline at the bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 60,
          right: 60,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(tagline),
          transform: `translateY(${(1 - easeOutSoftBack(tagline)) * 8}px)`,
        }}
      >
        bench scores update daily · <span style={{ color: EMBER }}>versuz.dev</span>
      </div>

      <FinalLogoOverlay visibleAfter={8.5} />
    </div>
  );
}

// ─── SceneJudgesVertical (1080×1920, 8s) ────────────────────────────────────
// 3 judges stacked, each giving their score. Final composite at the bottom.

const JUDGES_DATA = [
  { id: 'haiku',    label: 'Haiku 4.5',     vendor: 'Anthropic',  score: 84, color: EMBER },
  { id: 'deepseek', label: 'DeepSeek V4',   vendor: 'DeepSeek',   score: 78, color: AZURE },
  { id: 'gpt5',     label: 'GPT-5 mini',    vendor: 'OpenAI',     score: 81, color: SAGE  },
];

function SceneJudgesVertical() {
  const time = useTime();

  const showHeader = clamp((time - 0.2) / 0.5, 0, 1);
  const showTitle = clamp((time - 0.4) / 0.6, 0, 1);
  // 3 judges stagger : 1.4, 2.4, 3.4
  const showJudge = (i) => clamp((time - (1.4 + i * 1.0)) / 0.6, 0, 1);
  const scoreReveal = (i) => clamp((time - (1.8 + i * 1.0)) / 0.6, 0, 1);
  const composite = clamp((time - 5.4) / 0.6, 0, 1);
  const tagline = clamp((time - 6.6) / 0.5, 0, 1);

  const compScoreFinal = Math.round(
    JUDGES_DATA.reduce((a, j) => a + j.score, 0) / JUDGES_DATA.length
  );
  const compScore = Math.round(compScoreFinal * counterEase(composite));

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={32} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(showHeader),
          transform: `translateY(${(1 - easeOutSoftBack(showHeader)) * 10}px)`,
        }}
      >
        3 judges · 0 hidden
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 60,
          right: 60,
          fontFamily: 'Instrument Serif, serif',
          fontSize: 92,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color: INK,
          opacity: Easing.easeInOutSine(showTitle),
          transform: `translateY(${(1 - easeOutSoftBack(showTitle)) * 24}px)`,
        }}
      >
        Three <em style={{ color: EMBER }}>frontier</em>{'\n'}models, same{'\n'}rubric.
      </div>

      {/* 3 judge cards stacked — each slides in with overshoot, then breathes
          on its own phase so they don't pulse in unison. Breathe gated by
          show^6 so it stays still during slide-in. */}
      {JUDGES_DATA.map((j, i) => {
        const show = showJudge(i);
        const scoreShow = scoreReveal(i);
        const scoreAnim = Math.round(j.score * counterEase(scoreShow));
        const top = 680 + i * 220;
        const entryE = easeOutSoftBack(show);
        const showSettled = Math.pow(clamp(show, 0, 1), 6);
        const bs = Math.round(Math.sin((time / 4.5) * Math.PI * 2 + i * 1.3) * 1.0 * showSettled);
        return (
          <div
            key={j.id}
            style={{
              position: 'absolute',
              top,
              left: 60,
              right: 60,
              height: 190,
              background: PAPER,
              borderLeft: `4px solid ${j.color}`,
              padding: '28px 36px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: 24,
              opacity: Easing.easeInOutSine(show),
              transform: `translateX(${(1 - entryE) * -60}px) translateY(${bs}px)`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: j.color,
                }}
              >
                {j.vendor}
              </span>
              <span
                style={{
                  fontFamily: 'Instrument Serif, serif',
                  fontSize: 60,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: INK,
                }}
              >
                {j.label}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 110,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
                color: j.color,
                lineHeight: 1,
                opacity: Easing.easeInOutSine(scoreShow),
                display: 'inline-block',
                transform: `scale(${0.85 + 0.15 * easeOutSoftBack(scoreShow)})`,
                transformOrigin: 'right center',
              }}
            >
              <StableNum value={scoreAnim} finalValue={j.score} align="right" />
            </span>
          </div>
        );
      })}

      {/* Composite final */}
      <Sprite start={5.4} end={8}>
        {() => (
          <div
            style={{
              position: 'absolute',
              bottom: 220,
              left: 60,
              right: 60,
              padding: '32px 40px',
              background: INK,
              color: BONE,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              opacity: Easing.easeInOutSine(composite),
              transform: `translateY(${(1 - easeOutSoftBack(composite)) * 36 + Math.round(breathe(time, 4.0, 1.5) * Math.pow(clamp(composite, 0, 1), 6))}px)`,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 18,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(246,244,239,0.6)',
              }}
            >
              composite
            </span>
            <span
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 140,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.04em',
                color: EMBER,
                lineHeight: 1,
              }}
            >
              <StableNum value={compScore} finalValue={compScoreFinal} />
              <span style={{ fontSize: 56, color: BONE, marginLeft: 8 }}>/100</span>
            </span>
          </div>
        )}
      </Sprite>

      {/* Tagline */}
      <Sprite start={6.6} end={8}>
        {() => (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 60,
              right: 60,
              textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: INK2,
              opacity: Easing.easeInOutSine(tagline),
              transform: `translateY(${(1 - easeOutSoftBack(tagline)) * 10}px)`,
            }}
          >
            disagreement is <span style={{ color: EMBER }}>published</span>
          </div>
        )}
      </Sprite>

      <FinalLogoOverlay visibleAfter={7.5} />
    </div>
  );
}

// ─── SceneJudgesLinkedIn (1200×627, 9s) ─────────────────────────────────────
// Horizontal version. 3 judges side-by-side, composite below, rationale snippet.

function SceneJudgesLinkedIn() {
  const time = useTime();

  const showHeader = clamp((time - 0.2) / 0.5, 0, 1);
  const showTitle = clamp((time - 0.4) / 0.6, 0, 1);
  const showJudge = (i) => clamp((time - (1.6 + i * 0.7)) / 0.5, 0, 1);
  const scoreReveal = (i) => clamp((time - (2.0 + i * 0.7)) / 0.6, 0, 1);
  const composite = clamp((time - 5.4) / 0.6, 0, 1);
  const rationale = clamp((time - 6.4) / 0.5, 0, 1);

  const compScoreFinal = Math.round(
    JUDGES_DATA.reduce((a, j) => a + j.score, 0) / JUDGES_DATA.length
  );
  const compScore = Math.round(compScoreFinal * counterEase(composite));

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={28} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 60,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(showHeader),
          transform: `translateY(${(1 - easeOutSoftBack(showHeader)) * 6}px)`,
        }}
      >
        the judges · <span style={{ color: EMBER }}>3 frontier models</span>
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 60,
          right: 60,
          fontFamily: 'Instrument Serif, serif',
          fontSize: 52,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color: INK,
          opacity: Easing.easeInOutSine(showTitle),
          transform: `translateY(${(1 - easeOutSoftBack(showTitle)) * 20}px)`,
        }}
      >
        Three judges. <em style={{ color: EMBER }}>Zero hidden.</em>
      </div>

      {/* 3 judge cards in row — stagger w/ overshoot, individual breathe phases.
          Breathe gated by show^6 so cards don't twitch during slide-in. */}
      {JUDGES_DATA.map((j, i) => {
        const show = showJudge(i);
        const scoreShow = scoreReveal(i);
        const scoreAnim = Math.round(j.score * counterEase(scoreShow));
        const left = 60 + i * 370;
        const entryE = easeOutSoftBack(show);
        const showSettled = Math.pow(clamp(show, 0, 1), 6);
        const bs = Math.round(Math.sin((time / 4.3) * Math.PI * 2 + i * 1.5) * 1.0 * showSettled);
        return (
          <div
            key={j.id}
            style={{
              position: 'absolute',
              top: 240,
              left,
              width: 340,
              height: 180,
              background: PAPER,
              borderTop: `4px solid ${j.color}`,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              opacity: Easing.easeInOutSine(show),
              transform: `translateY(${(1 - entryE) * 24 + bs}px)`,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: j.color,
              }}
            >
              {j.vendor}
            </span>
            <span
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 32,
                letterSpacing: '-0.025em',
                color: INK,
                lineHeight: 1.05,
              }}
            >
              {j.label}
            </span>
            <span
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 76,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.025em',
                color: j.color,
                marginTop: 'auto',
                lineHeight: 1,
                opacity: Easing.easeInOutSine(scoreShow),
                display: 'inline-block',
                transform: `scale(${0.88 + 0.12 * easeOutSoftBack(scoreShow)})`,
                transformOrigin: 'left center',
              }}
            >
              <StableNum value={scoreAnim} finalValue={j.score} />
              <span style={{ fontSize: 22, color: INK2, marginLeft: 4 }}>/100</span>
            </span>
          </div>
        );
      })}

      {/* Composite + rationale at the bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 60,
          right: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          opacity: Easing.easeInOutSine(rationale),
          transform: `translateY(${(1 - easeOutSoftBack(rationale)) * 18 + Math.round(breathe(time, 4.2, 1.2) * Math.pow(clamp(rationale, 0, 1), 6))}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: INK2,
            }}
          >
            composite
          </span>
          <span
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 64,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
              color: EMBER,
              lineHeight: 1,
              opacity: Easing.easeInOutSine(composite),
              display: 'inline-block',
              transform: `scale(${0.88 + 0.12 * easeOutSoftBack(composite)})`,
              transformOrigin: 'left center',
            }}
          >
            <StableNum
              value={compScore}
              finalValue={compScoreFinal}
            />
            <span style={{ fontSize: 28, color: INK, marginLeft: 6 }}>/100</span>
          </span>
        </div>
        <div
          style={{
            flex: 1,
            padding: '14px 18px',
            background: PAPER,
            borderLeft: `3px solid ${EMBER}`,
            fontFamily: 'Instrument Serif, serif',
            fontStyle: 'italic',
            fontSize: 18,
            lineHeight: 1.4,
            color: INK2,
          }}
        >
          &ldquo;Three frontier LLMs grade independently — disagreement is published, not hidden.&rdquo;
        </div>
      </div>

      <FinalLogoOverlay visibleAfter={8.5} />
    </div>
  );
}

// ─── SceneTerminalStory (1200×627, 19s) ─────────────────────────────────────
// End-to-end LinkedIn narrative — no sound, told entirely in terminal text :
//   1. SEARCH   → 3 results, winner highlighted by bench score (not stars)
//   2. WHY      → 3 judges grade pdf-extract independently
//   3. INSTALL  → ~/.claude/skills/pdf-extract written
//   4. SUBMIT   → your skill enters tomorrow's cycle
//   5. CTA      → versuz.dev + npm install
// Designed to be readable on autoplay-muted LinkedIn feed.

function useTypeText(text, startAt, endAt) {
  const time = useTime();
  const local = clamp((time - startAt) / (endAt - startAt), 0, 1);
  const n = Math.floor(local * text.length + 0.0001);
  return text.slice(0, n);
}

const TERM_BG = '#0E0D0B';
const TERM_FG = '#E8E2D4';
const TERM_DIM = '#6B6557';
const TERM_BLUE = '#6BA4D9';
const TERM_GREEN = '#7FB388';
const TERM_AMBER = '#D69E2E';

function TermLine({ children, show, slideX = 0, slideY = 6 }) {
  if (show <= 0) return null;
  const e = clamp(show, 0, 1);
  return (
    <div
      style={{
        opacity: Easing.easeInOutSine(e),
        transform: `translate(${(1 - e) * slideX}px, ${(1 - e) * slideY}px)`,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

// Single 4-state beat structure : beat is visible during its [start, end].
// Each beat fades the previous content out and the new content in, so the
// terminal feels continuous without overwhelming the viewer with text.

function SceneTerminalStory() {
  const time = useTime();

  // ─── Beat timings ──────────────────────────────────────────────────────
  // SEARCH : 0.0 → 4.0
  // WHY    : 4.0 → 8.0
  // INSTALL: 8.0 → 12.0
  // SUBMIT : 12.0 → 16.0
  // CTA    : 16.5 → 19.0 (FinalLogoOverlay)
  const beat1 = { start: 0.0, end: 4.2 };
  const beat2 = { start: 4.0, end: 8.2 };
  const beat3 = { start: 8.0, end: 12.2 };
  const beat4 = { start: 12.0, end: 16.5 };

  // Per-beat visibility (1 during beat, 0 elsewhere with 0.3s crossfade)
  const beatVis = (b) => {
    const fadeIn = clamp((time - b.start) / 0.3, 0, 1);
    const fadeOut = clamp((b.end - time) / 0.3, 0, 1);
    return Math.min(fadeIn, fadeOut);
  };

  // Window entry
  const winP = clamp(time / 0.6, 0, 1);

  // ─── BEAT 1 — SEARCH ──────────────────────────────────────────────────
  const b1cmd = useTypeText('$ npx versuz search pdf', 0.3, 1.5);
  const b1showRes1 = clamp((time - 1.9) / 0.3, 0, 1);
  const b1showRes2 = clamp((time - 2.2) / 0.3, 0, 1);
  const b1showRes3 = clamp((time - 2.5) / 0.3, 0, 1);
  const b1highlight = clamp((time - 3.0) / 0.4, 0, 1);
  const b1caption = clamp((time - 3.3) / 0.4, 0, 1);

  // ─── BEAT 2 — WHY (judges) ────────────────────────────────────────────
  const b2cmd = useTypeText('$ npx versuz info pdf-extract', 4.3, 5.4);
  const b2showJ1 = clamp((time - 5.7) / 0.3, 0, 1);
  const b2showJ2 = clamp((time - 6.0) / 0.3, 0, 1);
  const b2showJ3 = clamp((time - 6.3) / 0.3, 0, 1);
  const b2composite = clamp((time - 6.8) / 0.4, 0, 1);
  const b2caption = clamp((time - 7.3) / 0.4, 0, 1);

  // ─── BEAT 3 — INSTALL ─────────────────────────────────────────────────
  const b3cmd = useTypeText('$ npx versuz install pdf-extract', 8.3, 9.6);
  const b3step1 = clamp((time - 9.9) / 0.3, 0, 1);
  const b3step2 = clamp((time - 10.2) / 0.3, 0, 1);
  const b3step3 = clamp((time - 10.5) / 0.3, 0, 1);
  const b3caption = clamp((time - 11.0) / 0.4, 0, 1);

  // ─── BEAT 4 — SUBMIT ──────────────────────────────────────────────────
  const b4cmd = useTypeText('$ versuz submit ./my-skill', 12.3, 13.4);
  const b4step1 = clamp((time - 13.7) / 0.3, 0, 1);
  const b4step2 = clamp((time - 14.0) / 0.3, 0, 1);
  const b4step3 = clamp((time - 14.3) / 0.3, 0, 1);
  const b4caption = clamp((time - 15.0) / 0.4, 0, 1);

  // Spinner char for animated steps
  const spinChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const spinChar = spinChars[Math.floor(time * 10) % spinChars.length];

  const b1 = beatVis(beat1);
  const b2 = beatVis(beat2);
  const b3 = beatVis(beat3);
  const b4 = beatVis(beat4);

  // Caret blink for active typing
  const blink = Math.floor(time * 2) % 2 === 0;
  const showCaret1 = time > 0.3 && time < 1.7 && b1cmd.length < 23;
  const showCaret2 = time > 4.3 && time < 5.6 && b2cmd.length < 30;
  const showCaret3 = time > 8.3 && time < 9.8 && b3cmd.length < 32;
  const showCaret4 = time > 12.3 && time < 13.6 && b4cmd.length < 26;

  return (
    <div style={{ position: 'absolute', inset: 0, background: TERM_BG, overflow: 'hidden' }}>
      {/* Subtle grid pattern on the BG so the dark canvas doesn't feel flat */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(246,244,239,0.025) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(246,244,239,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: `${((time * 4) % 40 + 40) % 40}px ${((time * 4) % 40 + 40) % 40}px`,
        }}
      />

      {/* Terminal window */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
          background: '#15130F',
          border: '1px solid rgba(246,244,239,0.10)',
          borderRadius: 4,
          opacity: winP,
          transform: `scale(${0.97 + 0.03 * easeOutSoftBack(winP)})`,
          transformOrigin: 'center',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 38,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid rgba(246,244,239,0.06)',
            gap: 8,
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#3F3A33' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#3F3A33' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#3F3A33' }} />
          <span
            style={{
              marginLeft: 16,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: 'rgba(246,244,239,0.40)',
              letterSpacing: '0.04em',
            }}
          >
            ~ — versuz · terminal
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: EMBER,
              opacity: 0.85,
            }}
          >
            versuz.dev
          </span>
        </div>

        {/* Body — beats stacked, only one visible at a time */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            padding: '24px 32px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 17,
            lineHeight: 1.5,
            color: TERM_FG,
            letterSpacing: '0.01em',
          }}
        >
          {/* ─── BEAT 1 — SEARCH ─────────────────────────────────────── */}
          {b1 > 0 && (
            <div style={{ position: 'absolute', inset: '24px 32px', opacity: b1 }}>
              <div>
                <span style={{ color: TERM_DIM }}>$ </span>
                <span>{b1cmd.slice(2)}</span>
                {showCaret1 && blink && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 18,
                      marginLeft: 3,
                      marginBottom: -3,
                      background: TERM_FG,
                    }}
                  />
                )}
              </div>

              <TermLine show={b1showRes1}>
                <div style={{ marginTop: 20, color: TERM_DIM, fontSize: 14 }}>
                  3 skills · ranked by composite bench
                </div>
              </TermLine>

              <TermLine show={b1showRes1} slideX={-8}>
                <div style={{ marginTop: 18, color: TERM_DIM, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  <span style={{ display: 'inline-block', width: 200 }}>name</span>
                  <span style={{ display: 'inline-block', width: 140 }}>stars</span>
                  <span>bench</span>
                </div>
              </TermLine>

              <TermLine show={b1showRes1} slideX={-12}>
                <div style={{ marginTop: 6, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 200, color: TERM_DIM }}>pdf-glow</span>
                  <span style={{ display: 'inline-block', width: 140 }}>★ 18,400</span>
                  <span style={{ color: AZURE }}>41</span>
                </div>
              </TermLine>

              <TermLine show={b1showRes2} slideX={-12}>
                <div
                  style={{
                    marginTop: 4,
                    padding: b1highlight > 0.3 ? '4px 8px' : '4px 0',
                    marginLeft: b1highlight > 0.3 ? -8 : 0,
                    background: b1highlight > 0.3 ? 'rgba(194,65,12,0.12)' : 'transparent',
                    borderLeft: b1highlight > 0.3 ? `3px solid ${EMBER}` : '3px solid transparent',
                    paddingLeft: b1highlight > 0.3 ? 8 : 0,
                    transition: 'none',
                  }}
                >
                  <span style={{ display: 'inline-block', width: 200, color: EMBER, fontWeight: 500 }}>pdf-extract</span>
                  <span style={{ display: 'inline-block', width: 140, color: TERM_DIM }}>★ 247</span>
                  <span style={{ color: EMBER, fontWeight: 500 }}>88</span>
                  {b1highlight > 0.5 && (
                    <span style={{ marginLeft: 24, color: EMBER, fontSize: 14 }}>← top quality</span>
                  )}
                </div>
              </TermLine>

              <TermLine show={b1showRes3} slideX={-12}>
                <div style={{ marginTop: 4, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 200, color: TERM_DIM }}>pdf-fast</span>
                  <span style={{ display: 'inline-block', width: 140 }}>★ 1,203</span>
                  <span style={{ color: SAGE }}>62</span>
                </div>
              </TermLine>

              <TermLine show={b1caption} slideY={10}>
                <div
                  style={{
                    marginTop: 28,
                    color: TERM_DIM,
                    fontFamily: 'Instrument Serif, serif',
                    fontStyle: 'italic',
                    fontSize: 26,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Stars don&apos;t prove <span style={{ color: EMBER }}>quality</span>.
                </div>
              </TermLine>
            </div>
          )}

          {/* ─── BEAT 2 — WHY (judges) ───────────────────────────────── */}
          {b2 > 0 && (
            <div style={{ position: 'absolute', inset: '24px 32px', opacity: b2 }}>
              <div>
                <span style={{ color: TERM_DIM }}>$ </span>
                <span>{b2cmd.slice(2)}</span>
                {showCaret2 && blink && (
                  <span style={{ display: 'inline-block', width: 9, height: 18, marginLeft: 3, marginBottom: -3, background: TERM_FG }} />
                )}
              </div>

              <TermLine show={b2showJ1}>
                <div style={{ marginTop: 18, color: TERM_DIM, fontSize: 14 }}>
                  3 frontier judges · 0 hidden
                </div>
              </TermLine>

              <TermLine show={b2showJ1} slideX={-10}>
                <div style={{ marginTop: 14, color: TERM_FG, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 8, height: 8, background: EMBER, display: 'inline-block' }} />
                  <span style={{ width: 180, color: TERM_DIM }}>Haiku 4.5 · Anthropic</span>
                  <span style={{ color: EMBER, fontFamily: 'Instrument Serif, serif', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>84</span>
                </div>
              </TermLine>

              <TermLine show={b2showJ2} slideX={-10}>
                <div style={{ marginTop: 10, color: TERM_FG, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 8, height: 8, background: AZURE, display: 'inline-block' }} />
                  <span style={{ width: 180, color: TERM_DIM }}>DeepSeek V4 · DeepSeek</span>
                  <span style={{ color: AZURE, fontFamily: 'Instrument Serif, serif', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>78</span>
                </div>
              </TermLine>

              <TermLine show={b2showJ3} slideX={-10}>
                <div style={{ marginTop: 10, color: TERM_FG, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 8, height: 8, background: SAGE, display: 'inline-block' }} />
                  <span style={{ width: 180, color: TERM_DIM }}>GPT-5 mini · OpenAI</span>
                  <span style={{ color: SAGE, fontFamily: 'Instrument Serif, serif', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>81</span>
                </div>
              </TermLine>

              <TermLine show={b2composite}>
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    background: 'rgba(194,65,12,0.10)',
                    borderLeft: `3px solid ${EMBER}`,
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: 16,
                  }}
                >
                  <span style={{ color: TERM_DIM, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    composite
                  </span>
                  <span
                    style={{
                      color: EMBER,
                      fontFamily: 'Instrument Serif, serif',
                      fontSize: 40,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    81<span style={{ fontSize: 18, color: TERM_FG, marginLeft: 4 }}>/100</span>
                  </span>
                </div>
              </TermLine>

              <TermLine show={b2caption} slideY={10}>
                <div
                  style={{
                    marginTop: 18,
                    color: TERM_DIM,
                    fontFamily: 'Instrument Serif, serif',
                    fontStyle: 'italic',
                    fontSize: 22,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Disagreement is <span style={{ color: EMBER }}>published</span>, not hidden.
                </div>
              </TermLine>
            </div>
          )}

          {/* ─── BEAT 3 — INSTALL ────────────────────────────────────── */}
          {b3 > 0 && (
            <div style={{ position: 'absolute', inset: '24px 32px', opacity: b3 }}>
              <div>
                <span style={{ color: TERM_DIM }}>$ </span>
                <span>{b3cmd.slice(2)}</span>
                {showCaret3 && blink && (
                  <span style={{ display: 'inline-block', width: 9, height: 18, marginLeft: 3, marginBottom: -3, background: TERM_FG }} />
                )}
              </div>

              <TermLine show={b3step1}>
                <div style={{ marginTop: 18, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 28, color: b3step1 >= 0.9 ? SAGE : EMBER }}>
                    {b3step1 >= 0.9 ? '✓' : spinChar}
                  </span>
                  <span>resolving pdf-extract@1.2.0</span>
                </div>
              </TermLine>

              <TermLine show={b3step2}>
                <div style={{ marginTop: 6, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 28, color: b3step2 >= 0.9 ? SAGE : EMBER }}>
                    {b3step2 >= 0.9 ? '✓' : spinChar}
                  </span>
                  <span>writing ~/.claude/skills/pdf-extract/</span>
                </div>
              </TermLine>

              <TermLine show={b3step2 >= 0.9 ? 1 : 0} slideX={-8}>
                <div style={{ marginTop: 4, marginLeft: 28, color: TERM_DIM, fontSize: 14 }}>
                  ├── SKILL.md         <span style={{ color: TERM_DIM }}>·  4.2 KB</span>
                </div>
              </TermLine>
              <TermLine show={b3step2 >= 0.9 ? 1 : 0} slideX={-8}>
                <div style={{ marginTop: 2, marginLeft: 28, color: TERM_DIM, fontSize: 14 }}>
                  ├── scripts/extract.py  <span style={{ color: TERM_DIM }}>· 18 KB</span>
                </div>
              </TermLine>
              <TermLine show={b3step2 >= 0.9 ? 1 : 0} slideX={-8}>
                <div style={{ marginTop: 2, marginLeft: 28, color: TERM_DIM, fontSize: 14 }}>
                  └── refs/schema.json    <span style={{ color: TERM_DIM }}>· 62 KB</span>
                </div>
              </TermLine>

              <TermLine show={b3step3}>
                <div style={{ marginTop: 14, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 28, color: SAGE }}>✓</span>
                  <span style={{ color: SAGE }}>installed · 84 KB</span>
                </div>
              </TermLine>

              <TermLine show={b3caption} slideY={10}>
                <div
                  style={{
                    marginTop: 18,
                    color: TERM_DIM,
                    fontFamily: 'Instrument Serif, serif',
                    fontStyle: 'italic',
                    fontSize: 22,
                    letterSpacing: '-0.02em',
                  }}
                >
                  One command. <span style={{ color: EMBER }}>Ready to use.</span>
                </div>
              </TermLine>
            </div>
          )}

          {/* ─── BEAT 4 — SUBMIT ─────────────────────────────────────── */}
          {b4 > 0 && (
            <div style={{ position: 'absolute', inset: '24px 32px', opacity: b4 }}>
              <div>
                <span style={{ color: TERM_DIM }}>$ </span>
                <span>{b4cmd.slice(2)}</span>
                {showCaret4 && blink && (
                  <span style={{ display: 'inline-block', width: 9, height: 18, marginLeft: 3, marginBottom: -3, background: TERM_FG }} />
                )}
              </div>

              <TermLine show={b4step1}>
                <div style={{ marginTop: 18, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 28, color: b4step1 >= 0.9 ? SAGE : EMBER }}>
                    {b4step1 >= 0.9 ? '✓' : spinChar}
                  </span>
                  <span>validating SKILL.md · checking license</span>
                </div>
              </TermLine>

              <TermLine show={b4step2}>
                <div style={{ marginTop: 6, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 28, color: b4step2 >= 0.9 ? SAGE : EMBER }}>
                    {b4step2 >= 0.9 ? '✓' : spinChar}
                  </span>
                  <span>uploading to versuz.dev</span>
                </div>
              </TermLine>

              <TermLine show={b4step3}>
                <div style={{ marginTop: 6, color: TERM_FG }}>
                  <span style={{ display: 'inline-block', width: 28, color: SAGE }}>✓</span>
                  <span style={{ color: SAGE }}>entered cycle #185</span>
                  <span style={{ color: TERM_DIM, marginLeft: 12 }}>· judged in ~2h</span>
                </div>
              </TermLine>

              <TermLine show={b4caption} slideY={10}>
                <div
                  style={{
                    marginTop: 22,
                    color: TERM_DIM,
                    fontFamily: 'Instrument Serif, serif',
                    fontStyle: 'italic',
                    fontSize: 24,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Your skill, <span style={{ color: EMBER }}>ranked daily</span>.
                </div>
              </TermLine>
            </div>
          )}
        </div>
      </div>

      <FinalLogoOverlay visibleAfter={16.6} dark />
    </div>
  );
}

// ─── SceneBoostLinkedIn (1200×627, 13s) ─────────────────────────────────────
// The promote / boost feature. Your skill, buried at #43, gets pinned to the
// top 6 slots of /marketplace for 30 days for $4.99. Story arc:
//   1. Show leaderboard, hero skill at #43 (long tail)
//   2. Boost card slides in with price + click
//   3. Skill climbs to the top, Featured pill appears
//   4. CTA : versuz.dev/boost

function SceneBoostLinkedIn() {
  const time = useTime();

  const BOARD = [
    { id: 'agent-fox',    author: 'siva',          rank: 38, score: 72 },
    { id: 'csv-surgeon',  author: 'rowan',         rank: 39, score: 71 },
    { id: 'graph-walker', author: 'mei',           rank: 40, score: 70 },
    { id: 'web-scry',     author: 'kira',          rank: 41, score: 69 },
    { id: 'note-grok',    author: 'leo',           rank: 42, score: 68 },
    { id: 'pdf-extract',  author: 'tomas',         rank: 43, score: 88, hero: true },
    { id: 'sql-loom',     author: 'pat',           rank: 44, score: 67 },
  ];

  // Phase progress
  const phaseHeader = clamp((time - 0.2) / 0.5, 0, 1);
  const phaseBoard = clamp((time - 0.4) / 0.6, 0, 1);
  const phaseCaption = clamp((time - 1.6) / 0.5, 0, 1);
  const phasePriceCard = clamp((time - 3.0) / 0.5, 0, 1);
  const phaseClick = clamp((time - 4.8) / 0.4, 0, 1);
  const phaseCheck = clamp((time - 5.4) / 0.4, 0, 1);
  // Climb animation : rank goes from 43 → 1 between t=6.0 and t=9.0
  const phaseClimb = clamp((time - 6.0) / 3.0, 0, 1);
  const phaseFeaturedPill = clamp((time - 8.5) / 0.4, 0, 1);
  const phaseTagline = clamp((time - 9.8) / 0.5, 0, 1);

  // Hero rank during animation
  const heroRankF = 43 - 42 * Easing.easeInOutQuart(phaseClimb); // 43 → 1
  const heroRankShown = Math.max(1, Math.round(heroRankF));

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={28} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: 60,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(phaseHeader),
          transform: `translateY(${(1 - easeOutSoftBack(phaseHeader)) * 6}px)`,
        }}
      >
        marketplace · <span style={{ color: EMBER }}>boost</span>
      </div>

      {/* LEFT — mini leaderboard. 540px wide. */}
      <div style={{ position: 'absolute', left: 60, top: 90, width: 540 }}>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: INK2,
            marginBottom: 10,
            display: 'flex',
            gap: 12,
            opacity: Easing.easeInOutSine(phaseBoard),
          }}
        >
          <span style={{ width: 32 }}>rank</span>
          <span style={{ flex: 1 }}>skill</span>
          <span style={{ width: 40, textAlign: 'right' }}>score</span>
        </div>

        {BOARD.map((row, i) => {
          const itemShow = clamp((time - 0.5 - i * 0.06) / 0.4, 0, 1);
          const heroRank = row.hero ? heroRankShown : null;
          const displayRank = row.hero ? heroRankShown : row.rank;
          // For non-hero rows, animate top position so the leaderboard
          // visually re-orders as hero climbs.
          let yOffset = 0;
          if (!row.hero) {
            // After climb starts, this row may shift down 1 slot if hero
            // passes its rank.
            const passed = heroRankF <= row.rank - 0.5;
            yOffset = passed ? -44 : 0; // wait, hero rises = others stay or shift down?
          }
          // Hero's vertical position : compute from its current rank.
          let heroY = 0;
          if (row.hero) {
            // Native position at #43 is i * rowH. Target at #1 = 0.
            // Other rows are #38-44 → i positions 0..6, hero at i=5.
            // After climb, hero is at top, others compress.
            const startY = 5 * 44; // i=5 (current row index)
            const endY = 0;
            heroY = startY + (endY - startY) * Easing.easeInOutQuart(phaseClimb);
            heroY -= 5 * 44; // offset from native position
          }
          // For non-hero rows: when hero passes them, they shift up by 1 row.
          if (!row.hero) {
            const rank = row.rank;
            // Hero passes this rank when heroRankF <= rank
            const passProgress = clamp((rank + 0.5 - heroRankF) / 1, 0, 1);
            // When hero has passed = need to be 1 row lower than original
            yOffset = passProgress * 44;
          }

          return (
            <div
              key={row.id}
              style={{
                position: 'relative',
                height: 40,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px',
                background: row.hero ? 'rgba(194,65,12,0.10)' : 'transparent',
                borderLeft: row.hero
                  ? `3px solid ${EMBER}`
                  : '3px solid transparent',
                opacity: Easing.easeInOutSine(itemShow),
                transform: `translateY(${(1 - easeOutSoftBack(itemShow)) * 8 + (row.hero ? heroY : yOffset)}px)`,
                transition: 'background 0.3s',
                zIndex: row.hero ? 2 : 1,
              }}
            >
              <span
                style={{
                  width: 32,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  letterSpacing: '0.04em',
                  color: row.hero ? EMBER : INK2,
                  fontWeight: row.hero ? 500 : 400,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                #{String(displayRank).padStart(2, '0')}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'Instrument Serif, serif',
                  fontSize: 22,
                  letterSpacing: '-0.02em',
                  color: row.hero ? EMBER : INK,
                  fontStyle: row.hero ? 'italic' : 'normal',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                }}
              >
                {row.id}
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    color: INK2,
                    fontStyle: 'normal',
                  }}
                >
                  {row.author}
                </span>
                {row.hero && phaseFeaturedPill > 0.1 && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: '2px 8px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: BONE,
                      background: EMBER,
                      opacity: Easing.easeInOutSine(phaseFeaturedPill),
                      transform: `scale(${0.6 + 0.4 * easeOutSoftBack(phaseFeaturedPill)})`,
                      fontStyle: 'normal',
                      display: 'inline-block',
                    }}
                  >
                    featured
                  </span>
                )}
              </span>
              <span
                style={{
                  width: 40,
                  textAlign: 'right',
                  fontFamily: 'Instrument Serif, serif',
                  fontSize: 22,
                  color: row.hero ? EMBER : INK2,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                  fontWeight: row.hero ? 500 : 400,
                }}
              >
                {row.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* "Buried in the long tail" early caption */}
      {phaseCaption > 0 && phasePriceCard < 0.3 && (
        <div
          style={{
            position: 'absolute',
            top: 380,
            left: 60,
            width: 540,
            fontFamily: 'Instrument Serif, serif',
            fontSize: 26,
            letterSpacing: '-0.02em',
            color: INK2,
            opacity: Easing.easeInOutSine(phaseCaption) * (1 - phasePriceCard),
            transform: `translateY(${(1 - easeOutSoftBack(phaseCaption)) * 10}px)`,
          }}
        >
          Buried at <span style={{ color: EMBER, fontStyle: 'italic' }}>#43</span> ?
        </div>
      )}

      {/* RIGHT — boost price card */}
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 130,
          width: 460,
          opacity: Easing.easeInOutSine(phasePriceCard),
          transform: `translateY(${(1 - easeOutSoftBack(phasePriceCard)) * 24}px) translateX(${(1 - easeOutSoftBack(phasePriceCard)) * 30}px)`,
        }}
      >
        <div
          style={{
            background: phaseCheck > 0.5 ? 'rgba(63,125,79,0.08)' : INK,
            color: BONE,
            padding: '28px 32px',
            borderLeft: `4px solid ${phaseCheck > 0.5 ? SAGE : EMBER}`,
            transition: 'background 0.3s, border-color 0.3s',
            transform: phaseClick > 0.5 && phaseClick < 1 ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: phaseCheck > 0.5 ? SAGE : 'rgba(246,244,239,0.5)',
              marginBottom: 14,
            }}
          >
            {phaseCheck > 0.5 ? '✓ boosted · 30 days' : 'boost · 30 days featured'}
          </div>
          <div
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: 80,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: phaseCheck > 0.5 ? SAGE : EMBER,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            $4<span style={{ fontSize: 36, color: 'rgba(246,244,239,0.6)' }}>.99</span>
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              letterSpacing: '0.18em',
              color: 'rgba(246,244,239,0.5)',
              marginTop: 12,
            }}
          >
            top 6 slots · /marketplace
          </div>
          {/* "Buy" button */}
          {phasePriceCard > 0.3 && (
            <div
              style={{
                marginTop: 22,
                padding: '14px 20px',
                background: phaseCheck > 0.5 ? SAGE : EMBER,
                color: BONE,
                textAlign: 'center',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transform:
                  phaseClick > 0.3 && phaseClick < 0.8
                    ? 'scale(0.96)'
                    : 'scale(1)',
                transition: 'transform 0.15s',
              }}
            >
              {phaseCheck > 0.5 ? '✓ payment complete' : 'boost my skill →'}
            </div>
          )}
        </div>
      </div>

      {/* Tagline / final caption */}
      {phaseTagline > 0 && (
        <div
          style={{
            position: 'absolute',
            right: 60,
            top: 430,
            width: 460,
            fontFamily: 'Instrument Serif, serif',
            fontSize: 36,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: INK,
            opacity: Easing.easeInOutSine(phaseTagline),
            transform: `translateY(${(1 - easeOutSoftBack(phaseTagline)) * 16}px)`,
          }}
        >
          Pinned to <span style={{ color: EMBER, fontStyle: 'italic' }}>the top</span> for 30 days.
        </div>
      )}

      <FinalLogoOverlay visibleAfter={12.5} />
    </div>
  );
}

// ─── SceneTiersLinkedIn (1200×627, 13s) ─────────────────────────────────────
// 5 progressive trust tiers for skills, shown as a horizontal progression
// ladder. Each tier card slides in stagger, then a connecting line draws
// across to show the journey from "anyone can submit" to "Versuz-verified".

const TIER_DATA = [
  { id: 't0', label: 'Unverified', sub: 'Scraped from GitHub', color: INK2,  number: '0' },
  { id: 't1', label: 'Claimed',    sub: 'Author claimed page', color: AZURE, number: '1' },
  { id: 't2', label: 'Verified',   sub: 'Identity confirmed',  color: SAGE,  number: '2' },
  { id: 't3', label: 'Reviewed',   sub: 'Bench-passed',        color: AMBER, number: '3' },
  { id: 't4', label: 'Featured',   sub: 'Versuz first-party',  color: EMBER, number: '4' },
];

function SceneTiersLinkedIn() {
  const time = useTime();

  const phaseHeader = clamp((time - 0.2) / 0.5, 0, 1);
  const phaseTitle = clamp((time - 0.5) / 0.6, 0, 1);
  // Each tier appears 0.6s after the previous, starting at 1.6s
  const tierShow = (i) => clamp((time - (1.6 + i * 0.5)) / 0.5, 0, 1);
  // Connecting line draws from t=4.5 to t=6.5
  const lineP = clamp((time - 4.5) / 2.0, 0, 1);
  // Caption
  const phaseCaption = clamp((time - 6.8) / 0.5, 0, 1);
  // Featured card emphasis pulse
  const featuredEmph = clamp((time - 5.0) / 0.6, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={28} />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: 60,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(phaseHeader),
        }}
      >
        trust · <span style={{ color: EMBER }}>5 tiers</span>
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 60,
          right: 60,
          fontFamily: 'Instrument Serif, serif',
          fontSize: 44,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color: INK,
          opacity: Easing.easeInOutSine(phaseTitle),
          transform: `translateY(${(1 - easeOutSoftBack(phaseTitle)) * 18}px)`,
        }}
      >
        Trust, <em style={{ color: EMBER }}>earned in steps</em>.
      </div>

      {/* Connecting line */}
      <svg
        width={1080}
        height={4}
        style={{
          position: 'absolute',
          left: 60,
          top: 305,
          overflow: 'visible',
        }}
      >
        <line
          x1={0}
          y1={2}
          x2={1080 * lineP}
          y2={2}
          stroke={EMBER}
          strokeWidth={2}
          strokeDasharray="4 6"
        />
      </svg>

      {/* 5 tier cards in a row */}
      {TIER_DATA.map((t, i) => {
        const show = tierShow(i);
        const isFeatured = t.id === 't4';
        const emph = isFeatured ? easeOutSoftBack(featuredEmph) : 0;
        const left = 60 + i * 215;
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left,
              top: 200,
              width: 195,
              opacity: Easing.easeInOutSine(show),
              transform: `translateY(${(1 - easeOutSoftBack(show)) * 28}px) scale(${1 + emph * 0.04})`,
              transformOrigin: 'center',
            }}
          >
            {/* Big number circle */}
            <div
              style={{
                width: 80,
                height: 80,
                background: isFeatured ? t.color : 'transparent',
                border: `2px solid ${t.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontFamily: 'Instrument Serif, serif',
                fontSize: 48,
                letterSpacing: '-0.02em',
                color: isFeatured ? BONE : t.color,
                lineHeight: 1,
              }}
            >
              {t.number}
            </div>
            {/* Label */}
            <div
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 26,
                letterSpacing: '-0.025em',
                color: isFeatured ? EMBER : INK,
                textAlign: 'center',
                lineHeight: 1.1,
                fontStyle: isFeatured ? 'italic' : 'normal',
              }}
            >
              {t.label}
            </div>
            {/* Sub */}
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: INK2,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {t.sub}
            </div>
          </div>
        );
      })}

      {/* Caption */}
      {phaseCaption > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            left: 60,
            right: 60,
            textAlign: 'center',
            fontFamily: 'Instrument Serif, serif',
            fontSize: 26,
            letterSpacing: '-0.02em',
            color: INK2,
            opacity: Easing.easeInOutSine(phaseCaption),
            transform: `translateY(${(1 - easeOutSoftBack(phaseCaption)) * 12}px)`,
          }}
        >
          No badge by default. <em style={{ color: EMBER }}>Earn each one</em>.
        </div>
      )}

      <FinalLogoOverlay visibleAfter={12.6} />
    </div>
  );
}

// ─── SceneNumbersVertical (1080×1920, 9s) ───────────────────────────────────
// Big stat reveal for TikTok / Insta Reels. 4 dramatic numbers each take the
// full screen for ~1.5s, transitioning fast for thumb-stopping power.

const STAT_DATA = [
  { value: '100,000',  unit: '+',     sub: 'SKILL.md & CLAUDE.md indexed',     color: EMBER },
  { value: '3',        unit: '',      sub: 'frontier judges · zero human bias', color: AZURE },
  { value: 'every 4h', unit: '',      sub: 'bench cycle, ranks shift daily',   color: SAGE  },
  { value: '0',        unit: '',      sub: 'hidden disagreements',             color: AMBER },
];

function SceneNumbersVertical() {
  const time = useTime();

  // Each stat shows for ~2s with 0.3s crossfade
  const statDur = 1.9;
  const statGap = 0.0; // back-to-back
  const statStarts = STAT_DATA.map((_, i) => 0.4 + i * statDur);

  const statVis = (i) => {
    const start = statStarts[i];
    const end = start + statDur;
    const fadeIn = clamp((time - start) / 0.3, 0, 1);
    const fadeOut = clamp((end - time) / 0.3, 0, 1);
    return Math.min(fadeIn, fadeOut);
  };

  const phaseHeader = clamp((time - 0.0) / 0.4, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BONE, overflow: 'hidden' }}>
      <PatternDots size={36} />

      {/* Persistent header */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 22,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: INK2,
          opacity: Easing.easeInOutSine(phaseHeader),
        }}
      >
        versuz · <span style={{ color: EMBER }}>by the numbers</span>
      </div>

      {/* Stat sequence */}
      {STAT_DATA.map((s, i) => {
        const vis = statVis(i);
        if (vis <= 0) return null;
        const settledIn = clamp((time - statStarts[i]) / 0.5, 0, 1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: vis,
              padding: '0 80px',
            }}
          >
            {/* Tiny eyebrow */}
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 16,
                letterSpacing: '0.30em',
                textTransform: 'uppercase',
                color: INK2,
                marginBottom: 40,
                opacity: Easing.easeInOutSine(settledIn),
              }}
            >
              <span style={{ display: 'inline-block', width: 14, height: 14, background: s.color, marginRight: 12, verticalAlign: 'middle' }} />
              {String(i + 1).padStart(2, '0')} / 04
            </div>
            {/* Big number */}
            <div
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: s.value.length > 4 ? 220 : 360,
                letterSpacing: '-0.05em',
                lineHeight: 1,
                color: s.color,
                fontVariantNumeric: 'tabular-nums',
                fontStyle: 'italic',
                textAlign: 'center',
                transform: `scale(${0.85 + 0.15 * easeOutSoftBack(settledIn)})`,
                transformOrigin: 'center',
              }}
            >
              {s.value}
              {s.unit && (
                <span style={{ color: INK, fontStyle: 'normal', fontSize: 200 }}>{s.unit}</span>
              )}
            </div>
            {/* Sub */}
            <div
              style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 44,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: INK,
                textAlign: 'center',
                marginTop: 60,
                opacity: Easing.easeInOutSine(clamp((settledIn - 0.2) / 0.8, 0, 1)),
                transform: `translateY(${(1 - easeOutSoftBack(settledIn)) * 14}px)`,
                maxWidth: 800,
              }}
            >
              {s.sub}
            </div>
          </div>
        );
      })}

      <FinalLogoOverlay visibleAfter={8.3} />
    </div>
  );
}

// ─── Register ───────────────────────────────────────────────────────────────

window.VERSUZ_SCENES = window.VERSUZ_SCENES || {};
Object.assign(window.VERSUZ_SCENES, {
  versusVertical: {
    title: 'Versus (vertical)', subtitle: 'Skill A vs Skill B — stars vs score',
    width: 1080, height: 1920, duration: 7,
    Component: SceneVersusVertical, format: '9:16 · 7s', group: 'TikTok / Insta',
  },
  versusLinkedIn: {
    title: 'Versus (LinkedIn)', subtitle: 'Horizontal A vs B compare',
    width: 1200, height: 627, duration: 9,
    Component: SceneVersusLinkedIn, format: '1.91:1 · 9s', group: 'LinkedIn',
  },
  climbLinkedIn: {
    title: 'Climb (LinkedIn)', subtitle: '#47 → #3 with sparkline horizontal',
    width: 1200, height: 627, duration: 9,
    Component: SceneClimbLinkedIn, format: '1.91:1 · 9s', group: 'LinkedIn',
  },
  judgesVertical: {
    title: '3 Judges (vertical)', subtitle: 'Haiku · DeepSeek · GPT-5 stacked',
    width: 1080, height: 1920, duration: 8,
    Component: SceneJudgesVertical, format: '9:16 · 8s', group: 'TikTok / Insta',
  },
  judgesLinkedIn: {
    title: '3 Judges (LinkedIn)', subtitle: 'Horizontal with rationale',
    width: 1200, height: 627, duration: 9,
    Component: SceneJudgesLinkedIn, format: '1.91:1 · 9s', group: 'LinkedIn',
  },
  terminalStory: {
    title: 'Terminal · end-to-end',
    subtitle: 'Search → Why → Install → Submit · narrative for LinkedIn',
    width: 1200, height: 627, duration: 19,
    Component: SceneTerminalStory, format: '1.91:1 · 19s', group: 'LinkedIn',
  },
  boostLinkedIn: {
    title: 'Boost · paid promotion',
    subtitle: 'Skill rises from #43 to #1 — $4.99 / 30 days featured',
    width: 1200, height: 627, duration: 13,
    Component: SceneBoostLinkedIn, format: '1.91:1 · 13s', group: 'LinkedIn',
  },
  tiersLinkedIn: {
    title: '5 trust tiers',
    subtitle: 'Unverified → Claimed → Verified → Reviewed → Featured',
    width: 1200, height: 627, duration: 13,
    Component: SceneTiersLinkedIn, format: '1.91:1 · 13s', group: 'LinkedIn',
  },
  numbersVertical: {
    title: 'By the numbers',
    subtitle: '100k · 3 · every 4h · 0 hidden — dramatic stat reveal',
    width: 1080, height: 1920, duration: 9,
    Component: SceneNumbersVertical, format: '9:16 · 9s', group: 'TikTok / Insta',
  },
});
