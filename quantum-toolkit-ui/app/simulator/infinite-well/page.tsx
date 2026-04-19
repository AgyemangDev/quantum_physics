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
import { useInfiniteWell } from "./useInfiniteWell";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

function SliderField({ label, value, min, max, step, color = "white", onChange, onCommit }: {
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

const STATE_COLORS = ["white","#a78bfa","#34d399","#f59e0b","#f87171",
                      "#38bdf8","#c084fc","#4ade80","#fbbf24","#fb7185"];

type ChartId = "energy" | "prob" | null;

export default function InfiniteWellPage() {
  const [wellWidth, setWellWidth] = useState(10.0);
  const [nStates,   setNStates]   = useState(5);
  const [wellWidthCommitted, setWellWidthCommitted] = useState(10.0);
  const [nStatesCommitted,   setNStatesCommitted]   = useState(5);
  const [selectedN, setSelectedN] = useState(0);
  const [expandedChart, setExpandedChart] = useState<ChartId>(null);

  const { data, loading, error, compute } = useInfiniteWell();

  useEffect(() => {
    compute({ wellWidth: wellWidthCommitted, nStates: nStatesCommitted });
  }, [wellWidthCommitted, nStatesCommitted, compute]);

  useEffect(() => {
    if (selectedN >= nStates) setSelectedN(nStates - 1);
  }, [nStates, selectedN]);

  // Escape key to close expanded chart
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setExpandedChart(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selColor = STATE_COLORS[selectedN % STATE_COLORS.length];
  const numE     = data?.energies[selectedN]            ?? 0;
  const analE    = data?.analytical_energies[selectedN] ?? 0;
  const relErr   = analE > 0 ? Math.abs(numE - analE) / analE * 100 : 0;

  const maxRelErr = data
    ? Math.max(...data.energies.map((e, i) =>
        Math.abs(e - data.analytical_energies[i]) / data.analytical_energies[i] * 100
      )).toFixed(4)
    : "—";

  const toggleChart = (id: ChartId) =>
    setExpandedChart(prev => (prev === id ? null : id));

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
            <span style={{ fontSize: 10, letterSpacing: "0.16em", color: "white", fontFamily: "monospace" }}>◈ Well Controls</span>
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

          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "white", margin: "4px 0 12px", fontFamily: "monospace" }}>Parameters</div>

          <SliderField
            label="Well width  L" value={wellWidth} min={2} max={12} step={0.5} color="white"
            onChange={setWellWidth}
            onCommit={setWellWidthCommitted}
          />
          <SliderField
            label="n states" value={nStates} min={1} max={10} step={1} color="white"
            onChange={v => setNStates(Math.round(v))}
            onCommit={v => setNStatesCommitted(Math.round(v))}
          />

          <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "white", margin: "16px 0 10px", fontFamily: "monospace" }}>Select eigenstate</div>

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
            <div style={{ fontSize: 9, color: "white", fontFamily: "monospace", marginBottom: 8 }}>Analytical energy levels</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Eq display tex={String.raw`E_n = \frac{n^2\pi^2\hbar^2}{2mL^2}`} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "9px 12px", background: "rgba(255,68,102,0.1)", border: "1px solid rgba(255,68,102,0.4)", borderRadius: 6, fontSize: 11, color: "white", fontFamily: "monospace" }}>
              {error}
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Metrics */}
          {data && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <MetricCard label="Well width  L"            value={data.well_width.toFixed(1)} color="white" sub="x_right − x_left" />
              <MetricCard label={`E${selectedN + 1}  numerical`}  value={numE.toFixed(4)}  color={selColor} sub="eigenvalue" />
              <MetricCard label={`E${selectedN + 1}  analytical`} value={analE.toFixed(4)} color="white"  sub="n²π²ℏ²/2mL²" />
              <MetricCard
                label="Relative error"
                value={`${relErr.toFixed(4)} %`}
                color={relErr < 0.1 ? "#22c55e" : "#f59e0b"}
                sub={relErr < 0.1 ? "< 0.1 %  ✓" : "> 0.1 %"}
              />
              <MetricCard label="n states" value={`${data.n_states}`} color="white" sub="computed" />
            </div>
          )}

          {/* ── Expanded chart view ── */}
          {expandedChart && data ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              {/* Hint bar */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8,
                fontSize: 10, fontFamily: "monospace", color: "rgba(148,163,184,0.5)",
              }}>
                <span>
                  {expandedChart === "energy" ? "Energy level diagram — expanded" : `Probability density |ψ${selectedN + 1}(x)|² — expanded`}
                </span>
                <button
                  onClick={() => setExpandedChart(null)}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(148,163,184,0.7)", borderRadius: 5, padding: "3px 10px",
                    fontFamily: "monospace", fontSize: 10, cursor: "pointer",
                  }}
                >
                  ✕ collapse  [Esc]
                </button>
              </div>

              {/* Expanded chart — full width, tall */}
              <div
                onClick={() => setExpandedChart(null)}
                style={{
                  flex: 1, minHeight: 480, cursor: "zoom-out",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 12, overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {expandedChart === "energy" ? (
                  <ChartPanel
                    title="Energy level diagram"
                    eq={<Eq tex={String.raw`\hat{H}\psi_n = E_n\psi_n`} />}
                    legend={[{ color: "#f59e0b", label: "V(x)" }]}
                  >
                    <EnergyLevelChart data={data} selectedN={selectedN} expanded />
                  </ChartPanel>
                ) : (
                  <ChartPanel
                    title={`Probability density  |ψ${selectedN + 1}(x)|²`}
                    eq={<Eq tex={String.raw`|\psi_n(x)|^2`} />}
                    legend={[{ color: STATE_COLORS[selectedN], label: `ψ${selectedN + 1}` }, { color: "rgba(245,158,11,0.5)", label: "V(x)" }]}
                  >
                    <ProbDensityChart data={data} selectedN={selectedN} expanded />
                  </ChartPanel>
                )}
              </div>

              {/* Other chart — compact below */}
              <div
                onClick={() => toggleChart(expandedChart === "energy" ? "prob" : "energy")}
                style={{
                  cursor: "zoom-in", opacity: 0.6,
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, overflow: "hidden",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
              >
                {expandedChart === "energy" ? (
                  <ChartPanel
                    title={`Probability density  |ψ${selectedN + 1}(x)|²`}
                    eq={<Eq tex={String.raw`|\psi_n(x)|^2`} />}
                    legend={[{ color: STATE_COLORS[selectedN], label: `ψ${selectedN + 1}` }]}
                  >
                    <ProbDensityChart data={data} selectedN={selectedN} />
                  </ChartPanel>
                ) : (
                  <ChartPanel
                    title="Energy level diagram"
                    eq={<Eq tex={String.raw`\hat{H}\psi_n = E_n\psi_n`} />}
                    legend={[{ color: "#f59e0b", label: "V(x)" }]}
                  >
                    <EnergyLevelChart data={data} selectedN={selectedN} />
                  </ChartPanel>
                )}
              </div>
            </div>

          ) : (
            /* ── Normal 2-column grid ── */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div
                onClick={() => toggleChart("energy")}
                style={{ cursor: "zoom-in", borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                title="Click to expand"
              >
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
              </div>

              <div
                onClick={() => toggleChart("prob")}
                style={{ cursor: "zoom-in", borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                title="Click to expand"
              >
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
            </div>
          )}

          {/* Physics callouts */}
          {data && !expandedChart && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { text: "Energy is quantized — only discrete values Eₙ are allowed", color: "white" },
                { text: "As L increases → Eₙ decreases  (Eₙ ∝ 1/L²)  — wider well = lower energy", color: "#a78bfa" },
                { text: `State n=${selectedN + 1} has ${selectedN} node(s) — more nodes = higher energy`, color: selColor },
                { text: `Max numerical error across all states: ${maxRelErr} %`, color: "#22c55e" },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.015)",
                  border: `1px solid ${item.color}33`,
                  borderRadius: 8, fontSize: 11,
                  color: "rgba(203,213,225,0.8)", fontFamily: "monospace", lineHeight: 1.6,
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