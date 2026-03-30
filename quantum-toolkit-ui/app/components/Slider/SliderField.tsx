"use client";

export default function SliderField({ label, value, min, max, step, color = "var(--cyan)", onChange, explanation }: {
  label: string; value: number; min: number; max: number; step: number;
  color?: string; onChange: (v: number) => void; explanation?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color:'white', fontWeight: 700, fontFamily: "var(--font-mono)" }}>
          {value.toFixed(step < 0.1 ? 2 : 1)}
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{
          height: 4, borderRadius: 2, pointerEvents: "none",
          background: `linear-gradient(to right, ${color} ${pct}%, var(--bg-raised) ${pct}%)`,
          position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%",
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: "relative", zIndex: 1, background: "transparent", width: "100%" }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "white", fontFamily: "var(--font-mono)" }}>{min}</span>
        <span style={{ fontSize: 10, color: "white", fontFamily: "var(--font-mono)" }}>{max}</span>
      </div>
      {explanation && (
        <div style={{ fontSize: 11, color: "white", marginTop: 5, lineHeight: 1.5 }}>
          {explanation}
        </div>
      )}
    </div>
  );
}
