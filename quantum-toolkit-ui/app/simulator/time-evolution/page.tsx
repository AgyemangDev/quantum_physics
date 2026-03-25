"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";
import Navbar from "../../components/Navbars/Navbar";

import Sidebar from "./Sidebar";
import LineChart from "./LineChart";
import { useEvolve, useAnimation, computeTR } from "./useEvolve";
import type { Potential, Speed } from "./types";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

// ─── UI primitives ────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, sub, footer }: {
  label: string; value: string; color: string; sub?: string; footer?: React.ReactNode;
}) {
  return (
    <div style={{ padding: "12px 16px", flex: 1, minWidth: 130, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
      <div style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub    && <div style={{ fontSize: 10, color: "rgba(100,116,139,0.7)", marginTop: 2 }}>{sub}</div>}
      {footer && <div style={{ marginTop: 6 }}>{footer}</div>}
    </div>
  );
}

function ChartPanel({ title, eq, legend, children }: {
  title: string; eq?: React.ReactNode;
  legend?: Array<{ color: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>{title}</span>
        {eq && <div style={{ fontSize: "0.72em", opacity: 0.55 }}>{eq}</div>}
      </div>
      {children}
      {legend && (
        <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
          {legend.map(l => <span key={l.label} style={{ fontSize: 10, color: l.color, fontFamily: "monospace" }}>— {l.label}</span>)}
        </div>
      )}
    </div>
  );
}

function EqPanel({ label, tex }: { label: string; tex: string }) {
  return (
    <div style={{ padding: "8px 14px 12px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: 9, color: "rgba(148,163,184,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
      <Eq display tex={tex} />
    </div>
  );
}

function TimelineBar({ frame, nFrames, times, onSeek }: {
  frame: number; nFrames: number; times: number[]; onSeek: (f: number) => void;
}) {
  const pct = nFrames > 1 ? (frame / (nFrames - 1)) * 100 : 0;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (nFrames - 1)));
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", minWidth: 46 }}>{(times[frame] ?? 0).toFixed(2)}s</span>
      <div onClick={handleClick} style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 99, cursor: "pointer", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#22d3ee", borderRadius: 99, transition: "width 0.04s linear" }} />
        <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee99", transition: "left 0.04s linear" }} />
      </div>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", minWidth: 46, textAlign: "right" }}>{(times[nFrames - 1] ?? 3).toFixed(2)}s</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SPEEDS: Speed[] = [0.1,0.5, 1, 2, 5];

const EMPTY = (
  <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(51,65,85,0.7)", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.06em" }}>
    press Compute to start
  </div>
);

export default function TimeEvolutionPage() {
  const [x0,        setX0]        = useState(-4.0);
  const [sigma,     setSigma]     = useState(0.8);
  const [k0,        setK0]        = useState(4.0);
  const [V0,        setV0]        = useState(8.0);
  const [potential, setPotential] = useState<Potential>("barrier");
  const [tEnd, setTEnd] = useState(3.0);

  const { data, loading, error, compute } = useEvolve();
  const { frame, playing, speed, setSpeed, togglePlay, reset, seek } = useAnimation(data);

  const currentFrame = data?.frames[frame];
  const x     = data?.x    ?? [];
  const V     = data?.V    ?? [];
  const Vmax  = V.length ? Math.max(...V) || 1 : 1;
  const prob  = currentFrame?.prob ?? [];
  const real  = currentFrame?.real ?? [];
  const imag  = currentFrame?.imag ?? [];
  const times = data?.times ?? [];

  const isLastFrame = data ? frame === data.n_frames - 1 : false;
  const { T, R } = data && potential === "barrier" ? computeTR(data) : { T: 0, R: 0 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void, #060810)" }}>
      <Navbar />

      <div style={{
  display: "grid",
  gridTemplateColumns: "minmax(300px, 340px) 1fr",
  minHeight: "calc(100vh - 52px)"
}}>

<Sidebar
  x0={x0} setX0={setX0}
  sigma={sigma} setSigma={setSigma}
  k0={k0} setK0={setK0}
  V0={V0} setV0={setV0}

  tEnd={tEnd}             // ✅ ADD
  setTEnd={setTEnd}       // ✅ ADD

  potential={potential}
  setPotential={setPotential}

  loading={loading}
  onCompute={() =>
    compute({ x0, sigma, k0, potential, V0, tEnd }) // ✅ include tEnd
  }
        />

        <main style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {loading && (
            <div style={{ padding: "14px", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "#22d3ee", letterSpacing: "0.1em", opacity: 0.8 }}>
              ⟳ &nbsp;Solving Schrödinger equation…
            </div>
          )}

          {/* Animation controls */}
          {data && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <TimelineBar frame={frame} nFrames={data.n_frames} times={times} onSeek={seek} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={togglePlay} style={{ padding: "6px 20px", fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 6, border: "1px solid rgba(34,211,238,0.35)", background: "rgba(34,211,238,0.07)", color: "#22d3ee" }}>
                  {playing ? "⏸  Pause" : "▶  Play"}
                </button>
                <button onClick={reset} style={{ padding: "6px 14px", fontFamily: "monospace", fontSize: 12, cursor: "pointer", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#94a3b8" }}>
                  ↺  Reset
                </button>
                <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => setSpeed(s)} style={{ padding: "5px 10px", fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: 5, border: `1px solid ${speed === s ? "#f59e0b" : "rgba(255,255,255,0.07)"}`, background: speed === s ? "rgba(245,158,11,0.09)" : "transparent", color: speed === s ? "#f59e0b" : "rgba(100,116,139,0.7)" }}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metrics */}
          {data && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <MetricCard label="Frame"   value={`${frame} / ${data.n_frames - 1}`}          color="#22d3ee" sub="animation step" />
              <MetricCard label="Time  t" value={`${(times[frame] ?? 0).toFixed(3)} s`}       color="#a78bfa" sub="evolution time" />
              {potential === "barrier" && isLastFrame && (
                <>
                  <MetricCard label="T  transmission" value={T.toFixed(4)} color="#22c55e" sub="∫|ψ|² dx   x > 0.5"  footer={<Eq tex={String.raw`T=\int_{0.5}^{+\infty}|\psi|^2\,dx`} />} />
                  <MetricCard label="R  reflection"   value={R.toFixed(4)} color="#f87171" sub="∫|ψ|² dx   x < −0.5" footer={<Eq tex={String.raw`R=\int_{-\infty}^{-0.5}|\psi|^2\,dx`} />} />
                  <div style={{ padding: "12px 16px", flex: 1, minWidth: 140, background: "rgba(255,255,255,0.02)", border: `1px solid ${Math.abs(T + R - 1) < 0.02 ? "rgba(34,197,94,0.28)" : "rgba(248,113,113,0.28)"}`, borderRadius: 10 }}>
                    <div style={{ fontSize: 9, color: "rgba(148,163,184,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, fontFamily: "monospace" }}>T + R</div>
                    <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: Math.abs(T + R - 1) < 0.02 ? "#22c55e" : "#f87171" }}>{(T + R).toFixed(4)}</div>
                    <div style={{ fontSize: 10, color: "rgba(100,116,139,0.7)", marginTop: 2 }}>{Math.abs(T + R - 1) < 0.02 ? "≈ 1.0  ✓  conserved" : "≠ 1.0  ✗"}</div>
                    <div style={{ marginTop: 8 }}><Eq display tex={String.raw`T + R = 1`} /></div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Charts 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <ChartPanel title="Probability density" eq={<Eq tex={String.raw`|\psi(x,t)|^2`} />} legend={[{ color: "#22d3ee", label: "|ψ|²" }, { color: "rgba(251,191,36,0.55)", label: "V(x)" }]}>
              {data ? <LineChart x={x} y={prob} V={V} Vmax={Vmax} color="#22d3ee" /> : EMPTY}
              {potential === "barrier" && data && <div style={{ marginTop: 10 }}><EqPanel label="T & R integrals" tex={String.raw`T=\!\int_{0.5}^{+\infty}\!|\psi|^2\,dx,\quad R=\!\int_{-\infty}^{-0.5}\!|\psi|^2\,dx`} /></div>}
            </ChartPanel>

            <ChartPanel title="Real & imaginary parts" eq={<Eq tex={String.raw`\psi=\mathrm{Re}(\psi)+i\,\mathrm{Im}(\psi)`} />} legend={[{ color: "#22d3ee", label: "Re(ψ)" }, { color: "#a78bfa", label: "Im(ψ)" }]}>
              {data ? <LineChart x={x} y={real} y2={imag} color="#22d3ee" color2="#a78bfa" /> : EMPTY}
            </ChartPanel>

            <ChartPanel title="Potential  V(x)" eq={<Eq tex={String.raw`V(x)`} />}>
              {data ? <LineChart x={x} y={V} color="#f59e0b" /> : EMPTY}
            </ChartPanel>

            <ChartPanel title="|ψ|² with V(x) overlay" eq={<Eq tex={String.raw`|\psi|^2\!+\!V`} />} legend={[{ color: "#22c55e", label: "|ψ|²" }, { color: "rgba(251,191,36,0.55)", label: "V(x) dashed" }]}>
              {data ? <LineChart x={x} y={prob} V={V} Vmax={Vmax} color="#22c55e" /> : EMPTY}
            </ChartPanel>
          </div>

          {/* Equation reference */}
          {data && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <EqPanel label="Time-dependent Schrödinger equation" tex={String.raw`i\hbar\frac{\partial\psi}{\partial t}=\!\left(-\frac{\hbar^2}{2m}\frac{\partial^2}{\partial x^2}+V(x)\right)\!\psi`} />
              <EqPanel label="Crank–Nicolson scheme"               tex={String.raw`\left(I+\frac{i\Delta t}{2\hbar}H\right)\!\psi^{n+1}=\!\left(I-\frac{i\Delta t}{2\hbar}H\right)\!\psi^{n}`} />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}