import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unsubscribeUser, deleteSubscriber } from "@/lib/admin/actions";

export const metadata = { title: "Subscribers — Admin Versuz" };

async function loadSubscribers() {
  const sb = createSupabaseAdminClient();
  if (!sb) return { rows: [], counts: { total: 0, active: 0, unsubscribed: 0 } };
  const { data } = await sb
    .from("subscribers")
    .select("email, source, unsubscribed_at, created_at, user_agent")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = data || [];
  return {
    rows,
    counts: {
      total: rows.length,
      active: rows.filter((r) => !r.unsubscribed_at).length,
      unsubscribed: rows.filter((r) => r.unsubscribed_at).length,
    },
  };
}

function exportToCSV(rows) {
  // Just for inline display — actual download would be a separate endpoint.
  const header = "email,source,created_at,unsubscribed_at\n";
  const lines = rows
    .map((r) =>
      [r.email, r.source || "", r.created_at, r.unsubscribed_at || ""].join(",")
    )
    .join("\n");
  return header + lines;
}

export default async function SubscribersAdmin() {
  const { rows, counts } = await loadSubscribers();
  const csv = exportToCSV(rows);

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 56,
          fontWeight: 400,
          letterSpacing: "-0.03em",
          color: "var(--fg)",
          margin: 0,
        }}
      >
        Subscribers
      </h1>

      <p
        style={{
          marginTop: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-muted)",
          letterSpacing: "0.04em",
          lineHeight: 1.6,
          maxWidth: 720,
        }}
      >
        Newsletter list managed via the footer subscribe form. RGPD :
        unsubscribe sets <code>unsubscribed_at</code> (audit trail kept) ;
        Delete fully erases the row (right-to-be-forgotten). The weekly
        digest cron skips unsubscribed rows automatically.
      </p>

      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: "1px solid var(--rule-strong)",
          borderBottom: "1px solid var(--rule)",
        }}
        className="vz-stat-grid"
      >
        <Cell label="Total ever" value={counts.total} />
        <Cell label="Active" value={counts.active} color="var(--sage)" />
        <Cell label="Unsubscribed" value={counts.unsubscribed} color="var(--fg-muted)" />
      </div>

      <details
        style={{
          marginTop: 32,
          border: "1px solid var(--rule)",
          background: "var(--surface)",
        }}
      >
        <summary
          style={{
            padding: "14px 18px",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Export CSV ({counts.total} rows)
        </summary>
        <pre
          style={{
            margin: 0,
            padding: 16,
            borderTop: "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg)",
            background: "var(--bg)",
            maxHeight: 320,
            overflow: "auto",
            whiteSpace: "pre",
          }}
        >
          {csv || "(empty)"}
        </pre>
      </details>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column" }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "48px 32px",
              border: "1px solid var(--rule)",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
            }}
          >
            No subscribers yet.
          </div>
        ) : (
          rows.map((r) => <SubscriberRow key={r.email} row={r} />)
        )}
      </div>
    </div>
  );
}

function SubscriberRow({ row }) {
  const isUnsub = !!row.unsubscribed_at;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: 16,
        padding: "12px 0",
        borderTop: "1px solid var(--rule)",
        alignItems: "center",
        opacity: isUnsub ? 0.55 : 1,
      }}
      className="vz-admin-row"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--fg)",
          wordBreak: "break-all",
        }}
      >
        {row.email}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {row.source || "—"}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: isUnsub ? "var(--fg-muted)" : "var(--sage)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {isUnsub
          ? `unsub ${new Date(row.unsubscribed_at).toUTCString().slice(8, 16)}`
          : `joined ${new Date(row.created_at).toUTCString().slice(8, 16)}`}
      </span>
      <span style={{ display: "inline-flex", gap: 6 }}>
        {!isUnsub && (
          <form action={unsubscribeUser}>
            <input type="hidden" name="email" value={row.email} />
            <button type="submit" style={miniBtn}>
              Unsub
            </button>
          </form>
        )}
        <form action={deleteSubscriber}>
          <input type="hidden" name="email" value={row.email} />
          <button
            type="submit"
            title="Right-to-be-forgotten — full delete"
            style={{ ...miniBtn, color: "var(--crimson)", borderColor: "rgba(178,58,58,0.4)" }}
          >
            Erase
          </button>
        </form>
      </span>
    </div>
  );
}

function Cell({ label, value, color }) {
  return (
    <div
      style={{
        padding: "24px 24px",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
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
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 36,
          color: color || "var(--fg)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const miniBtn = {
  padding: "6px 10px",
  border: "1px solid var(--rule-strong)",
  background: "transparent",
  color: "var(--fg)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.06em",
  cursor: "pointer",
  textTransform: "uppercase",
};
