export default function ChartCard({ title, dot, eqBox, explanation, children }: {
  title: string; dot: string; eqBox?: React.ReactNode;
  explanation: string; children: React.ReactNode;
}) {
  return (
    <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-secondary)" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "12px 14px", flex: 1 }}>
        {eqBox}
        {children}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, borderLeft: `2px solid ${dot}`, paddingLeft: 8 }}>
          {explanation}
        </div>
      </div>
    </div>
  );
}
