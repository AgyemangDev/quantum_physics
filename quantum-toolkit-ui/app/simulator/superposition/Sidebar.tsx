// components/Sidebar.tsx
import React from "react";
import type { SimulationParams } from "./types";

interface SidebarProps {
  params:   SimulationParams;
  onChange: (updated: Partial<SimulationParams>) => void;
}

const label: React.CSSProperties = {
  fontSize: 11,
  color:    "rgba(255,255,255,0.45)",
};

const monoVal: React.CSSProperties = {
  fontSize:   11,
  color:      "#e2e8f0",
  fontFamily: "monospace",
};

function SliderField({
  label: lbl,
  value,
  min,
  max,
  step,
  onChange,
  format = (v: number) => String(v),
}: {
  label:   string;
  value:   number;
  min:     number;
  max:     number;
  step:    number;
  onChange:(v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={label}>{lbl}</span>
        <span style={monoVal}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#6366f1" }}
      />
    </div>
  );
}

function NumberField({
  label: lbl,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label:    string;
  value:    number;
  min?:     number;
  max?:     number;
  step?:    number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 4 }}>
        <span style={label}>{lbl}</span>
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width:        "100%",
          padding:      "5px 9px",
          borderRadius: 6,
          border:       "1px solid rgba(255,255,255,0.12)",
          background:   "rgba(255,255,255,0.04)",
          color:        "#fff",
          fontSize:     12,
          boxSizing:    "border-box",
        }}
      />
    </div>
  );
}

function CoefficientsEditor({
  coefficients,
  onChange,
}: {
  coefficients: number[];
  onChange:     (c: number[]) => void;
}) {
  const update = (idx: number, val: number) => {
    const next = [...coefficients];
    next[idx]  = isFinite(val) ? val : 0;
    onChange(next);
  };
  const add    = () => onChange([...coefficients, 0]);
  const remove = (idx: number) => {
    if (coefficients.length <= 1) return;
    onChange(coefficients.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={label}>Coefficients cₙ</span>
        <button
          onClick={add}
          style={{
            fontSize:     11,
            padding:      "2px 8px",
            borderRadius: 5,
            border:       "1px solid rgba(255,255,255,0.18)",
            background:   "transparent",
            color:        "rgba(255,255,255,0.7)",
            cursor:       "pointer",
          }}
        >
          + add
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {coefficients.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...label, width: 22, flexShrink: 0, textAlign: "right" }}>c{i}</span>
            <input
              type="number"
              value={c}
              step={0.1}
              onChange={(e) => update(i, Number(e.target.value))}
              style={{
                flex:         1,
                padding:      "4px 7px",
                borderRadius: 5,
                border:       "1px solid rgba(255,255,255,0.10)",
                background:   "rgba(255,255,255,0.04)",
                color:        "#fff",
                fontSize:     12,
              }}
            />
            <button
              onClick={() => remove(i)}
              disabled={coefficients.length <= 1}
              style={{
                fontSize:   15,
                background: "none",
                border:     "none",
                color:      coefficients.length <= 1 ? "rgba(255,100,100,0.2)" : "rgba(255,100,100,0.6)",
                cursor:     coefficients.length <= 1 ? "default" : "pointer",
                padding:    0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 10px" }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ params, onChange }) => (
  <div
    style={{
      width:           256,
      minWidth:        210,
      height:          "100%",
      overflowY:       "auto",
      padding:         "14px 13px",
      borderRight:     "1px solid rgba(255,255,255,0.07)",
      backgroundColor: "#0b0b0b",
      flexShrink:      0,
      boxSizing:       "border-box",
    }}
  >
    <SectionDivider title="Coefficients" />
    <CoefficientsEditor
      coefficients={params.coefficients}
      onChange={(c) => onChange({ coefficients: c })}
    />

    <SectionDivider title="Well bounds" />
    <SliderField
      label="x left"
      value={params.x_left}
      min={-8}
      max={-0.5}
      step={0.5}
      onChange={(v) => onChange({ x_left: v })}
      format={(v) => v.toFixed(1)}
    />
    <SliderField
      label="x right"
      value={params.x_right}
      min={0.5}
      max={8}
      step={0.5}
      onChange={(v) => onChange({ x_right: v })}
      format={(v) => v.toFixed(1)}
    />

    <SectionDivider title="Plot window" />
    <SliderField
      label="x min"
      value={params.x_min}
      min={-20}
      max={-0.5}
      step={0.5}
      onChange={(v) => onChange({ x_min: v })}
      format={(v) => v.toFixed(1)}
    />
    <SliderField
      label="x max"
      value={params.x_max}
      min={0.5}
      max={20}
      step={0.5}
      onChange={(v) => onChange({ x_max: v })}
      format={(v) => v.toFixed(1)}
    />

    <SectionDivider title="Time" />
    <SliderField
      label="t end"
      value={params.t_end}
      min={0.5}
      max={30}
      step={0.5}
      onChange={(v) => onChange({ t_end: v })}
      format={(v) => v.toFixed(1)}
    />
    <SliderField
      label="dt"
      value={params.dt}
      min={0.001}
      max={0.05}
      step={0.001}
      onChange={(v) => onChange({ dt: parseFloat(v.toFixed(3)) })}
      format={(v) => v.toFixed(3)}
    />
    <SliderField
      label="store every"
      value={params.store_every}
      min={1}
      max={20}
      step={1}
      onChange={(v) => onChange({ store_every: Math.round(v) })}
    />

    <SectionDivider title="Grid" />
    <NumberField
      label="N (grid points)"
      value={params.N}
      min={64}
      max={2048}
      step={64}
      onChange={(v) => onChange({ N: Math.max(64, Math.round(v / 64) * 64) })}
    />
  </div>
);