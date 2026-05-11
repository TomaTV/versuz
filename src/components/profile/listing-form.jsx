"use client";

import { useState, useTransition } from "react";

/**
 * Tier + price + description editor for a self-owned listing.
 *
 * - free <-> premium toggle (price input shown only when premium)
 * - featured tier is LOCKED for self-edit (Versuz editorial). Form shows it
 *   as a sticky badge with explanation rather than a 3rd toggle the user
 *   could accidentally pick.
 * - description textarea (max 600 chars)
 *
 * Server action validates ownership + price bounds + tier transition rules.
 */
export function ListingForm({ item, kind, updateAction }) {
  const isFeatured = item.tier === "featured";
  const [tier, setTier] = useState(isFeatured ? "featured" : item.tier || "free");
  const [price, setPrice] = useState(item.price_usd ? String(item.price_usd) : "1.99");
  const [description, setDescription] = useState(item.description || "");
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData) {
    setResult(null);
    startTransition(async () => {
      const r = await updateAction(formData);
      setResult(r);
      // Auto-clear success toast after 4s
      if (r?.ok) setTimeout(() => setResult(null), 4000);
    });
  }

  const charsLeft = 600 - description.length;

  return (
    <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="slug" value={item.slug} />

      {/* === Tier === */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Label>Listing tier</Label>
        {isFeatured ? (
          <div
            style={{
              padding: "16px 18px",
              border: "1px solid var(--accent)",
              background: "var(--accent-soft)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg)",
              lineHeight: 1.55,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden style={{ width: 8, height: 8, background: "var(--accent)" }} />
              <strong style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 11 }}>
                ★ Featured · Editorial
              </strong>
            </span>
            <span style={{ color: "var(--fg-muted)" }}>
              This is a Versuz first-party listing. Tier cannot be changed by the author —
              contact an admin to convert. Price below is still editable.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "free", label: "Free", help: "$0 · public, no payout" },
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
                    padding: "14px 16px",
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
                    transition: "border-color .15s ease, background .15s ease",
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
        )}
        <input type="hidden" name="tier" value={tier} />
      </div>

      {/* === Price (premium + featured both have prices) === */}
      {(tier === "premium" || isFeatured) && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label>Price (USD)</Label>
          <input
            type="number"
            name="price_usd"
            min="0.50"
            max="999"
            step="0.50"
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
              maxWidth: 200,
            }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)" }}>
            Min $0.50 · max $999.{" "}
            {!isFeatured && (
              <>You&apos;ll need Stripe Connect onboarded under{" "}
              <a href="/profile/settings" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                /profile/settings
              </a>{" "}before buyers can pay.</>
            )}
          </span>
        </label>
      )}

      {/* === Description === */}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label>Description</Label>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 600))}
          rows={4}
          maxLength={600}
          placeholder="One-paragraph pitch. Shown on cards + meta description for SEO."
          style={{
            padding: "12px 14px",
            border: "1px solid var(--rule)",
            background: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--fg)",
            outline: "none",
            resize: "vertical",
            minHeight: 80,
            lineHeight: 1.5,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: charsLeft < 50 ? "var(--amber)" : "var(--fg-muted)",
            alignSelf: "flex-end",
          }}
        >
          {charsLeft} chars left
        </span>
      </label>

      {/* === Save feedback toast === */}
      {result && (
        <div
          style={{
            padding: "12px 14px",
            border: `1px solid ${result.error ? "var(--crimson)" : "var(--sage)"}`,
            background: result.error ? "rgba(178, 58, 58, 0.06)" : "rgba(63, 125, 79, 0.08)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: result.error ? "var(--crimson)" : "var(--sage)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span aria-hidden style={{ fontSize: 14 }}>{result.error ? "✗" : "✓"}</span>
          {result.error || "Saved. Changes are live on /marketplace."}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          alignSelf: "flex-start",
          padding: "12px 22px",
          background: "var(--fg)",
          color: "var(--bg)",
          border: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          transition: "opacity .15s ease",
        }}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function Label({ children }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--fg-muted)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
