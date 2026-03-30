const EQS = ["iħ ∂ψ/∂t = Ĥψ", "Δx · Δk ≥ ½", "T + R = 1", "Ĥψₙ = Eₙψₙ"];

export default function HeroEquations() {
  return (
    <div style={{ marginTop: 52, display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" as const }}>
      {EQS.map(eq => (
        <div key={eq} style={{
          fontFamily: "var(--font-mono)", fontSize: 13,
          color: "white", letterSpacing: "0.06em",
          padding: "6px 14px",
          border: "1px solid var(--border)",
          borderRadius: 4,
          background: "rgba(0,229,255,0.02)",
        }}>
          {eq}
        </div>
      ))}
    </div>
  );
}