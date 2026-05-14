export default function RepoBundleLoading() {
  return (
    <div style={{ padding: "clamp(48px, 8vw, 96px) clamp(16px, 4.5vw, 64px)", maxWidth: 1440, margin: "0 auto" }}>
      <div className="vz-skeleton" style={{ height: 14, width: 140, marginBottom: 24 }} />
      <div className="vz-skeleton" style={{ height: 48, width: "72%", marginBottom: 16 }} />
      <div className="vz-skeleton" style={{ height: 18, width: "48%" }} />
    </div>
  );
}
