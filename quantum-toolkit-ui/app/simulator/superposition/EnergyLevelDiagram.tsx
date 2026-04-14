"use client";

const COLORS = ["#22d3ee", "#a78bfa", "#f59e0b", "#22c55e", "#f87171"];

interface Props {
  energies: number[];
  coefficients: number[];
}

export default function EnergyLevelDiagram({ energies, coefficients }: Props) {
  const Emax = Math.max(...energies) * 1.15 || 1;
  const norm = Math.sqrt(coefficients.reduce((s, c) => s + c * c, 0)) || 1;

  return (
    <div style={{
      background: "rgba(255,255,255,0.015)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{
        fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" as const,
        color: "rgba(148,163,184,0.4)", marginBottom: 12, fontFamily: "monospace",
      }}>
        Energy levels  Eₙ = n²E₁
      </div>

      <div style={{ position: "relative", height: 160 }}>
        {/* Y axis */}
        <div style={{
          position: "absolute", left: 28, top: 0, bottom: 0,
          width: 1, background: "rgba(255,255,255,0.12)",
        }} />

        {energies.map((E, i) => {
          const color = COLORS[i % COLORS.length];
          const yPct  = 1 - E / Emax;          // 0 = bottom, 1 = top
          const weight = Math.abs(coefficients[i] / norm);
          const top    = yPct * 140 + 8;

          return (
            <div key={i} style={{ position: "absolute", left: 0, top, width: "100%" }}>
              {/* Energy label */}
              <span style={{
                position: "absolute", left: 0, top: -5,
                fontSize: 9, fontFamily: "monospace", color: "rgba(148,163,184,0.5)",
              }}>
                E{i + 1}
              </span>

              {/* Level line */}
              <div style={{
                position: "absolute", left: 32, right: 0, height: 1.5,
                background: `linear-gradient(to right, ${color}, ${color}00)`,
                opacity: 0.3 + weight * 0.7,
              }} />

              {/* Amplitude indicator (filled portion) */}
              <div style={{
                position: "absolute", left: 32,
                width: `${weight * 70}%`, height: 1.5,
                background: color,
                boxShadow: `0 0 6px ${color}`,
              }} />

              {/* Label */}
              <span style={{
                position: "absolute", right: 0, top: -8,
                fontSize: 10, fontFamily: "monospace", color,
                fontWeight: 700,
              }}>
                {(weight * weight * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 9, color: "rgba(100,116,139,0.4)", fontFamily: "monospace", marginTop: 4 }}>
        Bar length = |cₙ|² (probability weight)
      </div>
    </div>
  );
}