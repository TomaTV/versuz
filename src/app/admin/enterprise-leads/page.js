import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  updateEnterpriseLeadStatus,
  deleteEnterpriseLead,
} from "@/lib/admin/actions";

export const metadata = { title: "Enterprise leads — Admin Versuz" };
export const dynamic = "force-dynamic";

const STATUS_META = {
  new: { label: "New", color: "var(--accent)" },
  contacted: { label: "Contacted", color: "var(--azure)" },
  qualified: { label: "Qualified", color: "var(--sage)" },
  closed: { label: "Closed", color: "var(--fg)" },
  lost: { label: "Lost", color: "var(--crimson)" },
};

const USE_CASE_LABELS = {
  "internal-dev": "Internal dev tools",
  procurement: "AI procurement",
  research: "Research",
  compliance: "Compliance / QA",
  other: "Other",
};

async function loadLeads() {
  const sb = createSupabaseAdminClient();
  if (!sb) {
    return {
      rows: [],
      counts: { total: 0, new: 0, contacted: 0, qualified: 0, closed: 0, lost: 0 },
      error: "Service-role Supabase client not configured.",
    };
  }
  const { data, error } = await sb
    .from("enterprise_leads")
    .select(
      "id, email, name, company, use_case, scale, message, status, source, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    return {
      rows: [],
      counts: { total: 0, new: 0, contacted: 0, qualified: 0, closed: 0, lost: 0 },
      error: error.message,
    };
  }
  const rows = data || [];
  const counts = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { total: 0, new: 0, contacted: 0, qualified: 0, closed: 0, lost: 0 }
  );
  return { rows, counts, error: null };
}

export default async function EnterpriseLeadsAdmin() {
  const { rows, counts, error } = await loadLeads();

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
        Enterprise leads
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
        B2B pipeline captured by the /enterprise contact form. Status workflow :
        new → contacted → qualified → closed (won) or lost. Use the status
        dropdown to advance leads as you work them. Erase removes the row
        entirely (GDPR right-to-be-forgotten).
      </p>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            border: "1px solid var(--crimson)",
            background: "color-mix(in oklab, var(--crimson) 6%, transparent)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--crimson)",
            letterSpacing: "0.04em",
          }}
        >
          {error.includes("relation") || error.includes("does not exist")
            ? "Table enterprise_leads not found — apply migration 0053 before this page works."
            : error}
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          borderTop: "1px solid var(--rule-strong)",
          borderBottom: "1px solid var(--rule)",
        }}
        className="vz-stat-grid"
      >
        <Cell label="Total" value={counts.total} />
        <Cell label="New" value={counts.new || 0} color="var(--accent)" />
        <Cell label="Contacted" value={counts.contacted || 0} color="var(--azure)" />
        <Cell label="Qualified" value={counts.qualified || 0} color="var(--sage)" />
        <Cell label="Closed" value={counts.closed || 0} color="var(--fg)" />
        <Cell label="Lost" value={counts.lost || 0} color="var(--crimson)" />
      </div>

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
            No leads yet. The /enterprise form writes here.
          </div>
        ) : (
          rows.map((row) => <LeadCard key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}

function LeadCard({ row }) {
  const status = STATUS_META[row.status] || STATUS_META.new;
  const created = row.created_at
    ? new Date(row.created_at).toUTCString().slice(0, 16)
    : "";
  const useCase = USE_CASE_LABELS[row.use_case] || row.use_case || "—";

  return (
    <article
      style={{
        padding: "20px 22px",
        borderTop: "1px solid var(--rule)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              letterSpacing: "-0.01em",
              color: "var(--fg)",
            }}
          >
            {row.company || row.name || row.email}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: status.color,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              border: `1px solid ${status.color}`,
            }}
          >
            <span
              aria-hidden
              style={{ width: 5, height: 5, background: status.color }}
            />
            {status.label}
          </span>
        </header>
        <a
          href={`mailto:${row.email}`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--accent)",
            letterSpacing: "0.04em",
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          {row.email}
        </a>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
          }}
        >
          {row.name && <Kv k="Name" v={row.name} />}
          <Kv k="Use case" v={useCase} />
          <Kv k="Scale" v={row.scale || "—"} />
          <Kv k="Source" v={row.source || "—"} />
          <Kv k="Received" v={created} />
        </div>
        {row.message && (
          <blockquote
            style={{
              margin: "8px 0 0",
              padding: "10px 14px",
              borderLeft: "2px solid var(--accent)",
              background: "color-mix(in oklab, var(--accent) 4%, transparent)",
              fontFamily: "var(--font-geist)",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--fg)",
              whiteSpace: "pre-wrap",
            }}
          >
            {row.message}
          </blockquote>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <form
          action={updateEnterpriseLeadStatus}
          style={{ display: "inline-flex", gap: 6 }}
        >
          <input type="hidden" name="id" value={row.id} />
          <select
            name="status"
            defaultValue={row.status}
            style={{
              padding: "6px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg)",
              background: "var(--bg)",
              border: "1px solid var(--rule-strong, var(--rule))",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {Object.entries(STATUS_META).map(([id, m]) => (
              <option key={id} value={id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "6px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--fg)",
              background: "transparent",
              border: "1px solid var(--rule-strong, var(--rule))",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </form>
        <form action={deleteEnterpriseLead}>
          <input type="hidden" name="id" value={row.id} />
          <button
            type="submit"
            title="Right-to-be-forgotten — full delete"
            style={{
              padding: "4px 8px",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--crimson)",
              background: "transparent",
              border: "1px solid rgba(178,58,58,0.4)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Erase
          </button>
        </form>
      </div>
    </article>
  );
}

function Kv({ k, v }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ opacity: 0.6 }}>{k} :</span>
      <span style={{ color: "var(--fg)" }}>{v}</span>
    </div>
  );
}

function Cell({ label, value, color }) {
  return (
    <div
      style={{
        padding: "20px 16px",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
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
          fontSize: 28,
          color: color || "var(--fg)",
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
