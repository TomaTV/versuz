// Landing screen — luxury edition

const Landing = ({ navigate, headline, theme }) => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toUTCString().slice(17, 25);

  return (
    <div data-screen-label="01 Landing" style={{ position: 'relative' }}>

      {/* === HERO ============================================ */}
      <section style={{
        position: 'relative',
        padding: '120px 64px 80px',
        maxWidth: 1440, margin: '0 auto',
        minHeight: 'calc(100vh - 72px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        gap: 80,
        overflow: 'hidden',
      }}>
        {/* === SCATTERED GRAPHIC SHAPES ============== */}
        {/* Stacked stripes — top right */}
        <svg aria-hidden width="220" height="120" viewBox="0 0 220 120" style={{
          position: 'absolute', right: 64, top: 92, pointerEvents: 'none',
        }}>
          <rect x="0" y="0" width="220" height="14" fill="var(--fg)" opacity="0.85" />
          <rect x="40" y="22" width="180" height="14" fill="var(--accent)" />
          <rect x="0" y="44" width="140" height="14" fill="var(--fg)" opacity="0.4" />
          <rect x="80" y="66" width="140" height="14" fill="var(--fg)" opacity="0.85" />
          <rect x="20" y="88" width="100" height="14" fill="var(--accent)" opacity="0.5" />
        </svg>
        {/* Big solid disc — far right edge mid */}
        <div aria-hidden style={{
          position: 'absolute', right: -120, top: 360, width: 320, height: 320,
          borderRadius: '50%', background: 'var(--accent)', opacity: 0.92,
          pointerEvents: 'none',
        }} />
        {/* Disc inner cut */}
        <div aria-hidden style={{
          position: 'absolute', right: -40, top: 440, width: 160, height: 160,
          borderRadius: '50%', background: 'var(--bg)',
          pointerEvents: 'none',
        }} />
        {/* Wedge — left mid */}
        <svg aria-hidden width="180" height="180" viewBox="0 0 180 180" style={{
          position: 'absolute', left: -40, top: 280, pointerEvents: 'none',
          transform: 'rotate(8deg)',
        }}>
          <path d="M 0 0 L 180 0 L 0 180 Z" fill="var(--fg)" />
        </svg>
        {/* Vermillion vertical bar — far left */}
        <div aria-hidden style={{
          position: 'absolute', left: 24, top: 140, width: 4, height: 120,
          background: 'var(--accent)', pointerEvents: 'none',
        }} />
        {/* Stencil dots cluster — bottom right of hero */}
        <svg aria-hidden width="80" height="80" viewBox="0 0 80 80" style={{
          position: 'absolute', right: 280, bottom: 240, pointerEvents: 'none', opacity: 0.85,
        }}>
          {[0,1,2,3].map(i => [0,1,2,3].map(j => (
            <circle key={`${i}-${j}`} cx={8 + j * 22} cy={8 + i * 22} r="2.5" fill="var(--fg)" />
          )))}
        </svg>

        {/* Top eyebrow row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          <Eyebrow>An open arena for Claude skills</Eyebrow>
          <span>{timeStr} UTC · live</span>
        </div>

        {/* Big headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(72px, 11vw, 168px)',
            fontWeight: 400,
            letterSpacing: '-0.045em',
            lineHeight: 0.92,
            margin: 0,
            color: 'var(--fg)',
            maxWidth: 1200,
          }}>
            {headline.line1}
            <br />
            {headline.line2.map((part, i) =>
              part.accent
                ? <em key={i} style={{
                    fontStyle: 'italic',
                    color: 'var(--accent)',
                    fontWeight: 400,
                  }}>{part.text}</em>
                : <React.Fragment key={i}>{part.text}</React.Fragment>
            )}
          </h1>
        </div>

        {/* Bottom row: subhead + CTA + meta */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: 64, alignItems: 'flex-end',
          paddingTop: 64,
          borderTop: '1px solid var(--rule)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <p style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 22, fontWeight: 400,
              lineHeight: 1.4, letterSpacing: '-0.01em',
              color: 'var(--fg)', maxWidth: 480,
            }}>
              An open benchmark for Claude skills, judged by{' '}
              <em style={{ color: 'var(--accent)' }}>Opus 4.7</em>,{' '}
              <em style={{ color: 'var(--accent)' }}>GPT-5</em>, and{' '}
              <em style={{ color: 'var(--accent)' }}>Gemini 2.5 Pro</em>. No marketing budget shortcut.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('leaderboard')} className="vz-btn vz-btn-primary">
                See standings
                <span style={{ fontFamily: 'var(--font-mono)' }}>↗</span>
              </button>
              <a href="#methodology" className="vz-link">
                <span>How it works</span>
              </a>
            </div>
          </div>

          {/* Stats column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Eyebrow>Season 02 · cycle #184</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
              {[
                { n: '247', l: 'skills' },
                { n: '30', l: 'tasks' },
                { n: '3', l: 'judges' },
              ].map((s) => (
                <div key={s.l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 56, fontWeight: 400, lineHeight: 0.9,
                    color: 'var(--fg)', letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{s.n}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--fg-muted)', letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                  }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Latest result mini card */}
          <button
            onClick={() => navigate('detail', 'pdf-extract')}
            style={{
              background: 'transparent',
              border: '1px solid var(--rule)',
              padding: 20,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'border-color .2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--rule)'}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>
              <span>Latest</span>
              <span style={{ color: 'var(--accent)' }}>↗</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.3,
              color: 'var(--fg)', letterSpacing: '-0.01em',
            }}>
              <em style={{ color: 'var(--accent)' }}>pdf-extract</em> defeated <span>pdf-fast</span> in the document arena, 8.71 to 6.42.
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--fg-muted)', letterSpacing: '0.04em',
            }}>
              2 minutes ago · all 3 judges
            </div>
          </button>
        </div>
      </section>

      {/* === FEATURED BATTLE ================================ */}
      <section style={{
        position: 'relative',
        padding: '120px 64px',
        maxWidth: 1440, margin: '0 auto',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64,
        }}>
          <div style={{ position: 'sticky', top: 100, alignSelf: 'flex-start',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <FigureNumber n="01" label="Today's Bout" />
          </div>
          <BattleSpread {...FEATURED_BATTLE} />
        </div>
      </section>

      {/* === METHOD ========================================= */}
      <section id="methodology" style={{
        position: 'relative',
        padding: '120px 64px',
        maxWidth: 1440, margin: '0 auto',
        borderTop: '1px solid var(--rule)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64, marginBottom: 64,
        }}>
          <FigureNumber n="02" label="Method" />
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 5.5vw, 88px)',
            fontWeight: 400, lineHeight: 0.95,
            letterSpacing: '-0.035em',
            color: 'var(--fg)', maxWidth: 1000,
          }}>
            How a skill <em style={{ color: 'var(--accent)' }}>earns a rank</em>.
          </h2>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64,
        }}>
          <div></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { n: '01', label: 'Submit', body: 'A skill is published to the public registry. Source, prompt, and tools must be open. Closed skills get a separate ranked tier.' },
              { n: '02', label: '30 Tasks', body: 'A fresh task split is drawn each cycle from a held-out suite. Each skill runs every task — no cherry-picking.' },
              { n: '03', label: '3 Judges', body: 'Outputs are evaluated independently by Claude Opus 4.7, GPT-5, and Gemini 2.5 Pro. Each gets a structured rubric.' },
              { n: '04', label: 'Score', body: 'Per-task scores are aggregated with a weighted average. Inter-judge disagreement is published verbatim.' },
              { n: '05', label: 'Rank', body: 'Bayesian Elo update over pairwise outcomes. Cold-start prior 1400. K-factor tapers from 32 to 8 with battle count.' },
            ].map((row, i) => (
              <div key={row.n} style={{
                display: 'grid',
                gridTemplateColumns: '60px 200px 1fr',
                gap: 32, alignItems: 'baseline',
                padding: '32px 0',
                borderTop: '1px solid var(--rule)',
                borderBottom: i === 4 ? '1px solid var(--rule)' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--fg-muted)', letterSpacing: '0.16em',
                }}>{row.n}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 32,
                  fontWeight: 400, color: 'var(--fg)',
                  letterSpacing: '-0.02em', lineHeight: 1,
                  fontStyle: i === 4 ? 'italic' : 'normal',
                }}>
                  {row.label}
                </span>
                <p style={{
                  margin: 0, fontSize: 16, color: 'var(--fg-muted)',
                  lineHeight: 1.55, maxWidth: 540,
                }}>{row.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === STANDINGS PREVIEW =============================== */}
      <section style={{
        position: 'relative',
        padding: '120px 64px',
        maxWidth: 1440, margin: '0 auto',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64, marginBottom: 48, alignItems: 'flex-end',
        }}>
          <FigureNumber n="03" label="Standings" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32 }}>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 4.5vw, 72px)',
              fontWeight: 400, lineHeight: 1,
              letterSpacing: '-0.03em', color: 'var(--fg)',
            }}>
              The top of the <em style={{ color: 'var(--accent)' }}>bracket</em>.
            </h2>
            <button onClick={() => navigate('leaderboard')} className="vz-link">
              <span>All 247 skills</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>↗</span>
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64,
        }}>
          <div></div>
          <BenchmarkMatrix />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64, marginTop: 16,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--fg-muted)', letterSpacing: '0.04em',
        }}>
          <div></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span>Highlighted column = current #1 across all suites · scores normalised 0–100%</span>
            <span>Updated every 24h</span>
          </div>
        </div>
      </section>

      {/* === SUBMIT CTA ===================================== */}
      <section style={{
        position: 'relative',
        padding: '160px 64px 120px',
        maxWidth: 1440, margin: '0 auto',
        borderTop: '1px solid var(--rule)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr',
          gap: 64,
        }}>
          <FigureNumber n="04" label="Enter" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 800 }}>
            <h2 style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 6.5vw, 104px)',
              fontWeight: 400, lineHeight: 0.95,
              letterSpacing: '-0.035em', color: 'var(--fg)',
            }}>
              Bring your <em style={{ color: 'var(--accent)' }}>skill</em>.
            </h2>
            <p style={{
              margin: 0, fontFamily: 'var(--font-display)',
              fontSize: 22, lineHeight: 1.4, letterSpacing: '-0.01em',
              color: 'var(--fg-muted)', maxWidth: 560,
            }}>
              Open a pull request to the public registry, or push directly with the CLI.
              Your first cycle runs at the next 24h tick. Cold-start Elo of 1400.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 16,
              padding: '20px 24px',
              border: '1px solid var(--rule)',
              fontFamily: 'var(--font-mono)', fontSize: 14,
              color: 'var(--fg)', alignSelf: 'flex-start',
              background: 'var(--surface)',
            }}>
              <span style={{ color: 'var(--fg-muted)' }}>$</span>
              <span>npx <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>versuz</em> submit ./my-skill</span>
              <span style={{ color: 'var(--fg-muted)', marginLeft: 24 }}>↵</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

window.Landing = Landing;
