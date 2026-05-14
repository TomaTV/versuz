// Shared chrome (Nav + Footer) for standalone pages.
// Expects: VersuzMark, VersuzWordmark, Eyebrow on window.

const VZ_NAV_LINKS = [
  { id: 'standings', label: 'Standings', href: 'Versuz Prototype.html' },
  { id: 'method', label: 'Method', href: '#methodology' },
  { id: 'brand', label: 'Brand', href: 'Versuz Brand.html' },
];

function VzNav({ current = 'landing', onSubmit }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      height: 72,
      background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--rule)',
    }}>
      <div style={{
        maxWidth: 1440, margin: '0 auto', height: '100%',
        padding: '0 64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24,
      }}>
        <a href="Versuz Landing.html" style={{
          display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none',
        }}>
          <VersuzMark size={22} accentColor="var(--accent)" />
          <VersuzWordmark size={22} accentColor="var(--accent)" />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--fg-muted)', marginLeft: 4,
            border: '1px solid var(--rule)', padding: '2px 6px',
          }}>S2 / β</span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {VZ_NAV_LINKS.map(l => (
            <a key={l.id} href={l.href} style={{
              background: 'transparent', border: 'none',
              color: current === l.id ? 'var(--fg)' : 'var(--fg-muted)',
              fontSize: 13, padding: '8px 16px',
              fontFamily: 'var(--font-ui)', textDecoration: 'none',
              transition: 'color .15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = current === l.id ? 'var(--fg)' : 'var(--fg-muted)'}
            >{l.label}</a>
          ))}
          <span style={{ width: 16 }} />
          <a href="#submit" onClick={onSubmit} className="vz-btn vz-btn-primary"
            style={{ padding: '10px 16px', fontSize: 13 }}>
            Submit <span style={{ fontFamily: 'var(--font-mono)' }}>↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

function VzTicker() {
  // A slim live strip — current cycle, last battle, next tick.
  const recent = [
    'pdf-extract beat pdf-fast — 8.71 / 6.42',
    'sql-genie beat sql-eli5 — 8.34 / 7.12',
    'csv-surgeon beat pandas-pal — 7.91 / 6.83',
    'web-scry beat docx-rewrite — 8.02 / 7.40',
  ];
  return (
    <div style={{
      borderBottom: '1px solid var(--rule)',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 1440, margin: '0 auto',
        padding: '12px 64px',
        display: 'flex', alignItems: 'center', gap: 32,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--fg-muted)', letterSpacing: '0.06em',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: 'var(--accent)', whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
            animation: 'pulse 1.6s infinite',
          }} />
          CYCLE #184 · LIVE
        </span>
        <span style={{ flex: 1, position: 'relative', overflow: 'hidden', height: 16 }}>
          <span style={{
            position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap',
            display: 'inline-flex', gap: 48,
            animation: 'vz-marquee 32s linear infinite',
          }}>
            {[...recent, ...recent, ...recent].map((t, i) => (
              <span key={i}>↗ {t}</span>
            ))}
          </span>
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>NEXT TICK · 06:48:12</span>
      </div>
    </div>
  );
}

function VzFooter() {
  return (
    <footer style={{
      borderTop: '1px solid var(--rule)',
      maxWidth: 1440, margin: '0 auto',
      padding: '64px 64px 48px',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '180px 1fr 1fr',
        gap: 64, marginBottom: 80,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <VersuzMark size={48} accentColor="var(--accent)" />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--fg-muted)', letterSpacing: '0.04em',
          }}>versuz.dev</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Eyebrow>Project</Eyebrow>
          <a href="#" className="vz-link" style={{ alignSelf: 'flex-start' }}>Methodology v04</a>
          <a href="#" className="vz-link" style={{ alignSelf: 'flex-start' }}>Public registry</a>
          <a href="Versuz Brand.html" className="vz-link" style={{ alignSelf: 'flex-start' }}>Brand v01</a>
          <a href="#" className="vz-link" style={{ alignSelf: 'flex-start' }}>RSS · season 02</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
          <Eyebrow>Subscribe</Eyebrow>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display)',
            fontSize: 22, lineHeight: 1.4,
            letterSpacing: '-0.01em', color: 'var(--fg)',
            maxWidth: 360,
          }}>
            Weekly result digest. <em style={{ color: 'var(--accent)' }}>No spam.</em>
          </p>
          <form style={{
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid var(--rule-strong)', padding: '8px 0',
            width: '100%', maxWidth: 360,
          }} onSubmit={e => e.preventDefault()}>
            <input type="email" placeholder="you@somewhere.dev" style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--fg)',
            }} />
            <button style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)',
            }}>↗</button>
          </form>
        </div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        paddingTop: 24, borderTop: '1px solid var(--rule)',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>
        <span>© 2026 Versuz · built in public · Apache-2.0</span>
        <span>Last cycle: #184 · 2026-05-08 14:32 UTC</span>
      </div>
    </footer>
  );
}

Object.assign(window, { VzNav, VzTicker, VzFooter });
