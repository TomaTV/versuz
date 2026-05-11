function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function SkillGlyph({ id = "", size = 20 }) {
  const h = hash(id);
  const variant = h % 6;
  const accent = (h >> 4) % 2 === 0;
  const tints = ["#3F7D4F", "#B23A3A", "#2A5FA8", "#D69E2E", "#C2410C"];
  const acc = tints[(h >> 7) % tints.length];
  const fg = "#14120E";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden
    >
      <rect x="0" y="0" width="20" height="20" fill="#F2EEE6" />
      {variant === 0 && <circle cx="10" cy="10" r="6" fill={fg} />}
      {variant === 1 && <rect x="4" y="4" width="12" height="12" fill={fg} />}
      {variant === 2 && <path d="M 10 3 L 17 17 L 3 17 Z" fill={fg} />}
      {variant === 3 && <path d="M 3 4 L 17 4 L 10 17 Z" fill={fg} />}
      {variant === 4 && <path d="M 10 3 A 7 7 0 0 1 10 17 Z" fill={fg} />}
      {variant === 5 && (
        <>
          <rect x="3" y="3" width="14" height="14" fill={fg} />
          <rect x="3" y="9" width="14" height="2" fill="#F2EEE6" />
        </>
      )}
      {accent && <rect x="0" y="17" width="20" height="3" fill={acc} />}
    </svg>
  );
}
