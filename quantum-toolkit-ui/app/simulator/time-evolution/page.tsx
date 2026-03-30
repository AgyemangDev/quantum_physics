"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";
import Navbar from "../../components/Navbars/Navbar";
import MetricCard from "@/app/components/Cards/MetricCard";
import { ChartPanel } from "@/app/components/Cards/ChartPanel";

import Sidebar from "./Sidebar";
import LineChart from "./LineChart";
import { useEvolve, useAnimation, computeTR } from "./useEvolve";
import type { Potential, Speed, TunnelingMode } from "./types";
import { TimelineBar } from "@/app/components/TimelineBar";
import { EqPanel } from "@/app/components/EqPanel";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;


const SPEEDS: Speed[] = [0.1, 0.5, 1, 2, 5];

const EMPTY = (
  <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(51,65,85,0.7)", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.06em" }}>
    Adjust sliders to start. 
  </div>
);

export default function TimeEvolutionPage() {
  const [x0,            setX0]            = useState(-4.0);
  const [sigma,         setSigma]         = useState(0.8);
  const [k0,            setK0]            = useState(4.0);
  const [V0,            setV0]            = useState(8.0);
  const [potential,     setPotential]     = useState<Potential>("barrier");
  const [barrierWidth,  setBarrierWidth]  = useState(1.0);
  const [amplitude,     setAmplitude]     = useState(1.0);
  const [tunnelingMode, setTunnelingMode] = useState<TunnelingMode>("tunneling");
  const [tEnd,          setTEnd]          = useState(10.0);
  const { data, loading, error, compute } = useEvolve();
  const { frame, playing, speed, setSpeed, togglePlay, reset, seek } = useAnimation(data);

  const currentFrame = data?.frames[frame];
  const x     = data?.x    ?? [];
  const V     = data?.V    ?? [];
  const rawVmax = V.length ? Math.max(...V) : 1;
  const Vmax = Math.min(rawVmax, 50);
  const prob  = currentFrame?.prob ?? [];
  const real  = currentFrame?.real ?? [];
  const imag  = currentFrame?.imag ?? [];
  const times = data?.times ?? [];

  const isLastFrame = data ? frame === data.n_frames - 1 : false;
  const { T, R } = data && potential === "barrier" ? computeTR(data) : { T: 0, R: 0 };


const handleCompute = useCallback(() => {
  compute({
    x0, sigma, k0, potential,
    V0,
    tEnd,
    barrier_width: barrierWidth,
    amplitude,
    tunnelingMode,
  });
}, [x0, sigma, k0, potential, V0, tEnd, barrierWidth, amplitude, tunnelingMode, compute]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void, #060810)" }}>
      <Navbar />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 340px) 1fr", minHeight: "calc(100vh - 52px)" }}>

        <Sidebar
          x0={x0}                       setX0={setX0}
          sigma={sigma}                 setSigma={setSigma}
          k0={k0}                       setK0={setK0}
          V0={V0}                       setV0={setV0}
          barrierWidth={barrierWidth}   setBarrierWidth={setBarrierWidth}
          amplitude={amplitude}         setAmplitude={setAmplitude}
          tunnelingMode={tunnelingMode} setTunnelingMode={setTunnelingMode}
          tEnd={tEnd}                   setTEnd={setTEnd}
          potential={potential}         setPotential={setPotential}
          loading={loading}
          error={error}
          onCompute={handleCompute}
        />

        <main style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
{/* 
          {loading && (
            <div style={{ padding: "14px", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "#22d3ee", letterSpacing: "0.1em", opacity: 0.8 }}>
              ⟳ &nbsp;Solving Schrödinger equation…
            </div>
          )} */}

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
              <MetricCard label="Frame"   value={`${frame} / ${data.n_frames - 1}`}    color="#22d3ee" sub="animation step" />
              <MetricCard label="Time  t" value={`${(times[frame] ?? 0).toFixed(3)} s`} color="#a78bfa" sub="evolution time" />
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
          <ChartPanel
            title="Probability density"
            eq={<Eq tex={String.raw`|\psi(x,t)|^2`} />}
            legend={[{ color: "#22d3ee", label: "|ψ|²" }, { color: "rgba(251,191,36,0.55)", label: "V(x)" }]}
          >
            {data ? <LineChart x={x} y={prob} V={V} Vmax={Vmax} color="#22d3ee" /> : EMPTY}
            
            {/* ADD this block: */}
            {potential === "barrier" && tunnelingMode === "wall" && data && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 6, fontSize: 10, color: "#f87171", fontFamily: "monospace" }}>
                Potential Wall — V₀ ≫ E → full reflection, T ≈ 0
              </div>
            )}
            
            {potential === "barrier" && data && (
              <div style={{ marginTop: 10 }}>
                <EqPanel label="T & R integrals" tex={String.raw`T=\!\int_{0.5}^{+\infty}\!|\psi|^2\,dx,\quad R=\!\int_{-\infty}^{-0.5}\!|\psi|^2\,dx`} />
              </div>
            )}
          </ChartPanel>

            <ChartPanel
              title="Real & imaginary parts"
              eq={<Eq tex={String.raw`\psi=\mathrm{Re}(\psi)+i\,\mathrm{Im}(\psi)`} />}
              legend={[{ color: "#22d3ee", label: "Re(ψ)" }, { color: "#a78bfa", label: "Im(ψ)" }]}
            >
              {data ? <LineChart x={x} y={real} y2={imag} color="#22d3ee" color2="#a78bfa" /> : EMPTY}
            </ChartPanel>

            <ChartPanel
              title="Potential  V(x)"
              eq={<Eq tex={String.raw`V(x)`} />}
              legend={[{ color: "#f59e0b", label: "static — does not change with time" }]}
            >
              {data ? <LineChart x={x} y={V} color="#f59e0b" /> : EMPTY}
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