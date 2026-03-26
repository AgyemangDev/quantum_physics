"use client";
import dynamic from "next/dynamic";
import type EqType from "../Eq";
import EqBox from "../Cards/EqBox";
import SliderField from "../Slider/SliderField";
import NormBar from "./NormBar";

const Eq = dynamic(() => import("../Eq"), { ssr: false }) as typeof EqType;

export default function Sidebar({
  x0, sigma, k0, norm, loading, error,
  setX0, setSigma, setK0,
}: {
  x0: number; sigma: number; k0: number;
  norm: number | null;
  loading: boolean; error: string | null;
  setX0: (v: number) => void;
  setSigma: (v: number) => void;
  setK0: (v: number) => void;
}) {
  return (
    <aside style={{
      borderRight: "1px solid var(--border)",
      padding: "20px 16px",
      background: "var(--bg-deep)",
      overflowY: "auto",
      overflowX: "hidden",
      minWidth: 0,
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" as const }}>
          ◈ Wave Packet
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)" }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", display: "inline-block",
            background: loading ? "var(--amber)" : "var(--green)",
            animation: loading ? "pulse-glow 1s infinite" : "none",
          }} />
          {loading ? "updating…" : "live"}
        </span>
      </div>

      {/* Wave function equation */}
      <div style={{
        background: "rgba(0,229,255,0.04)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "12px 14px",
        marginBottom: 20,
        width: "100%",
        boxSizing: "border-box" as const,
      }}>
        <div style={{
          fontSize: 10, color: "var(--text-muted)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em", marginBottom: 10,
        }}>
          Wave function
        </div>

        {/* Wrap both lines in a scaled-down container */}
        <div style={{ fontSize: "0.78em" }}>
          {/* Line 1: ψ(x) = (2πσ²)^{-1/4} · exp(...) */}
          <div style={{ marginBottom: 8, overflowX: "auto" }}>
            <Eq display tex={String.raw`\psi(x) = \left(2\pi\sigma^2\right)^{-1/4} \exp\!\left(-\frac{(x-x_0)^2}{4\sigma^2}\right)`} />
          </div>

          {/* Line 2: × e^{ik₀x} */}
          <div style={{ overflowX: "auto" }}>
            <Eq display tex={String.raw`\times\; e^{\,ik_0 x}`} />
          </div>
        </div>

        {/* Plain-text breakdown */}
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column" as const,
          gap: 4,
        }}>
          {[
            { symbol: "(2πσ²)^{-1/4}", label: "normalisation factor" },
            { symbol: "exp(−…/4σ²)",   label: "Gaussian envelope" },
            { symbol: "e^{ik₀x}",      label: "momentum phase" },
          ].map(({ symbol, label }) => (
            <div key={label} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)",
                color: "var(--cyan)", minWidth: 100, flexShrink: 0,
              }}>
                {symbol}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <SliderField
        label="Centre x₀" value={x0} min={-5} max={5} step={0.5}
        onChange={setX0}
        explanation="Shifts the packet's centre. Moving left or right changes the particle's starting position."
      />
      <SliderField
        label="Width σ" value={sigma} min={0.2} max={3.0} step={0.1}
        color="var(--green)" onChange={setSigma}
        explanation="Wider σ → spread in position, sharp in momentum. Narrower σ → localised, but momentum uncertain."
      />
      <SliderField
        label="Wave vector k₀" value={k0} min={-8} max={8} step={0.5}
        color="var(--violet)" onChange={setK0}
        explanation="Average momentum p = ħk₀. Positive moves right, negative moves left. Higher |k₀| = faster."
      />

      {/* Norm */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        {norm !== null
          ? <NormBar norm={norm} />
          : <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Adjust a slider to compute</div>
        }
      </div>

      {error && (
        <div style={{
          marginTop: 10, padding: "9px 12px",
          background: "rgba(255,68,102,0.1)",
          border: "1px solid rgba(255,68,102,0.4)",
          borderRadius: 6, fontSize: 11, color: "#ff4466",
        }}>
          {error}
        </div>
      )}
    </aside>
  );
}