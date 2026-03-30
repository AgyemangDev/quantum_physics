export function ChartPanel({ title, eq, legend, children }: {
  title: string; eq?: React.ReactNode;
  legend?: Array<{ color: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>{title}</span>
        {eq && <div style={{ fontSize: "0.72em", opacity: 0.55 }}>{eq}</div>}
      </div>
      {children}
      {legend && (
        <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
          {legend.map(l => <span key={l.label} style={{ fontSize: 10, color: l.color, fontFamily: "monospace" }}>— {l.label}</span>)}
        </div>
      )}
    </div>
  );
}