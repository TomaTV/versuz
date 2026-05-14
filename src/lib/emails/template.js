/**
 * Branded email template — used for all Versuz transactional emails.
 * Inlined CSS only (most clients strip <style> tags). Versuz brand palette,
 * Instrument Serif for display, system mono for small caps.
 *
 * The mark is an embedded SVG (2-flame ember) — no external image fetches
 * that would trigger Gmail's "load images" gate.
 */

const COLORS = {
  bg: "#f2eee6",
  surface: "#ece7dd",
  ink: "#14120e",
  inkMuted: "#6b6557",
  ember: "#c2410c",
  ember2: "#e5a644",
  azure: "#2a5fa8",
  sage: "#3f7d4f",
  rule: "rgba(20,18,14,0.12)",
};

const MARK_SVG = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <path d="M8 6 L18 22 L14 34 L4 18 Z" fill="${COLORS.ember}"/>
  <path d="M22 6 L36 18 L26 34 L18 22 Z" fill="${COLORS.ember}" opacity="0.7"/>
</svg>
`.trim();

/**
 * Wraps email body content in the Versuz brand layout.
 *
 * @param {object} args
 * @param {string} args.title — H1 (Instrument Serif). Can include an <em style="color:#c2410c"> for accent.
 * @param {string} args.body — HTML body content (paragraphs, links, etc.)
 * @param {object} [args.cta] — optional CTA button
 * @param {string} [args.cta.label]
 * @param {string} [args.cta.href]
 * @param {string} [args.preheader] — preview text shown in inbox before opening
 * @returns {string} full HTML email
 */
export function brandedEmail({ title, body, cta, preheader, unsubscribeUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Versuz</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.ink};font-family:'Helvetica Neue',Arial,sans-serif;">
${preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${preheader}</div>` : ""}

<!-- Top color stripe — brand signature -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg}">
  <tr>
    <td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto" align="center">
        <tr>
          <td colspan="4" style="height:6px;line-height:6px;font-size:0">&nbsp;</td>
        </tr>
        <tr style="height:4px">
          <td style="height:4px;background:${COLORS.ember};line-height:4px;font-size:0">&nbsp;</td>
          <td style="height:4px;background:${COLORS.ember2};line-height:4px;font-size:0">&nbsp;</td>
          <td style="height:4px;background:${COLORS.azure};line-height:4px;font-size:0">&nbsp;</td>
          <td style="height:4px;background:${COLORS.sage};line-height:4px;font-size:0">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Main card -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};padding:0 16px">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:32px auto;background:${COLORS.surface};border:1px solid ${COLORS.rule}">
        <tr>
          <td style="padding:36px 40px 8px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle">${MARK_SVG}</td>
                <td style="padding-left:12px;vertical-align:middle;font-family:'SF Mono',Menlo,monospace;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.inkMuted}">
                  VERSUZ
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px 8px">
            <h1 style="margin:0;font-family:'Georgia','Times New Roman',serif;font-size:38px;line-height:1.05;letter-spacing:-0.02em;font-weight:400;color:${COLORS.ink}">
              ${title}
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 40px 24px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:${COLORS.ink}">
            ${body}
          </td>
        </tr>

        ${
          cta
            ? `<tr>
                <td style="padding:0 40px 32px">
                  <a href="${cta.href}" style="display:inline-block;padding:14px 24px;background:${COLORS.ink};color:${COLORS.bg};text-decoration:none;font-family:'SF Mono',Menlo,monospace;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-weight:500">
                    ${cta.label} →
                  </a>
                </td>
              </tr>`
            : ""
        }

        <tr>
          <td style="padding:24px 40px 28px;border-top:1px solid ${COLORS.rule};font-family:'SF Mono',Menlo,monospace;font-size:11px;letter-spacing:0.06em;color:${COLORS.inkMuted}">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family:'Georgia',serif;font-style:italic;font-size:18px;color:${COLORS.ember}">
                  versuz.dev
                </td>
                <td align="right" style="font-family:'SF Mono',Menlo,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${COLORS.inkMuted}">
                  Skills go in. Only one wins.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto 40px">
        <tr>
          <td align="center" style="font-family:'SF Mono',Menlo,monospace;font-size:10px;letter-spacing:0.12em;color:${COLORS.inkMuted};line-height:1.6">
            Sent by Versuz · the open benchmark for AI agent skills<br />
            Reply to this email — it reaches a real human.
            ${unsubscribeUrl ? `<br /><br /><a href="${unsubscribeUrl}" style="color:${COLORS.inkMuted};text-decoration:underline">Unsubscribe</a>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}
