"use client";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  color?: string;
  onChange: (v: number) => void;
}

export default function Slider({ label, value, min, max, step, unit = "", color = "var(--cyan)", onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          {label}
        </span>
        <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 48, textAlign: "right" as const }}>
          {value.toFixed(step < 0.1 ? 2 : 1)}{unit}
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{
          height: 4, borderRadius: 2,
          background: `linear-gradient(to right, ${color} ${pct}%, var(--bg-raised) ${pct}%)`,
          position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%",
          pointerEvents: "none",
        }}/>
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: "relative", zIndex: 1, background: "transparent" }}
        />
      </div>
    </div>
  );
}
