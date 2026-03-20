export default function MetricCard({ label, value, color, sub }: {
  label: string; value: string; color: string; sub?: string;
}) {
  return (
    <div className="panel" style={{ padding: "12px 16px", flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
