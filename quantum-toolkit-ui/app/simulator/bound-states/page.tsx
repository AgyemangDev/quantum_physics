"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";
import Navbar from "../../components/Navbars/Navbar";
import MetricCard from "@/app/components/Cards/MetricCard";
import { ChartPanel } from "@/app/components/Cards/ChartPanel";
import { EqPanel } from "@/app/components/EqPanel";

import EnergyLevelChart from "./EnergyLevelChart";
import ProbDensityChart  from "./ProbDensityChart";
import EnergyBarChart    from "./EnergyBarChart";
import { useInfiniteWell } from "./useInfiniteWell";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

// ─── Slider ───────────────────────────────────────────────────────────────────

function SliderField({ label, value, min, max, step, color = "#22d3ee", onChange, onCommit }: {
  label: string; value: number; min: number; max: number; step: number;
  color?: string; onChange: (v: number) => void; onCommit: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", fontFamily: "monospace", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 13, color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{value.toFixed(1)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerUp={e => onCommit(Number((e.target as HTMLInputElement).value))}
        style={{ width: "100%", cursor: "pointer", accentColor: color, height: 3 }}
      />
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATE_COLORS = ["#22d3ee","#a78bfa","#34d399","#f59e0b","#f87171",
                      "#38bdf8","#c084fc","#4ade80","#fbbf24","#fb7185"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InfiniteWellPage() {
  // Display values (update live while dragging)
  const [wellWidth, setWellWidth] = useState(10.0);
  const [nStates,   setNStates]   = useState(5);

  // Committed values (trigger API only on pointer release)
  const [wellWidthCommitted, setWellWidthCommitted] = useState(10.0);
  const [nStatesCommitted,   setNStatesCommitted]   = useState(5);

  const [selectedN, setSelectedN] = useState(0);  // ← was missing

  const { data, loading, error, compute } = useInfiniteWell();

  // Compute only when committed values change
  useEffect(() => {
    compute({ wellWidth: wellWidthCommitted, nStates: nStatesCommitted });
  }, [wellWidthCommitted, nStatesCommitted, compute]);

  // Clamp selectedN if nStates decreases
  useEffect(() => {
    if (selectedN >= nStates) setSelectedN(nStates - 1);
  }, [nStates, selectedN]);

  const selColor = STATE_COLORS[selectedN % STATE_COLORS.length];
  const numE     = data?.energies[selectedN]            ?? 0;
  const analE    = data?.analytical_energies[selectedN] ?? 0;
  const relErr   = analE > 0 ? Math.abs(numE - analE) / analE * 100 : 0;

  const maxRelErr = data
    ? Math.max(...data.energies.map((e, i) =>
        Math.abs(e - data.analytical_energies[i]) / data.analytical_energies[i] * 100
      )).toFixed(4)
    : "—";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void, #060810)" }}>
      <Navbar />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 320px) 1fr", minHeight: "calc(100vh - 52px)" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          padding: "20px 16px", display: "flex", flexDirection: "column", overflowY: "auto",
          background: "linear-gradient(180deg, #0b0f1a 0%, #070a12 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.16em", color: "rgba(148,163,184,0.45)", fontFamily: "monospace" }}>◈ Well Controls</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: loading ? "#f59e0b" : "#22c55e" }}>
              {loading ? "computing…" : "live"}
            </span>
          </div>

          <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", padding: "12px 10px" }}>
            <div style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", fontFamily: "monospace", marginBottom: 8 }}>Time-Independent Schrödinger</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Eq display tex={String.raw`\hat{H}\psi_n = E_n\psi_n`} />
            </div>
          </div>

          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148,163,184,0.35)", margin: "4px 0 12px", fontFamily: "monospace" }}>Parameters</div>

          <SliderField
            label="Well width  L" value={wellWidth} min={2} max={18} step={0.5} color="#22d3ee"
            onChange={setWellWidth}
            onCommit={setWellWidthCommitted}
          />
          <SliderField
            label="n states" value={nStates} min={1} max={10} step={1} color="#a78bfa"
            onChange={v => setNStates(Math.round(v))}
            onCommit={v => setNStatesCommitted(Math.round(v))}
          />

          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(148,163,184,0.35)", margin: "16px 0 10px", fontFamily: "monospace" }}>Select eigenstate</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {Array.from({ length: nStates }, (_, i) => (
              <button key={i} onClick={() => setSelectedN(i)} style={{
                padding: "6px 12px", fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                cursor: "pointer", borderRadius: 6,
                border: `1px solid ${selectedN === i ? STATE_COLORS[i] : "rgba(255,255,255,0.08)"}`,
                background: selectedN === i ? STATE_COLORS[i] + "22" : "transparent",
                color: selectedN === i ? STATE_COLORS[i] : "rgba(100,116,139,0.6)",
                transition: "all 0.15s",
              }}>
                n={i + 1}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "4px 0 16px" }} />

          <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: "10px 8px" }}>
            <div style={{ fontSize: 9, color: "rgba(148,163,184,0.35)", fontFamily: "monospace", marginBottom: 8 }}>Analytical energy levels</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Eq display tex={String.raw`E_n = \frac{n^2\pi^2\hbar^2}{2mL^2}`} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "9px 12px", background: "rgba(255,68,102,0.1)", border: "1px solid rgba(255,68,102,0.4)", borderRadius: 6, fontSize: 11, color: "#ff4466", fontFamily: "monospace" }}>
              {error}
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Metrics */}
          {data && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <MetricCard label="Well width  L"            value={data.well_width.toFixed(1)} color="#22d3ee" sub="x_right − x_left" />
              <MetricCard label={`E${selectedN + 1}  numerical`}  value={numE.toFixed(4)}  color={selColor} sub="eigenvalue" />
              <MetricCard label={`E${selectedN + 1}  analytical`} value={analE.toFixed(4)} color="#a78bfa"  sub="n²π²ℏ²/2mL²" />
              <MetricCard
                label="Relative error"
                value={`${relErr.toFixed(4)} %`}
                color={relErr < 0.1 ? "#22c55e" : "#f59e0b"}
                sub={relErr < 0.1 ? "< 0.1 %  ✓" : "> 0.1 %"}
              />
              <MetricCard label="n states" value={`${data.n_states}`} color="#94a3b8" sub="computed" />
            </div>
          )}

          {/* Charts row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <ChartPanel
              title="Energy level diagram"
              eq={<Eq tex={String.raw`\hat{H}\psi_n = E_n\psi_n`} />}
              legend={[{ color: "#f59e0b", label: "V(x)" }]}
            >
              {data
                ? <EnergyLevelChart data={data} selectedN={selectedN} />
                : <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(51,65,85,0.7)", fontFamily: "monospace", fontSize: 12 }}>Loading…</div>
              }
            </ChartPanel>

            <ChartPanel
              title={`Probability density  |ψ${selectedN + 1}(x)|²`}
              eq={<Eq tex={String.raw`|\psi_n(x)|^2`} />}
              legend={[{ color: STATE_COLORS[selectedN], label: `ψ${selectedN + 1}` }, { color: "rgba(245,158,11,0.5)", label: "V(x)" }]}
            >
              {data
                ? <ProbDensityChart data={data} selectedN={selectedN} />
                : <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(51,65,85,0.7)", fontFamily: "monospace", fontSize: 12 }}>Loading…</div>
              }
            </ChartPanel>
          </div>

          {/* Chart row 2 — full width */}
          <ChartPanel
            title="Numerical vs Analytical energies"
            eq={<Eq tex={String.raw`E_n = \frac{n^2\pi^2\hbar^2}{2mL^2}`} />}
            legend={[{ color: "#22d3ee", label: "Numerical" }, { color: "#a78bfa", label: "Analytical" }]}
          >
            {data
              ? <EnergyBarChart data={data} selectedN={selectedN} />
              : <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(51,65,85,0.7)", fontFamily: "monospace", fontSize: 12 }}>Loading…</div>
            }
          </ChartPanel>

          {/* Equation reference — 2 col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <EqPanel label="Hamiltonian"           tex={String.raw`\hat{H} = -\frac{\hbar^2}{2m}\frac{d^2}{dx^2} + V(x)`} />
            <EqPanel label="Normalization"         tex={String.raw`\int_{-\infty}^{+\infty}|\psi_n(x)|^2\,dx = 1`} />
            <EqPanel label="Infinite well potential" tex={String.raw`V(x) = \begin{cases} 0 & x \in [-L/2,\, L/2] \\ \infty & \text{otherwise} \end{cases}`} />
            <EqPanel label="Energy quantization"   tex={String.raw`E_n \propto \frac{n^2}{L^2}, \quad n = 1,2,3,\ldots`} />
          </div>

          {/* Physics callouts — separate from equation grid */}
          {data && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { text: "Energy is quantized — only discrete values Eₙ are allowed", color: "#22d3ee" },
                { text: "As L increases → Eₙ decreases  (Eₙ ∝ 1/L²)  — wider well = lower energy", color: "#a78bfa" },
                { text: `State n=${selectedN + 1} has ${selectedN} node(s) — more nodes = higher energy`, color: selColor },
                { text: `Max numerical error across all states: ${maxRelErr} %`, color: "#22c55e" },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.015)",
                  border: `1px solid ${item.color}33`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: "rgba(203,213,225,0.8)",
                  fontFamily: "monospace",
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: item.color, marginRight: 6 }}>◆</span>{item.text}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}