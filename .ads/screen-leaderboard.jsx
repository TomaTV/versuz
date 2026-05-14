// Leaderboard — editorial benchmark table (subq.ai inspired)

const Leaderboard = ({ navigate }) => {
  const [category, setCategory] = React.useState('all');
  const [sort, setSort] = React.useState({ key: 'rank', dir: 'asc' });
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    let rows = SKILLS;
    if (category !== 'all') rows = rows.filter(r => r.category.toLowerCase() === category);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.author.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const k = sort.key, av = a[k], bv = b[k];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [category, sort, query]);

  return (
    <div data-screen-label="02 Leaderboard" style={{ position: 'relative' }}>
      {/* Header */}
      <section style={{ padding: '80px 64px 48px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64 }}>
          <FigureNumber n="02" label="Standings" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Eyebrow>Cycle #184 · season 02</Eyebrow>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-display)',
              fontSize: 'clamp(56px, 7vw, 120px)', fontWeight: 400, lineHeight: 0.95,
              letterSpacing: '-0.035em', color: 'var(--fg)',
            }}>
              A leader across <em style={{ color: 'var(--accent)' }}>every</em> task suite.
            </h1>
            <p style={{
              margin: 0, fontFamily: 'var(--font-display)', fontSize: 22,
              lineHeight: 1.4, letterSpacing: '-0.01em', color: 'var(--fg-muted)',
              maxWidth: 640,
            }}>
              247 public Claude skills, ranked by Bayesian Elo over <em>10,420</em> head-to-head battles.
              The leading column is <em style={{ color: 'var(--accent)' }}>highlighted</em>.
            </p>
          </div>
        </div>
      </section>

      {/* Bench-table preview — like subq.ai */}
      <section style={{ padding: '0 64px 80px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64 }}>
          <Eyebrow>Benchmarks</Eyebrow>
          <BenchmarkMatrix />
        </div>
      </section>

      {/* Filters */}
      <section style={{ padding: '0 64px 24px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64,
          paddingTop: 32, borderTop: '1px solid var(--rule)',
        }}>
          <Eyebrow>Filter</Eyebrow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <CategoryTabs categories={CATEGORIES} value={category} onChange={setCategory} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid var(--rule)', padding: '8px 0', minWidth: 240,
            }}>
              <span style={{ color: 'var(--fg-muted)', fontSize: 14 }}>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="search by name or author"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--fg)', letterSpacing: '0.04em',
                }} />
            </div>
          </div>
        </div>
      </section>

      {/* Full table */}
      <section style={{ padding: '0 64px 80px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64 }}>
          <div></div>
          <div>
            {/* head */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr 120px 100px 140px 100px 32px',
              gap: 24, padding: '16px 24px',
              borderTop: '1px solid var(--rule-strong)',
              borderBottom: '1px solid var(--rule)',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--fg-muted)', letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}>
              <span>Rank</span>
              <span>Skill</span>
              <span style={{ textAlign: 'right' }}>Elo</span>
              <span style={{ textAlign: 'right' }}>7d Δ</span>
              <span>Win rate</span>
              <span style={{ textAlign: 'right' }}>Battles</span>
              <span></span>
            </div>

            {/* rows */}
            {filtered.map((s) => {
              const isTop = s.rank === 1;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate('detail', s.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr 120px 100px 140px 100px 32px',
                    gap: 24, padding: '20px 24px',
                    width: '100%',
                    background: isTop ? 'var(--leader-tint)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--rule)',
                    cursor: 'pointer', textAlign: 'left',
                    color: 'inherit', alignItems: 'center',
                    transition: 'background .15s ease',
                  }}
                  onMouseEnter={(e) => { if (!isTop) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { if (!isTop) e.currentTarget.style.background = 'transparent'; }}
                >
                  <RankBadge rank={s.rank} size="md" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <SkillGlyph id={s.id} size={28} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 22,
                        fontWeight: 400, color: 'var(--fg)',
                        letterSpacing: '-0.02em', lineHeight: 1.05,
                        fontStyle: isTop ? 'italic' : 'normal',
                      }}>{s.name}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--fg-muted)', letterSpacing: '0.04em',
                      }}>{s.author} · {s.category}</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 22,
                    fontWeight: 400, color: 'var(--fg)',
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}>{s.elo}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: s.delta > 0 ? 'var(--accent)' : s.delta < 0 ? 'var(--danger)' : 'var(--fg-muted)',
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  }}>{s.delta > 0 ? '↗ +' : s.delta < 0 ? '↘ ' : '— '}{s.delta !== 0 && Math.abs(s.delta)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <HairBar value={s.winRate} color={s.winRate > 0.6 ? 'var(--accent)' : 'var(--fg-muted)'} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'var(--fg)', width: 36, textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}>{(s.winRate * 100).toFixed(0)}%</span>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: 'var(--fg-muted)', textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{s.runs.toLocaleString()}</span>
                  <span style={{ color: 'var(--fg-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14 }}>↗</span>
                </button>
              );
            })}

            <div style={{
              padding: '24px 0',
              display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--fg-muted)', letterSpacing: '0.04em',
            }}>
              <span>n/r = no result this cycle · * = cold-start (under 10 battles)</span>
              <span>Methodology v04 · Bayesian Elo · K=32 · prior 1400</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Subq-style benchmark table — rows = task suites, columns = top 5 skills, leader column tinted
const BenchmarkMatrix = () => {
  const cols = SKILLS.slice(0, 5); // top 5 skills as columns
  const leader = cols[0];
  const rows = [
    { id: 'document', name: 'Document Suite', sub: 'PDF, DOCX, OCR · 8 tasks', scores: { 'pdf-extract': 0.871, 'sql-genie': 0.42, 'csv-surgeon': 0.51, 'web-scry': 0.38, 'pdf-fast': 0.642 }},
    { id: 'sql', name: 'SQL Suite', sub: 'Query, schema, repair · 6 tasks', scores: { 'pdf-extract': 0.31, 'sql-genie': 0.913, 'csv-surgeon': 0.52, 'web-scry': 0.18, 'pdf-fast': 0.22 }},
    { id: 'data', name: 'Data Wrangling', sub: 'CSV, pandas, jq · 7 tasks', scores: { 'pdf-extract': 0.41, 'sql-genie': 0.62, 'csv-surgeon': 0.881, 'web-scry': 0.29, 'pdf-fast': 0.36 }},
    { id: 'web', name: 'Web Tasks', sub: 'Scrape, summarise · 5 tasks', scores: { 'pdf-extract': 0.22, 'sql-genie': 0.31, 'csv-surgeon': 0.41, 'web-scry': 0.829, 'pdf-fast': 0.14 }},
    { id: 'overall', name: 'Overall', sub: 'Weighted average · 30 tasks', scores: { 'pdf-extract': 0.847, 'sql-genie': 0.612, 'csv-surgeon': 0.594, 'web-scry': 0.412, 'pdf-fast': 0.408 }},
  ];

  return (
    <div style={{
      border: '1px solid var(--rule-strong)',
      background: 'var(--surface)',
      position: 'relative',
    }}>
      {/* Bracket corners */}
      {[
        { top: -1, left: -1, borderTop: '2px solid var(--fg)', borderLeft: '2px solid var(--fg)' },
        { top: -1, right: -1, borderTop: '2px solid var(--fg)', borderRight: '2px solid var(--fg)' },
        { bottom: -1, left: -1, borderBottom: '2px solid var(--fg)', borderLeft: '2px solid var(--fg)' },
        { bottom: -1, right: -1, borderBottom: '2px solid var(--fg)', borderRight: '2px solid var(--fg)' },
      ].map((s, i) => (
        <span key={i} aria-hidden style={{ position: 'absolute', width: 16, height: 16, ...s, pointerEvents: 'none' }} />
      ))}

      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `2fr repeat(${cols.length}, 1fr)`,
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{
          padding: '20px 24px',
          fontFamily: 'var(--font-display)', fontSize: 22,
          fontWeight: 400, color: 'var(--fg)', letterSpacing: '-0.01em',
        }}>Benchmarks</div>
        {cols.map((s) => {
          const isLeader = s.id === leader.id;
          return (
            <div key={s.id} style={{
              padding: '20px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
              borderLeft: '1px solid var(--rule)',
              background: isLeader ? 'var(--leader-tint-strong)' : 'transparent',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--fg)', letterSpacing: '0.02em',
              fontWeight: isLeader ? 500 : 400,
            }}>
              <SkillGlyph id={s.id} size={16} />
              <span style={{ fontStyle: isLeader ? 'italic' : 'normal' }}>{s.name}</span>
            </div>
          );
        })}
      </div>

      {/* Rows */}
      {rows.map((row, ri) => {
        const max = Math.max(...cols.map(c => row.scores[c.id] ?? 0));
        return (
          <div key={row.id} style={{
            display: 'grid',
            gridTemplateColumns: `2fr repeat(${cols.length}, 1fr)`,
            borderBottom: ri === rows.length - 1 ? 'none' : '1px solid var(--rule)',
            alignItems: 'stretch',
          }}>
            <div style={{
              padding: '24px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 20,
                fontWeight: 400, color: 'var(--fg)',
                letterSpacing: '-0.01em', lineHeight: 1.1,
              }}>{row.name}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--fg-muted)', letterSpacing: '0.04em',
              }}>{row.sub}</span>
            </div>
            {cols.map((c) => {
              const v = row.scores[c.id];
              const isWin = v === max;
              const isLeaderCol = c.id === leader.id;
              return (
                <div key={c.id} style={{
                  padding: '24px 16px',
                  borderLeft: '1px solid var(--rule)',
                  background: isLeaderCol ? 'var(--leader-tint-strong)' : (isWin ? 'var(--leader-tint)' : 'transparent'),
                  display: 'flex', alignItems: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 16,
                  color: v == null ? 'var(--fg-muted)' : 'var(--fg)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: isWin ? 600 : 400,
                  letterSpacing: '0.02em',
                }}>
                  {v == null ? 'n/r' : `${(v * 100).toFixed(1)}%`}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

window.Leaderboard = Leaderboard;
window.BenchmarkMatrix = BenchmarkMatrix;
