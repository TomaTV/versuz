import Link from "next/link";

export function CategoryTabs({ categories, activeId = "all", basePath = "/standings" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        flexWrap: "wrap",
        paddingBottom: 16,
        borderBottom: "1px solid var(--rule)",
      }}
    >
      {categories.map((c) => {
        const active = activeId === c.id;
        const href = c.id === "all" ? basePath : `${basePath}/${c.id}`;
        return (
          <Link
            key={c.id}
            href={href}
            style={{
              padding: "6px 0",
              color: active ? "var(--fg)" : "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              position: "relative",
              display: "inline-flex",
              alignItems: "baseline",
              gap: 6,
              textDecoration: "none",
              transition: "color .15s ease",
            }}
            className="vz-cat-tab"
            aria-current={active ? "page" : undefined}
          >
            {c.label}
            <span style={{ fontSize: 10, color: "var(--fg-muted)", opacity: active ? 1 : 0.5 }}>
              {c.count}
            </span>
            {active && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 1,
                  background: "var(--accent)",
                }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
