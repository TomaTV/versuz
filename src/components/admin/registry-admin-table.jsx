"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  setVerificationLevel,
  setTier,
  deleteSubject,
  bulkSubjectAction,
} from "@/lib/admin/actions";

const LEVELS = [
  { id: 0, label: "0 · Unverified" },
  { id: 1, label: "1 · Claimed" },
  { id: 2, label: "2 · Auto-verified" },
  { id: 3, label: "3 · Reviewed" },
  { id: 4, label: "4 · Featured" },
];

const TIERS = ["free", "premium", "featured"];

const BULK_ACTIONS = [
  { id: "verify", label: "Set verified (lvl 2)" },
  { id: "reviewed", label: "Set reviewed (lvl 3)" },
  { id: "featured", label: "Set featured (lvl 4)" },
  { id: "unverify", label: "Unverify (lvl 0)" },
  { id: "tier-free", label: "Reset tier → free" },
  { id: "reclassify", label: "Reclassify (re-run keyword classifier)" },
  { id: "set-category", label: "Set category → (specify below)" },
  { id: "delete", label: "Delete (irreversible)" },
];

const SKILL_CATEGORIES = ["document", "sql", "data", "web", "shell", "code", "other"];
const CLAUDE_MD_CATEGORIES = ["nextjs", "react", "python-data", "backend-api", "mobile", "devops", "ml-training", "generic", "other"];

export function RegistryAdminTable({ kind, title, rows, query }) {
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("verify");
  const [targetCategory, setTargetCategory] = useState(
    kind === "claude_md" ? "generic" : "code"
  );
  const [pending, startTransition] = useTransition();
  const [bulkResult, setBulkResult] = useState(null);

  const categoryOptions = kind === "claude_md" ? CLAUDE_MD_CATEGORIES : SKILL_CATEGORIES;

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleRow(slug) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.slug)));
  }

  function runBulk() {
    if (!selected.size) return;
    if (
      bulkAction === "delete" &&
      !confirm(`Delete ${selected.size} item(s) permanently?`)
    ) {
      return;
    }
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("action", bulkAction);
    if (bulkAction === "set-category") fd.append("target_category", targetCategory);
    for (const slug of selected) fd.append("slugs", slug);
    setBulkResult(null);
    startTransition(async () => {
      const r = await bulkSubjectAction(fd);
      setBulkResult(r);
      if (r?.ok) setSelected(new Set());
    });
  }

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
          {title}
        </h1>
        <form
          method="GET"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name / slug…"
            style={{
              padding: "10px 14px",
              border: "1px solid var(--rule)",
              background: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--fg)",
              outline: "none",
              minWidth: 280,
            }}
          />
          <button type="submit" style={searchBtn}>
            Search
          </button>
        </form>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "12px 16px",
          marginBottom: 16,
          background: selected.size > 0 ? "var(--accent-soft)" : "var(--surface)",
          border: selected.size > 0 ? "1px solid var(--accent)" : "1px solid var(--rule)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          transition: "background .15s ease, border-color .15s ease",
        }}
      >
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={toggleAll}
          />
          <span style={{ color: "var(--fg)" }}>
            {selected.size > 0
              ? `${selected.size} selected`
              : `${rows.length} row${rows.length === 1 ? "" : "s"}${query ? ` · q=${query}` : ""}`}
          </span>
        </label>
        {selected.size > 0 && (
          <>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              style={{ ...selectStyle, minWidth: 200 }}
              disabled={pending}
            >
              {BULK_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {bulkAction === "set-category" && (
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                style={{ ...selectStyle, minWidth: 140 }}
                disabled={pending}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={runBulk}
              disabled={pending}
              style={{
                ...miniBtn,
                background: "var(--accent)",
                color: "var(--bg)",
                borderColor: "var(--accent)",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Applying…" : `Apply to ${selected.size}`}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={pending}
              style={miniBtn}
            >
              Clear
            </button>
          </>
        )}
        {bulkResult && (
          <span
            style={{
              color: bulkResult.error ? "var(--crimson)" : "var(--sage)",
              marginLeft: "auto",
            }}
          >
            {bulkResult.error || `${bulkResult.affected} row(s) ${bulkResult.action}.`}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: "80px 32px",
            textAlign: "center",
            border: "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
          }}
        >
          Nothing matches.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((r) => (
            <Row
              key={r.slug}
              kind={kind}
              row={r}
              checked={selected.has(r.slug)}
              onToggle={() => toggleRow(r.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ kind, row, checked, onToggle }) {
  const detailHref =
    kind === "skill"
      ? `/skills/${row.slug}`
      : `/claude-md/${row.secondary || "generic"}/${row.slug}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr 200px 200px auto",
        gap: 16,
        padding: "16px 0",
        borderTop: "1px solid var(--rule)",
        alignItems: "center",
        background: checked ? "var(--accent-soft)" : "transparent",
      }}
      className="vz-admin-row"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ marginLeft: 8 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <Link
          href={detailHref}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            color: "var(--fg)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {row.primary}
        </Link>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {row.secondary} · ★ {row.stars}
          {row.tier !== "free" && row.priceUsd != null && ` · $${row.priceUsd}`}
        </span>
      </div>

      <form action={setVerificationLevel} style={{ display: "flex", gap: 6 }}>
        <input type="hidden" name="slug" value={row.slug} />
        <input type="hidden" name="kind" value={kind} />
        <select name="level" defaultValue={row.verificationLevel} style={selectStyle}>
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="submit" style={miniBtn}>
          Set
        </button>
      </form>

      <form action={setTier} style={{ display: "flex", gap: 6 }}>
        <input type="hidden" name="slug" value={row.slug} />
        <input type="hidden" name="kind" value={kind} />
        <select name="tier" defaultValue={row.tier} style={selectStyle}>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="price_usd"
          defaultValue={row.priceUsd ?? ""}
          step="0.01"
          min="0"
          placeholder="$"
          style={{ ...selectStyle, width: 70 }}
        />
        <button type="submit" style={miniBtn}>
          Set
        </button>
      </form>

      <form action={deleteSubject}>
        <input type="hidden" name="slug" value={row.slug} />
        <input type="hidden" name="kind" value={kind} />
        <button
          type="submit"
          style={{ ...miniBtn, color: "var(--danger)", borderColor: "rgba(153,27,27,0.4)" }}
        >
          Del
        </button>
      </form>
    </div>
  );
}

const selectStyle = {
  padding: "6px 8px",
  border: "1px solid var(--rule)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
  outline: "none",
};

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

const searchBtn = {
  ...miniBtn,
  padding: "10px 14px",
  fontSize: 11,
  background: "var(--fg)",
  color: "var(--bg)",
  borderColor: "var(--rule-strong)",
};
