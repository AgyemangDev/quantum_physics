"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import type EqType from "../../components/Eq";
import type { Potential } from "./types";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

// ─── Section Label ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "rgba(148,163,184,0.35)",
      margin: "18px 0 10px",
      fontFamily: "monospace",
    }}>
      {children}
    </div>
  );
}

// ─── Equation Card ─────────────────────────────────────────────

function EqDisplay({ label, tex }: { label: string; tex: string }) {
  return (
    <div style={{
      marginBottom: 16,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.06)",
      background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      backdropFilter: "blur(6px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      transition: "all 0.2s ease",
    }}>
      <div style={{
        padding: "6px 12px",
        fontSize: 9,
        color: "rgba(148,163,184,0.45)",
        fontFamily: "monospace",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {label}
      </div>

      <div style={{
        padding: "14px 10px",
        display: "flex",
        justifyContent: "center",
      }}>
        <Eq display tex={tex} />
      </div>
    </div>
  );
}

// ─── Slider ────────────────────────────────────────────────────

function SliderField({
  label, value, min, max, step, color = "#22d3ee", onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  color?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 10,
          color: "rgba(148,163,184,0.6)",
          fontFamily: "monospace",
          letterSpacing: "0.08em"
        }}>
          {label}
        </span>

        <span style={{
          fontSize: 13,
          color,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700
        }}>
          {value.toFixed(1)}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          cursor: "pointer",
          accentColor: color,
          height: 3,
        }}
      />
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  x0: number; setX0: (v: number) => void;
  sigma: number; setSigma: (v: number) => void;
  k0: number; setK0: (v: number) => void;
  V0: number; setV0: (v: number) => void;

  // ✅ NEW
  tEnd: number;
  setTEnd: (v: number) => void;

  potential: Potential;
  setPotential: (p: Potential) => void;

  loading: boolean;
  onCompute: () => void;

  // optional
  error?: string | null;
}

export default function Sidebar({
  x0, setX0, sigma, setSigma, k0, setK0, V0, setV0,
  potential, setPotential, tEnd, setTEnd,
  loading, onCompute,
}: SidebarProps) {

  // ✅ Auto compute
  useEffect(() => {
    const t = setTimeout(onCompute, 140);
    return () => clearTimeout(t);
  }, [x0, sigma, k0, V0, potential, tEnd]);

  return (
    <aside style={{
      width: "320px",
      minWidth: "300px",
      maxWidth: "340px",
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",

      // 🔥 modern glass panel
      background: "linear-gradient(180deg, #0b0f1a 0%, #070a12 100%)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04)",
    }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
      }}>
        <span style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "rgba(148,163,184,0.45)",
          fontFamily: "monospace",
        }}>
          ◈ Quantum Controls
        </span>

        <span style={{
          fontSize: 9,
          fontFamily: "monospace",
          color: loading ? "#f59e0b" : "#22c55e",
        }}>
          {loading ? "computing…" : "live"}
        </span>
      </div>

      {/* Equation */}
      <EqDisplay
        label="Schrödinger equation"
        tex={String.raw`i\hbar\frac{\partial\psi}{\partial t}=\left(-\frac{\hbar^2}{2m}\frac{\partial^2}{\partial x^2}+V(x)\right)\psi`}
      />

      {/* Controls */}
      <SectionLabel>Initial conditions</SectionLabel>

      <SliderField label="x₀ (position)" value={x0} min={-8} max={0} step={0.5} onChange={setX0} />
      <SliderField label="σ (spread)" value={sigma} min={0.2} max={2} step={0.1} color="#22c55e" onChange={setSigma} />
      <SliderField label="k₀ (momentum)" value={k0} min={1} max={8} step={0.5} color="#a78bfa" onChange={setK0} />
      <SliderField label="V₀ (potential)" value={V0} min={0} max={30} step={0.5} color="#f59e0b" onChange={setV0} />
      <SliderField
  label="t_max (time)"
  value={tEnd}
  min={1}
  max={20}
  step={0.5}
  color="#38bdf8"
  onChange={setTEnd}
/>

      {/* Divider */}
      <div style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        margin: "16px 0"
      }} />

      {/* Method */}
      <SectionLabel>Numerics</SectionLabel>

      <EqDisplay
        label="Crank–Nicolson scheme"
        tex={String.raw`\left(I+\frac{i\Delta t}{2\hbar}H\right)\psi^{n+1}=\left(I-\frac{i\Delta t}{2\hbar}H\right)\psi^{n}`}
      />

    </aside>
  );
}