"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
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
      color: "rgba(255,255,255,0.85)",
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
    }}>
      <div style={{
        padding: "6px 12px",
        fontSize: 9,
        color: "rgba(255,255,255,0.85)",
        fontFamily: "monospace",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {label}
      </div>
      <div style={{ padding: "14px 10px", display: "flex", justifyContent: "center" }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: "monospace", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {value.toFixed(1)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", cursor: "pointer", accentColor: color, height: 3 }}
      />
    </div>
  );
}

// ─── Potential descriptions ────────────────────────────────────

const POTENTIALS: { key: Potential; label: string; desc: string }[] = [
  { key: "free",    label: "Free",    desc: "no potential" },
  { key: "barrier", label: "Barrier", desc: "tunneling" },
  { key: "step",    label: "Step",    desc: "reflect / transmit" },
  { key: "wall",    label: "Wall",    desc: "hard boundary" },
];

// ─── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  x0: number;           setX0: (v: number) => void;
  sigma: number;        setSigma: (v: number) => void;
  k0: number;           setK0: (v: number) => void;
  V0: number;           setV0: (v: number) => void;
  barrierWidth: number; setBarrierWidth: (v: number) => void;
  amplitude: number;    setAmplitude: (v: number) => void;
  tEnd: number;         setTEnd: (v: number) => void;
  potential: Potential; setPotential: (p: Potential) => void;
  loading: boolean;
  onCompute: () => void;
  error?: string | null;
}

export default function Sidebar({
  x0, setX0,
  sigma, setSigma,
  k0, setK0,
  V0, setV0,
  barrierWidth, setBarrierWidth,
  amplitude, setAmplitude,
  tEnd, setTEnd,
  potential, setPotential,
  loading, onCompute,
  error,
}: SidebarProps) {

  const onComputeRef = useRef(onCompute);
  useEffect(() => { onComputeRef.current = onCompute; });

  // Auto-recompute 300 ms after any parameter change
  useEffect(() => {
    const t = setTimeout(() => onComputeRef.current(), 300);
    return () => clearTimeout(t);
  }, [x0, sigma, k0, V0, potential, tEnd, barrierWidth, amplitude]);

  // Conditionally show V0 / barrier-width sliders
  const showV0      = potential !== "free" && potential !== "wall";
  const showBarrier = potential === "barrier";

  return (
    <aside style={{
      width: "320px",
      minWidth: "300px",
      maxWidth: "340px",
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      background: "linear-gradient(180deg, #0b0f1a 0%, #070a12 100%)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04)",
    }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.16em", color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>
          ◈ Quantum Controls
        </span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: loading ? "#f59e0b" : "#22c55e" }}>
          {loading ? "computing…" : "live"}
        </span>
      </div>

      <EqDisplay
        label="Schrödinger equation"
        tex={String.raw`i\hbar\frac{\partial\psi}{\partial t}=\!\left(-\frac{\hbar^2}{2m}\frac{\partial^2}{\partial x^2}+V(x)\right)\!\psi`}
      />

      {/* Potential type selector */}
      <SectionLabel>Potential type</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 18 }}>
        {POTENTIALS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setPotential(key)}
            style={{
              padding: "8px 6px",
              fontFamily: "monospace", fontSize: 11, fontWeight: 700,
              cursor: "pointer", borderRadius: 6,
              border: `1px solid ${potential === key ? "#22d3ee" : "rgba(255,255,255,0.08)"}`,
              background: potential === key ? "rgba(34,211,238,0.1)" : "transparent",
              color: potential === key ? "#22d3ee" : "rgba(255,255,255,0.75)",
              transition: "all 0.18s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}
          >
            <span>{label}</span>
            <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 400 }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* Potential description */}
      <div style={{ marginBottom: 16, fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", lineHeight: 1.6 }}>
        {potential === "free"    && "V(x) = 0 everywhere. Wavepacket spreads freely with no reflection. Uses periodic (ring) boundary."}
        {potential === "barrier" && "Finite rectangular barrier at centre. Wave partially tunnels through (T) and partially reflects (R). Adjust V₀ and barrier width."}
        {potential === "step"    && "Abrupt potential step at x = 0. Partial reflection and transmission depending on E vs V₀."}
        {potential === "wall"    && "Infinite-wall boundary at domain edges. Wave fully reflects and forms standing-wave interference. V₀ slider has no effect here."}
      </div>

      <SectionLabel>Initial wavepacket</SectionLabel>

      <SliderField label="x₀  (initial position)" value={x0}    min={-8}  max={0}   step={0.5} onChange={setX0} />
      <SliderField label="σ   (spatial width)"     value={sigma} min={0.2} max={2.0} step={0.1} color="#22c55e" onChange={setSigma} />
      <SliderField label="k₀  (mean momentum)"     value={k0}    min={1}   max={8}   step={0.5} color="#a78bfa" onChange={setK0} />

      {/*
        Amplitude is a VERTICAL SCALE on the wavefunction peak.
        It is independent of σ (spatial spread).
        The backend applies it directly to psi0 before time evolution,
        so amplitude persists consistently across all frames.
      */}
      <SliderField label="A   (wave amplitude)"   value={amplitude} min={0.5} max={3.0} step={0.1} color="#fb923c" onChange={setAmplitude} />

      {showV0 && (
        <SliderField label="V₀  (potential height)" value={V0} min={0} max={30} step={0.5} color="#f59e0b" onChange={setV0} />
      )}

      {showBarrier && (
        <SliderField label="w   (barrier width)" value={barrierWidth} min={0.2} max={4.0} step={0.1} color="#f59e0b" onChange={setBarrierWidth} />
      )}

      <SliderField label="t_max  (simulation time)" value={tEnd} min={1} max={20} step={1} color="#38bdf8" onChange={setTEnd} />

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "16px 0" }} />

      {/* Physics notes for barrier */}
      {potential === "barrier" && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontFamily: "monospace", lineHeight: 1.7, marginBottom: 12 }}>
          <div>E ≈ k₀²/2  (kinetic energy)</div>
          <div>Tunneling: E &lt; V₀</div>
          <div>Higher V₀ or wider barrier → lower T</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(255,68,102,0.1)", border: "1px solid rgba(255,68,102,0.4)", borderRadius: 6, fontSize: 11, color: "#ff4466", fontFamily: "monospace" }}>
          {error}
        </div>
      )}
    </aside>
  );
}