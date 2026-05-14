// Skill detail — editorial dossier

const SkillDetail = ({ skillId, navigate }) => {
  const detail = SKILL_DETAIL;
  const recent = [
    { vs: 'pdf-fast', result: 'W', score: '8.71 / 6.42', delta: +12, judge: 'Opus 4.7' },
    { vs: 'docx-rewrite', result: 'W', score: '8.41 / 7.02', delta: +9, judge: 'GPT-5' },
    { vs: 'pdf-ocr', result: 'W', score: '8.92 / 5.83', delta: +14, judge: 'Gemini 2.5' },
    { vs: 'sql-genie', result: 'L', score: '7.14 / 8.31', delta: -8, judge: 'Opus 4.7' },
    { vs: 'csv-surgeon', result: 'W', score: '8.05 / 7.62', delta: +5, judge: 'GPT-5' },
  ];

  return (
    <div data-screen-label="03 Skill Detail" style={{ position: 'relative' }}>
      {/* Hero */}
      <section style={{
        position: 'relative', padding: '64px 64px 48px',
        maxWidth: 1440, margin: '0 auto',
      }}>
        {/* Breadcrumb */}
        <button onClick={() => navigate('leaderboard')} style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
          marginBottom: 64,
        }}>
          ← Standings
        </button>

        {/* Decorative number */}
        <div aria-hidden style={{
          position: 'absolute', right: 64, top: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 600, fontWeight: 400, fontStyle: 'italic',
          color: 'var(--accent)', opacity: 0.05,
          lineHeight: 0.8, letterSpacing: '-0.06em',
          pointerEvents: 'none', userSelect: 'none',
        }}>{String(detail.rank).padStart(2, '0')}</div>

        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FigureNumber n={String(detail.rank).padStart(2, '0')} label={detail.category} />
            <RankBadge rank={detail.rank} size="lg" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{detail.author}</span>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(72px, 10vw, 168px)',
              fontWeight: 400, lineHeight: 0.9,
              letterSpacing: '-0.045em', color: 'var(--fg)',
              fontStyle: detail.rank === 1 ? 'italic' : 'normal',
            }}>{detail.name}</h1>
            <p style={{
              margin: 0, fontFamily: 'var(--font-display)',
              fontSize: 22, lineHeight: 1.4, letterSpacing: '-0.01em',
              color: 'var(--fg)', maxWidth: 640, fontWeight: 400,
            }}>{detail.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <a href="#" className="vz-btn vz-btn-primary">
                Install <span style={{ fontFamily: 'var(--font-mono)' }}>↗</span>
              </a>
              <a href="#" className="vz-link">
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{'</>'}</span>
                <span>{detail.github}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{
        padding: '0 64px 80px',
        maxWidth: 1440, margin: '0 auto',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64,
        }}>
          <div></div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid var(--rule)',
            borderBottom: '1px solid var(--rule)',
          }}>
            {[
              ['Elo', detail.elo, 'tabular'],
              ['Win rate', `${(detail.winRate * 100).toFixed(0)}%`],
              ['Battles', detail.battles, 'tabular'],
              ['Installs', (detail.installs / 1000).toFixed(1) + 'k'],
            ].map(([label, val], i) => (
              <div key={label} style={{
                padding: '32px 24px',
                borderRight: i < 3 ? '1px solid var(--rule)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>{label}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 56,
                  fontWeight: 400, color: 'var(--fg)',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
                  lineHeight: 0.9,
                }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div></div>
          <div style={{
            paddingTop: 24,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <Eyebrow>7-day Elo trajectory</Eyebrow>
            <Sparkline values={detail.elo7d} />
          </div>
        </div>
      </section>

      {/* Judges */}
      <section style={{
        padding: '80px 64px',
        maxWidth: 1440, margin: '0 auto',
        borderTop: '1px solid var(--rule)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64,
        }}>
          <FigureNumber n="01" label="Rationale" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <h2 style={{
              margin: '0 0 48px',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 5vw, 80px)',
              fontWeight: 400, lineHeight: 0.95,
              letterSpacing: '-0.035em', color: 'var(--fg)',
            }}>
              Three <em style={{ color: 'var(--accent)' }}>judges</em> weighed in.
            </h2>
            {detail.judges.map((j, i) => (
              <div key={j.name} style={{
                display: 'grid', gridTemplateColumns: '1fr 2fr',
                gap: 64, padding: '40px 0',
                borderTop: '1px solid var(--rule)',
                borderBottom: i === detail.judges.length - 1 ? '1px solid var(--rule)' : 'none',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
                  }}>weight {j.weight.toFixed(2)}</span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 36,
                    fontWeight: 400, letterSpacing: '-0.02em',
                    color: 'var(--fg)', lineHeight: 1,
                  }}>{j.name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 72,
                      fontStyle: 'italic', fontWeight: 400,
                      color: 'var(--accent)', letterSpacing: '-0.04em',
                      lineHeight: 0.9, fontVariantNumeric: 'tabular-nums',
                    }}>{j.score.toFixed(2)}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'var(--fg-muted)', letterSpacing: '0.04em',
                    }}>/ 1.00</span>
                  </div>
                </div>
                <p style={{
                  margin: 0, fontFamily: 'var(--font-display)',
                  fontSize: 22, lineHeight: 1.45,
                  color: 'var(--fg)', letterSpacing: '-0.01em',
                  fontStyle: 'italic',
                }}>“{j.verdict}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent + Tasks */}
      <section style={{
        padding: '80px 64px 120px',
        maxWidth: 1440, margin: '0 auto',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr', gap: 64,
        }}>
          <FigureNumber n="02" label="History" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            {/* Recent battles */}
            <div>
              <h3 style={{
                margin: '0 0 24px',
                fontFamily: 'var(--font-display)', fontSize: 32,
                fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--fg)',
              }}>Last 5 battles</h3>
              <div>
                {recent.map((b, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr auto auto',
                    gap: 12, alignItems: 'center', padding: '14px 0',
                    borderTop: '1px solid var(--rule)',
                    borderBottom: i === recent.length - 1 ? '1px solid var(--rule)' : 'none',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                  }}>
                    <span style={{
                      color: b.result === 'W' ? 'var(--accent)' : 'var(--danger)',
                      fontWeight: 600,
                    }}>{b.result}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 16,
                        color: 'var(--fg)', letterSpacing: '-0.01em',
                      }}>vs {b.vs}</span>
                      <span style={{ color: 'var(--fg-muted)', fontSize: 10 }}>by {b.judge}</span>
                    </div>
                    <span style={{
                      color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums',
                    }}>{b.score}</span>
                    <span style={{
                      color: b.delta > 0 ? 'var(--accent)' : 'var(--danger)',
                      fontVariantNumeric: 'tabular-nums', width: 40, textAlign: 'right',
                    }}>{b.delta > 0 ? '+' : ''}{b.delta}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per task */}
            <div>
              <h3 style={{
                margin: '0 0 24px',
                fontFamily: 'var(--font-display)', fontSize: 32,
                fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--fg)',
              }}>Per-task scores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {detail.taskScores.slice(0, 8).map((t, i) => {
                  const col = t.status === 'pass' ? 'var(--accent)' :
                              t.status === 'partial' ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={t.id} style={{
                      display: 'grid', gridTemplateColumns: '24px 1fr 100px 48px',
                      gap: 12, alignItems: 'center', padding: '12px 0',
                      borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
                      borderBottom: '1px solid var(--rule)',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                    }}>
                      <span style={{ color: 'var(--fg-muted)' }}>{String(t.id).padStart(2, '0')}</span>
                      <span style={{ color: 'var(--fg)' }}>{t.name}</span>
                      <HairBar value={t.score} color={col} />
                      <span style={{
                        color: col, textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums', fontWeight: 500,
                      }}>{t.score.toFixed(2)}</span>
                    </div>
                  );
                })}
                <span style={{
                  marginTop: 12,
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>+ 22 more · task suite v04</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Sparkline = ({ values, height = 64 }) => {
  const w = 800;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return [x, y];
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      {pts.map(([x, y], i) => {
        const last = i === pts.length - 1;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={last ? 4 : 2}
              fill={last ? 'var(--accent)' : 'var(--fg-muted)'} />
            {last && (
              <text x={x - 8} y={y - 12} textAnchor="end"
                fontFamily="var(--font-mono)" fontSize="11"
                fill="var(--accent)">
                {values[values.length - 1]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

window.SkillDetail = SkillDetail;
