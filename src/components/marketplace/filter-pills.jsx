import Link from "next/link";

/**
 * Server-rendered filter pills. Each option toggles ONE param while
 * preserving the others, via URLSearchParams. No client JS needed.
 *
 *   <FilterPills
 *     baseHref="/marketplace"
 *     baseParams={params}     // current searchParams
 *     name="tier"             // the param this pill controls
 *     current={tier}          // the current value
 *     defaultValue="all"      // value that means "no filter"
 *     options={[{id:'all',label:'All'}, {id:'free',label:'Free'}, ...]}
 *   />
 */
export function FilterPills({
  baseHref,
  baseParams = {},
  name,
  current,
  defaultValue = "all",
  options,
  label,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = (current ?? defaultValue) === opt.id;
          const next = { ...baseParams, [name]: opt.id };
          if (opt.id === defaultValue) delete next[name];
          // strip empty values
          for (const k of Object.keys(next))
            if (next[k] === "" || next[k] == null) delete next[k];
          const qs = new URLSearchParams(next).toString();
          const href = qs ? `${baseHref}?${qs}` : baseHref;
          return (
            <Link
              key={opt.id}
              href={href}
              className="vz-cat-pill"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: active ? "var(--bg)" : "var(--fg-muted)",
                background: active ? "var(--fg)" : "transparent",
                border: active ? "1px solid var(--fg)" : "1px solid var(--rule)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "color .15s ease, background .15s ease, border-color .15s ease",
              }}
            >
              {opt.label}
              {opt.count != null && <span style={{ opacity: 0.6 }}>{opt.count}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
