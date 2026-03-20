"use client";
import dynamic from "next/dynamic";
import type EqType from "../Eq";
import EqBox from "../Cards/EqBox";
import SliderField from "../Slider/SliderField";
import NormBar from "./NormBar";
import { Dimension } from "../types";

const Eq = dynamic(() => import("../Eq"), { ssr: false }) as typeof EqType;

const DIMS: Dimension[] = ["1D", "3D"];

export default function Sidebar({
  x0, sigma, k0, dim, norm, loading, error,
  setX0, setSigma, setK0, setDim,
}: {
  x0: number; sigma: number; k0: number;
  dim: Dimension; norm: number | null;
  loading: boolean; error: string | null;
  setX0: (v: number) => void;
  setSigma: (v: number) => void;
  setK0: (v: number) => void;
  setDim: (d: Dimension) => void;
}) {
  return (
    <aside style={{ borderRight: "1px solid var(--border)", padding: "20px 16px", background: "var(--bg-deep)", overflowY: "auto" }}>

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

      <EqBox>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6 }}>
          Wave function
        </div>
        <Eq display tex={String.raw`\psi(x)=\!\left(2\pi\sigma^2\right)^{\!-1/4}\exp\!\left(-\frac{(x-x_0)^2}{4\sigma^2}\right)e^{ik_0 x}`} />
      </EqBox>

      <SliderField label="Centre x₀" value={x0} min={-5} max={5} step={0.5} onChange={setX0}
        explanation="Shifts the packet's centre. Moving left or right changes the particle's starting position." />
      <SliderField label="Width σ" value={sigma} min={0.2} max={3.0} step={0.1} color="var(--green)" onChange={setSigma}
        explanation="Wider σ → spread in position, sharp in momentum. Narrower σ → localised, but momentum uncertain." />
      <SliderField label="Wave vector k₀" value={k0} min={-8} max={8} step={0.5} color="var(--violet)" onChange={setK0}
        explanation="Average momentum p = ħk₀. Positive moves right, negative moves left. Higher |k₀| = faster." />

      {/* Dimension toggle — only affects the Re(ψ)/Im(ψ) chart */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>
          Re(ψ) view
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
          Applies only to the oscillation chart (chart 3)
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {DIMS.map(d => (
            <button key={d} onClick={() => setDim(d)} style={{
              flex: 1, padding: "7px 0",
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.05em", cursor: "pointer", borderRadius: 5,
              border: `1px solid ${dim === d ? "var(--violet)" : "var(--border)"}`,
              background: dim === d ? "rgba(139,92,246,0.12)" : "transparent",
              color: dim === d ? "var(--violet)" : "var(--text-muted)",
              transition: "all 0.18s",
            }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
          {dim === "1D" && "Standard line chart — Re(ψ) and Im(ψ) along x."}
          {dim === "3D" && "Wireframe surface — Re(ψ(x,y)) as seen in physics textbooks."}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        {norm !== null
          ? <NormBar norm={norm} />
          : <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Adjust a slider to compute</div>
        }
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(255,68,102,0.1)", border: "1px solid rgba(255,68,102,0.4)", borderRadius: 6, fontSize: 11, color: "#ff4466" }}>
          {error}
        </div>
      )}
    </aside>
  );
}