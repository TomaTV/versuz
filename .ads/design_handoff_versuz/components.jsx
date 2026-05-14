// Versuz UI components — luxury edition

// Rank — small ordinal pill, no shield. Just type + a rule.
const RankBadge = ({ rank, size = 'md' }) => {
  const isTop = rank <= 3;
  const sizes = {
    sm: { num: 14, pad: '4px 10px' },
    md: { num: 18, pad: '6px 12px' },
    lg: { num: 24, pad: '8px 14px' },
  }[size];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      color: isTop ? 'var(--accent)' : 'var(--fg)',
    }}>
      <span style={{
        fontSize: 9,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--fg-muted)',
      }}>NO.</span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: sizes.num,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        fontStyle: isTop ? 'italic' : 'normal',
      }}>
        {String(rank).padStart(2, '0')}
      </span>
    </span>
  );
};

// Score bar — minimal hairline with end caps
const HairBar = ({ value, max = 1, color = 'var(--accent)', height = 2 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{
      position: 'relative', height: height + 6, width: '100%',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        width: '100%', height,
        background: 'var(--rule)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          height: '100%', width: `${pct}%`,
          background: color,
        }} />
        {/* moving tick at value */}
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 1px)`, top: -3,
          width: 2, height: height + 6,
          background: color,
        }} />
      </div>
    </div>
  );
};

// Skill row — editorial table-row style. Used in landing's mini-leaderboard.
const SkillRow = ({ skill, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'grid',
      gridTemplateColumns: '64px 1fr 90px 90px 80px',
      alignItems: 'center',
      gap: 24,
      padding: '24px 0',
      width: '100%',
      background: 'transparent',
      border: 'none',
      borderTop: '1px solid var(--rule)',
      cursor: 'pointer',
      textAlign: 'left',
      color: 'inherit',
      transition: 'background .15s ease, padding .2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'var(--surface-hover)';
      e.currentTarget.style.paddingLeft = '12px';
      e.currentTarget.style.paddingRight = '12px';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.paddingLeft = '0';
      e.currentTarget.style.paddingRight = '0';
    }}
  >
    <RankBadge rank={skill.rank} size="md" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28, fontWeight: 400,
        letterSpacing: '-0.02em', color: 'var(--fg)',
        lineHeight: 1.05,
      }}>
        {skill.name}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--fg-muted)', letterSpacing: '0.04em',
      }}>
        {skill.author} · {skill.category}
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>Elo</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 22,
        fontWeight: 500, color: 'var(--fg)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>{skill.elo}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>Win rate</span>
      <HairBar value={skill.winRate} color={skill.winRate > 0.6 ? 'var(--accent)' : 'var(--fg-muted)'} />
    </div>
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: skill.delta > 0 ? 'var(--accent)' : skill.delta < 0 ? 'var(--danger)' : 'var(--fg-muted)',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {skill.delta > 0 ? '↗ +' : skill.delta < 0 ? '↘ ' : '— '}{skill.delta !== 0 && Math.abs(skill.delta)}
    </span>
  </button>
);

// Battle visualization — large editorial centerpiece
const BattleSpread = ({ a, b, winner, rationale }) => (
  <div style={{ position: 'relative' }}>
    {/* Top meta */}
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: 16, borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--font-mono)', fontSize: 10,
      color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
    }}>
      <span>Battle / 04821 · pdf-extract suite</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        Judged · 3/3
      </span>
    </div>

    {/* Matchup */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: 0,
      padding: '40px 0',
      alignItems: 'center',
    }}>
      <BattleSide skill={a} won={winner === 'a'} />

      {/* center divider */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 24px', position: 'relative',
        minHeight: 200,
      }}>
        <div style={{ position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 1, height: '100%', background: 'var(--rule)' }} />
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 64, fontStyle: 'italic', fontWeight: 400,
          color: 'var(--accent)', letterSpacing: '-0.04em',
          background: 'var(--bg)', padding: '0 8px',
          position: 'relative', zIndex: 1, lineHeight: 0.9,
        }}>vs</div>
      </div>

      <BattleSide skill={b} won={winner === 'b'} alignRight />
    </div>

    {/* Rationale */}
    {rationale && (
      <div style={{
        padding: '24px 0 0', borderTop: '1px solid var(--rule)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 12,
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          <span>Rationale · {rationale.judge}</span>
          <span>weighted 0.34</span>
        </div>
        <p style={{
          margin: 0,
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
          fontStyle: 'italic', color: 'var(--fg)',
          letterSpacing: '-0.01em', lineHeight: 1.4,
          maxWidth: 720,
        }}>
          “{rationale.text}”
        </p>
      </div>
    )}
  </div>
);

const BattleSide = ({ skill, won, alignRight }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 16,
    alignItems: alignRight ? 'flex-end' : 'flex-start',
    textAlign: alignRight ? 'right' : 'left',
    opacity: won ? 1 : 0.5,
    transition: 'opacity .3s ease',
  }}>
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--fg-muted)', letterSpacing: '0.16em',
        textTransform: 'uppercase', marginBottom: 6,
      }}>{skill.author}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 44, fontWeight: 400,
        letterSpacing: '-0.025em', lineHeight: 1.05,
        color: 'var(--fg)',
        fontStyle: won ? 'italic' : 'normal',
        whiteSpace: 'nowrap',
      }}>{skill.name}</div>
    </div>
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      alignItems: alignRight ? 'flex-end' : 'flex-start',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>{won ? '— winner' : 'score'}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 56,
        fontWeight: 400, color: won ? 'var(--accent)' : 'var(--fg)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em',
        lineHeight: 0.9,
      }}>{skill.score}</span>
    </div>
    <div style={{ width: '60%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {skill.judges.map((j) => (
        <div key={j.name} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flexDirection: alignRight ? 'row-reverse' : 'row',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--fg-muted)',
        }}>
          <span style={{ width: 70, textAlign: alignRight ? 'right' : 'left' }}>{j.name}</span>
          <div style={{ flex: 1 }}>
            <HairBar value={j.score} color={won ? 'var(--accent)' : 'var(--fg-muted)'} />
          </div>
          <span style={{ width: 32, textAlign: alignRight ? 'left' : 'right', color: 'var(--fg)' }}>
            {j.score.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Category filter — quiet underlined tabs
const CategoryTabs = ({ categories, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
    {categories.map((c) => {
      const active = value === c.id;
      return (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          style={{
            background: 'transparent', border: 'none', padding: '6px 0',
            cursor: 'pointer',
            color: active ? 'var(--fg)' : 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            letterSpacing: '0.04em',
            position: 'relative',
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
          }}
        >
          {c.label}
          <span style={{ fontSize: 10, color: 'var(--fg-muted)', opacity: active ? 1 : 0.5 }}>
            {c.count}
          </span>
          {active && <span style={{
            position: 'absolute', left: 0, right: 0, bottom: -1, height: 1,
            background: 'var(--accent)',
          }} />}
        </button>
      );
    })}
  </div>
);

Object.assign(window, {
  RankBadge, HairBar, SkillRow, BattleSpread, CategoryTabs,
});
