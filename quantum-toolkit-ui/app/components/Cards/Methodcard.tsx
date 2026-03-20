interface MethodCardProps {
  tag: string;
  title: string;
  body: string;
  accent: string;
  formula?: string;
}

export default function MethodCard({ tag, title, body, accent, formula }: MethodCardProps) {
  return (
    <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 20 }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const,
        color: accent, marginBottom: 10, fontFamily: "var(--font-mono)",
      }}>
        {tag}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, marginBottom: 10, color: "var(--text-primary)" }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: formula ? 12 : 0 }}>
        {body}
      </p>
      {formula && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: accent, padding: "8px 12px",
          background: `${accent}10`, borderRadius: 6,
          border: `1px solid ${accent}30`,
          display: "inline-block",
        }}>
          {formula}
        </div>
      )}
    </div>
  );
}