import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  approveTaskProposal,
  rejectTaskProposal,
  deleteTaskProposal,
} from "@/lib/admin/actions";

const STATUS_OPTIONS = ["pending", "approved", "rejected"];

export const dynamic = "force-dynamic";

export default async function TaskProposalsAdmin({ searchParams }) {
  const params = (await searchParams) || {};
  const status = STATUS_OPTIONS.includes(params.status) ? params.status : "pending";
  const sb = createSupabaseAdminClient();

  const proposals = sb
    ? (
        await sb
          .from("task_proposals")
          .select("*")
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(200)
      ).data || []
    : [];

  const counts = sb ? await loadCounts(sb) : { pending: 0, approved: 0, rejected: 0 };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 32,
        }}
      >
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
          Task proposals
        </h1>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--rule)" }}>
          {STATUS_OPTIONS.map((s) => {
            const active = s === status;
            return (
              <Link
                key={s}
                href={`/admin/task-proposals?status=${s}`}
                style={{
                  padding: "10px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  background: active ? "var(--fg)" : "transparent",
                  color: active ? "var(--bg)" : "var(--fg-muted)",
                  borderRight: s !== "rejected" ? "1px solid var(--rule)" : "none",
                }}
              >
                {s} ({counts[s] ?? 0})
              </Link>
            );
          })}
        </div>
      </div>

      {proposals.length === 0 ? (
        <div
          style={{
            padding: "80px 32px",
            textAlign: "center",
            border: "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.06em",
          }}
        >
          No {status} proposals.
          {status === "pending" && (
            <div
              style={{ marginTop: 12, fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg)" }}
            >
              Run{" "}
              <code style={{ background: "var(--surface)", padding: "2px 6px" }}>
                npm run generate-tasks -- --kind=skill --category=document
              </code>{" "}
              to draft some.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} />
          ))}
        </div>
      )}
    </div>
  );
}

async function loadCounts(sb) {
  const [p, a, r] = await Promise.all(
    STATUS_OPTIONS.map((s) =>
      sb.from("task_proposals").select("id", { count: "exact", head: true }).eq("status", s)
    )
  );
  return { pending: p.count ?? 0, approved: a.count ?? 0, rejected: r.count ?? 0 };
}

function ProposalCard({ proposal }) {
  const isPending = proposal.status === "pending";
  return (
    <article
      style={{
        border: "1px solid var(--rule)",
        padding: "20px 24px",
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        gap: 24,
      }}
      className="vz-install-grid"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--fg)" }}>{proposal.subject_kind}</span>
          <span>·</span>
          <span>{proposal.category}</span>
          <span>·</span>
          <Difficulty diff={proposal.difficulty} />
          {proposal.source_model && (
            <>
              <span>·</span>
              <span>{proposal.source_model}</span>
            </>
          )}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {proposal.title}
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--fg)" }}>
          {proposal.description}
        </p>
        {proposal.expected_output_signal && (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.04em",
            }}
          >
            <strong style={{ color: "var(--fg)" }}>Signal:</strong>{" "}
            {proposal.expected_output_signal}
          </p>
        )}
        <details
          style={{
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            marginTop: 4,
          }}
        >
          <summary
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
            }}
          >
            Show input_data
          </summary>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderTop: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg)",
              overflow: "auto",
              maxHeight: 240,
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(proposal.input_data, null, 2)}
          </pre>
        </details>
        {proposal.rejection_reason && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--danger)",
              letterSpacing: "0.04em",
            }}
          >
            Rejected: {proposal.rejection_reason}
          </p>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isPending ? (
          <>
            <form action={approveTaskProposal}>
              <input type="hidden" name="id" value={proposal.id} />
              <ActionButton kind="primary">Approve → tasks</ActionButton>
            </form>
            <form action={rejectTaskProposal}>
              <input type="hidden" name="id" value={proposal.id} />
              <input
                type="text"
                name="reason"
                placeholder="Reason (optional)"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid var(--rule)",
                  background: "var(--bg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--fg)",
                  outline: "none",
                }}
              />
              <ActionButton kind="ghost">Reject</ActionButton>
            </form>
          </>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              letterSpacing: "0.06em",
            }}
          >
            {proposal.status} ·{" "}
            {proposal.reviewed_at ? new Date(proposal.reviewed_at).toLocaleDateString() : "—"}
          </span>
        )}
        <form action={deleteTaskProposal}>
          <input type="hidden" name="id" value={proposal.id} />
          <ActionButton kind="danger">Delete</ActionButton>
        </form>
      </div>
    </article>
  );
}

function Difficulty({ diff }) {
  const color =
    diff === "hard"
      ? "var(--danger)"
      : diff === "easy"
        ? "var(--sage)"
        : "var(--amber)";
  return <span style={{ color }}>{diff}</span>;
}

function ActionButton({ children, kind = "primary" }) {
  const base = {
    width: "100%",
    padding: "10px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    border: "1px solid var(--rule-strong)",
  };
  const styles =
    kind === "primary"
      ? { ...base, background: "var(--fg)", color: "var(--bg)", borderColor: "var(--fg)" }
      : kind === "danger"
        ? { ...base, background: "transparent", color: "var(--danger)", borderColor: "rgba(153,27,27,0.4)" }
        : { ...base, background: "transparent", color: "var(--fg-muted)" };
  return (
    <button type="submit" style={styles}>
      {children}
    </button>
  );
}
