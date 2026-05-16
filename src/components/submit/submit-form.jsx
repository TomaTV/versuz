"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { track } from "@/lib/track";

/**
 * Two-tab submit form:
 *   - Tab 1: paste a GitHub URL → server scrapes
 *   - Tab 2: paste content directly
 *
 * Uses server actions passed in as props so the same component handles both
 * skills and CLAUDE.md submissions.
 */
export function SubmitForm({
  urlAction,
  contentAction,
  contentLabel = "SKILL.md content",
  contentPlaceholder = "---\nname: my-skill\ndescription: Extract X from Y\ntools: [read, bash]\n---\n\n# my-skill\n\nYou are an expert in...",
  extraField = null, // optional extra field for content path (e.g. project_category for CLAUDE.md)
}) {
  const [tab, setTab] = useState("url");
  const [tier, setTier] = useState("free");
  const [price, setPrice] = useState("4.99");
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData) {
    setResult(null);
    startTransition(async () => {
      const action = tab === "url" ? urlAction : contentAction;
      const r = await action(formData);
      setResult(r);
    });
  }

  useEffect(() => {
    if (result?.ok && result.meta?.slug) {
      track("submit_complete", {
        kind: result.meta.kind || "skill",
        tier: result.meta.tier || tier,
        slug: result.meta.slug,
        tab,
      });
    }
  }, [result?.ok, result?.meta?.slug]);

  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        background: "var(--surface)",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          border: "1px solid var(--rule)",
          padding: 4,
          background: "var(--bg)",
          width: "fit-content",
        }}
      >
        {[
          { id: "url", label: "GitHub URL" },
          { id: "content", label: "Paste content" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              color: tab === t.id ? "var(--bg)" : "var(--fg-muted)",
              background: tab === t.id ? "var(--fg)" : "transparent",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Tier picker */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Listing tier
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "free", label: "Free", help: "$0 · public" },
              { id: "premium", label: "Premium", help: "70% to you · 30% Versuz" },
            ].map((t) => {
              const active = tier === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTier(t.id)}
                  style={{
                    flex: "1 1 0",
                    minWidth: 140,
                    padding: "12px 14px",
                    border: active ? "1px solid var(--accent)" : "1px solid var(--rule)",
                    background: active ? "var(--accent-soft)" : "var(--bg)",
                    color: active ? "var(--accent)" : "var(--fg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{t.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.7 }}>
                    {t.help}
                  </span>
                </button>
              );
            })}
          </div>
          {tier === "premium" && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Price (USD)
                </span>
                <input
                  type="number"
                  name="price_usd"
                  min="0.50"
                  max="999"
                  step="0.01"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--rule)",
                    background: "var(--bg)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "var(--fg)",
                    outline: "none",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Min $0.50 (Stripe min). You&apos;ll need Stripe Connect onboarded under /profile/settings before buyers can pay.
                </span>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Premium download (exclusive payload)
                </span>
                <PremiumDropZone />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Upload the SKILL.md (or a .zip bundle) buyers receive. Stored in a private bucket; only paid buyers get a signed download URL. Optional — leave empty for badge-only listing.
                </span>
              </label>
            </>
          )}
          <input type="hidden" name="tier" value={tier} />
        </div>

        {tab === "url" ? (
          <Field
            label="Public GitHub URL"
            name="github_url"
            type="url"
            required
            placeholder="https://github.com/owner/repo"
            help="Repo must be public. We pick up the SKILL.md or root CLAUDE.md and index it."
          />
        ) : (
          <>
            <Field
              label="Name"
              name="name"
              required
              placeholder="my-skill"
              help="Used for the slug — lowercase, dashes, no spaces."
            />
            {extraField}
            <Field
              label={contentLabel}
              name="content"
              as="textarea"
              required
              rows={12}
              placeholder={contentPlaceholder}
            />
          </>
        )}

        {result && (
          <div
            style={{
              padding: "16px 18px",
              border: `1px solid ${result.error ? "var(--accent)" : "var(--sage)"}`,
              background: result.error ? "var(--accent-soft)" : "rgba(63, 125, 79, 0.1)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: result.error ? "var(--accent)" : "var(--sage)",
              lineHeight: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              {result.error || result.message}
              {result.meta?.slug && (
                <>
                  <br />
                  <span style={{ opacity: 0.7 }}>slug · {result.meta.slug}</span>
                </>
              )}
            </div>
            {result.ok && result.meta?.slug && <SuccessActions meta={result.meta} />}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="vz-btn-primary"
          style={{
            padding: "14px 22px",
            background: "var(--fg)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: pending ? 0.6 : 1,
            alignSelf: "flex-start",
          }}
        >
          {pending ? "Submitting…" : "Submit"} <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
        </button>
      </form>
    </div>
  );
}

/**
 * Drag-drop file picker for the premium payload. Sets the file on a hidden
 * <input name="premium_file"> via DataTransfer so the form submission still
 * carries the file natively (no JS state needed at submit time).
 */
function PremiumDropZone() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  function setFileOnInput(f) {
    setFile(f);
    if (inputRef.current && f) {
      const dt = new DataTransfer();
      dt.items.add(f);
      inputRef.current.files = dt.files;
    } else if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }
  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setFileOnInput(f);
  }
  function onPick(e) {
    const f = e.target.files?.[0];
    setFileOnInput(f || null);
  }
  function clear(e) {
    e.preventDefault();
    e.stopPropagation();
    setFileOnInput(null);
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      style={{
        position: "relative",
        padding: file ? "14px 16px" : "28px 16px",
        border: `1px dashed ${dragActive ? "var(--accent)" : "var(--rule-strong)"}`,
        background: dragActive ? "var(--accent-soft)" : "var(--bg)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--fg)",
        cursor: "pointer",
        textAlign: "center",
        transition: "background .15s ease, border-color .15s ease, padding .15s ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        name="premium_file"
        accept=".md,.markdown,text/markdown,text/plain,.zip,application/zip"
        onChange={onPick}
        style={{ display: "none" }}
      />
      {file ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <strong style={{ fontWeight: 500, color: "var(--accent)", wordBreak: "break-all" }}>
            {file.name}
          </strong>
          <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
            {(file.size / 1024).toFixed(1)} KB · click to replace
          </span>
          <button
            type="button"
            onClick={clear}
            style={{
              alignSelf: "center",
              marginTop: 6,
              padding: "4px 10px",
              border: "1px solid var(--rule-strong)",
              background: "transparent",
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.06em",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <strong style={{ fontWeight: 500, color: "var(--fg)" }}>
            {dragActive ? "Drop the file" : "Drag & drop a .md or .zip"}
          </strong>
          <br />
          <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
            or click to pick · max 10 MB
          </span>
        </>
      )}
    </div>
  );
}

function SuccessActions({ meta }) {
  // result.meta has { kind: 'skill' | 'claude_md', slug, category? | project_category? }
  const isSkill = meta.kind === "skill" || !meta.kind;
  const detailHref = isSkill
    ? `/skills/${meta.slug}`
    : `/claude-md/${meta.project_category || meta.category || "generic"}/${meta.slug}`;
  const promoteHref = `/promote/${isSkill ? "skill" : "claude-md"}/${meta.slug}`;
  const submitMoreHref = isSkill ? "/submit/skill" : "/submit/claude-md";

  const btnBase = {
    padding: "10px 14px",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    fontWeight: 500,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid currentColor",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <a
        href={detailHref}
        style={{
          ...btnBase,
          background: "var(--sage)",
          color: "var(--bg)",
          border: "1px solid var(--sage)",
        }}
      >
        View item <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
      </a>
      <a
        href={promoteHref}
        style={{
          ...btnBase,
          background: "var(--amber)",
          color: "var(--bg)",
          border: "1px solid var(--amber)",
        }}
      >
        ◆ Boost it <span style={{ fontFamily: "var(--font-mono)" }}>↗</span>
      </a>
      <a
        href={submitMoreHref}
        style={{
          ...btnBase,
          color: "var(--fg-muted)",
          border: "1px solid var(--rule-strong)",
          background: "transparent",
        }}
      >
        Submit another
      </a>
    </div>
  );
}

function Field({ label, help, as, ...inputProps }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
      {as === "textarea" ? (
        <textarea
          {...inputProps}
          style={{
            padding: "12px 14px",
            border: "1px solid var(--rule)",
            background: "var(--bg)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg)",
            outline: "none",
            transition: "border-color .15s ease",
            resize: "vertical",
            minHeight: 200,
          }}
        />
      ) : (
        <input
          {...inputProps}
          style={{
            padding: "12px 14px",
            border: "1px solid var(--rule)",
            background: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--fg)",
            outline: "none",
            transition: "border-color .15s ease",
          }}
        />
      )}
      {help && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {help}
        </span>
      )}
    </label>
  );
}
