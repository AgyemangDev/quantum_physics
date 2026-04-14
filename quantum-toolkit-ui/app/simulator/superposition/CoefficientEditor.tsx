"use client";

const COLORS = ["#22d3ee", "#a78bfa", "#f59e0b", "#22c55e", "#f87171"];
const STATE_LABELS = ["ψ₁", "ψ₂", "ψ₃", "ψ₄", "ψ₅"];

interface Props {
  coefficients: number[];
  onChange: (c: number[]) => void;
}

export default function CoefficientEditor({ coefficients, onChange }: Props) {
  const update = (i: number, val: number) => {
    const next = [...coefficients];
    next[i] = val;
    onChange(next);
  };

  const add = () => {
    if (coefficients.length < 5) onChange([...coefficients, 0]);
  };

  const remove = (i: number) => {
    if (coefficients.length > 1) onChange(coefficients.filter((_, j) => j !== i));
  };

  // Normalisation factor for display
  const norm = Math.sqrt(coefficients.reduce((s, c) => s + c * c, 0)) || 1;

  return (
    <div>
      <div style={{
        fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" as const,
        color: "rgba(148,163,184,0.4)", marginBottom: 12, fontFamily: "monospace",
      }}>
        Eigenstate coefficients  cₙ
      </div>

      {/* Formula display */}
      <div style={{
        fontSize: 10, fontFamily: "monospace", color: "rgba(148,163,184,0.55)",
        marginBottom: 14, lineHeight: 1.6,
      }}>
        ψ(x,t) = Σ cₙ ψₙ(x) e^(−iEₙt/ħ)
      </div>

      {coefficients.map((c, i) => {
        const color = COLORS[i % COLORS.length];
        const weight = (c / norm * 100).toFixed(1);
        return (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 28, height: 18, borderRadius: 3,
                  background: color + "22", border: `1px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontFamily: "monospace", color,
                }}>
                  {STATE_LABELS[i]}
                </span>
                <span style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontFamily: "monospace" }}>
                  E_{i + 1} = {((i + 1) ** 2).toFixed(0)} E₁
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "monospace" }}>
                  {c.toFixed(2)}
                </span>
                <span style={{ fontSize: 9, color: "rgba(100,116,139,0.5)", fontFamily: "monospace" }}>
                  ({weight}%)
                </span>
                {coefficients.length > 1 && (
                  <button onClick={() => remove(i)} style={{
                    background: "none", border: "none", color: "rgba(248,113,113,0.5)",
                    cursor: "pointer", fontSize: 12, padding: "0 2px", lineHeight: 1,
                  }}>×</button>
                )}
              </div>
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={c}
              onChange={e => update(i, parseFloat(e.target.value))}
              style={{ width: "100%", cursor: "pointer", accentColor: color, height: 3 }}
            />
            {/* Weight bar */}
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 4 }}>
              <div style={{
                height: "100%", width: `${weight}%`, background: color,
                borderRadius: 2, transition: "width 0.2s",
                boxShadow: `0 0 6px ${color}88`,
              }} />
            </div>
          </div>
        );
      })}

      {coefficients.length < 5 && (
        <button onClick={add} style={{
          width: "100%", padding: "6px",
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: 6, cursor: "pointer",
          color: "rgba(148,163,184,0.45)",
          fontSize: 11, fontFamily: "monospace",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
        >
          + add eigenstate
        </button>
      )}

      {/* Normalisation indicator */}
      <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "monospace" }}>
          <span style={{ color: "rgba(148,163,184,0.4)" }}>Σ |cₙ|²  (auto-normalised)</span>
          <span style={{ color: "#22c55e" }}>1.000</span>
        </div>
      </div>
    </div>
  );
}