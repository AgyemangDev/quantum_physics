// page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TopBar }           from "./TopBar";
import { Sidebar }          from "./Sidebar";
import { useSimulation, usePlayback } from "./useSimulation";
import type { SimulationParams, PlaybackSpeed, SimulationResult } from "./types";

const DEFAULT_PARAMS: SimulationParams = {
  coefficients: [0, 1, 0.7],
  x_left:       -5,
  x_right:       5,
  t_end:         10,
  dt:            0.01,
  store_every:   10,
  x_min:        -8,
  x_max:         8,
  N:             512,
};

// ─── Canvas renderer ──────────────────────────────────────────────────────────

interface WaveCanvasProps {
  result:     SimulationResult;
  frameIndex: number;
  xMin:       number;
  xMax:       number;
}

const WaveCanvas: React.FC<WaveCanvasProps> = React.memo(
  ({ result, frameIndex, xMin, xMax }) => {
    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const frameRef   = useRef(frameIndex);
    const resultRef  = useRef(result);
    frameRef.current  = frameIndex;
    resultRef.current = result;

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio ?? 1;
      const W   = canvas.offsetWidth;
      const H   = canvas.offsetHeight;
      if (W === 0 || H === 0) return;

      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);
      }

      const { x, frames, V } = resultRef.current;
      const fi    = frameRef.current;
      const frame = frames[fi];
      if (!frame) return;

      const pad = { top: 28, right: 20, bottom: 38, left: 52 };
      const pW  = W - pad.left - pad.right;
      const pH  = H - pad.top  - pad.bottom;

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(pad.left, pad.top, pW, pH);

      const maxProb = Math.max(...frame.prob, 1e-10);

      const cx = (xv: number)  => pad.left + ((xv - xMin) / (xMax - xMin)) * pW;
      const cy = (v: number, maxV: number) => pad.top + pH - (v / maxV) * pH;

      // Grid
      const gridXn = 8, gridYn = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth   = 0.5;
      for (let i = 0; i <= gridXn; i++) {
        const gx = pad.left + (i / gridXn) * pW;
        ctx.beginPath(); ctx.moveTo(gx, pad.top); ctx.lineTo(gx, pad.top + pH); ctx.stroke();
      }
      for (let j = 0; j <= gridYn; j++) {
        const gy = pad.top + (j / gridYn) * pH;
        ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(pad.left + pW, gy); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, pad.top + pH); ctx.lineTo(pad.left + pW, pad.top + pH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + pH); ctx.stroke();

      // Axis labels
      ctx.font      = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "center";
      for (let i = 0; i <= gridXn; i++) {
        const xv = xMin + (i / gridXn) * (xMax - xMin);
        ctx.fillText(xv.toFixed(1), pad.left + (i / gridXn) * pW, H - 8);
      }
      ctx.textAlign = "right";
      for (let j = 0; j <= gridYn; j++) {
        const yv = ((gridYn - j) / gridYn) * maxProb;
        ctx.fillText(yv.toFixed(3), pad.left - 6, pad.top + (j / gridYn) * pH + 4);
      }

      // Potential V (shaded walls)
      if (V && V.length === x.length) {
        const maxV = Math.max(...V.filter(isFinite), 1);
        ctx.fillStyle = "rgba(248,113,113,0.07)";
        ctx.beginPath();
        ctx.moveTo(cx(x[0]), pad.top + pH);
        for (let i = 0; i < x.length; i++) {
          const v = Math.min(V[i], maxV);
          ctx.lineTo(cx(x[i]), cy(v, maxV));
        }
        ctx.lineTo(cx(x[x.length - 1]), pad.top + pH);
        ctx.closePath();
        ctx.fill();
      }

      // Helper: draw a curve with optional fill
      const drawCurve = (
        data:      number[],
        maxVal:    number,
        stroke:    string,
        lw:        number,
        fill?:     string,
      ) => {
        if (data.length === 0) return;
        ctx.beginPath();
        for (let i = 0; i < x.length; i++) {
          const px = cx(x[i]);
          const py = cy(data[i], maxVal);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        if (fill) {
          ctx.lineTo(cx(x[x.length - 1]), pad.top + pH);
          ctx.lineTo(cx(x[0]), pad.top + pH);
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          // Redraw stroke path
          ctx.beginPath();
          for (let i = 0; i < x.length; i++) {
            const px = cx(x[i]);
            const py = cy(data[i], maxVal);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = lw;
        ctx.stroke();
      };

      // |ψ|² — filled
      drawCurve(frame.prob, maxProb, "#818cf8", 2, "rgba(99,102,241,0.13)");

      // Re(ψ) and Im(ψ) — centred at 0, scaled to match prob range
      const maxAmp = Math.max(
        ...frame.real.map(Math.abs),
        ...frame.imag.map(Math.abs),
        1e-10,
      );
      // Shift up so midpoint sits at 40% height
      const shift   = maxProb * 0.4;
      const ampScale = maxProb * 0.35 / maxAmp;
      const reShifted = frame.real.map((v) => v * ampScale + shift);
      const imShifted = frame.imag.map((v) => v * ampScale + shift);

      drawCurve(reShifted, maxProb, "rgba(52,211,153,0.75)", 1);
      drawCurve(imShifted, maxProb, "rgba(251,146,60,0.75)",  1);

      // Legend
      const legend = [
        { color: "#818cf8",              label: "|ψ|²"  },
        { color: "rgba(52,211,153,0.9)", label: "Re(ψ)" },
        { color: "rgba(251,146,60,0.9)", label: "Im(ψ)" },
        { color: "rgba(248,113,113,0.6)",label: "V(x)"  },
      ];
      let lx = pad.left + 10;
      const ly = pad.top + 14;
      ctx.font      = "11px sans-serif";
      ctx.textAlign = "left";
      legend.forEach(({ color, label: lbl }) => {
        ctx.fillStyle = color;
        ctx.fillRect(lx, ly - 7, 14, 3);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(lbl, lx + 18, ly);
        lx += 68;
      });
    }, [xMin, xMax]);

    // Redraw whenever frame or result changes
    useEffect(() => { draw(); }, [frameIndex, result, draw]);

    // Resize observer
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => draw());
      ro.observe(canvas);
      return () => ro.disconnect();
    }, [draw]);

    return (
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  },
  (prev, next) =>
    prev.frameIndex === next.frameIndex &&
    prev.result     === next.result     &&
    prev.xMin       === next.xMin       &&
    prev.xMax       === next.xMax,
);

WaveCanvas.displayName = "WaveCanvas";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperpositionPage() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [speed,  setSpeed]  = useState<PlaybackSpeed>(1);

  const { result, loading, error } = useSimulation(params);

  const frameCount = result?.frames.length ?? 0;
  const { frameIndex, playing, setPlaying, setFrameIndex } = usePlayback(frameCount, speed);

  const handleParamChange = useCallback(
    (updated: Partial<SimulationParams>) =>
      setParams((prev) => ({ ...prev, ...updated })),
    [],
  );

  const currentTime = result?.times[frameIndex] ?? 0;
  const totalTime   = result?.times[result.times.length - 1] ?? params.t_end;

  return (
    <div
      style={{
        display:         "flex",
        flexDirection:   "column",
        height:          "100vh",
        backgroundColor: "#080808",
        color:           "#fff",
        fontFamily:      "system-ui, sans-serif",
        overflow:        "hidden",
      }}
    >
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        input[type=number] { outline: none; }
        input[type=number]:focus { border-color: rgba(99,102,241,0.5) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <TopBar
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        speed={speed}
        onSpeedChange={setSpeed}
        currentTime={currentTime}
        totalTime={totalTime}
        frameIndex={frameIndex}
        frameCount={frameCount}
        loading={loading}
        error={error}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar params={params} onChange={handleParamChange} />

        <div
          style={{
            flex:          1,
            display:       "flex",
            flexDirection: "column",
            padding:       "16px 18px",
            gap:           12,
            overflow:      "hidden",
          }}
        >
          {/* Main canvas */}
          <div
            style={{
              flex:         1,
              borderRadius: 10,
              border:       "1px solid rgba(255,255,255,0.07)",
              background:   "#0c0c0c",
              overflow:     "hidden",
              position:     "relative",
              minHeight:    0,
            }}
          >
            {!result && !loading && !error && (
              <Placeholder text="Awaiting simulation…" />
            )}
            {loading && !result && (
              <Placeholder text="Computing…" pulsing />
            )}
            {error && (
              <ErrorOverlay error={error} />
            )}
            {result && (
              <WaveCanvas
                result={result}
                frameIndex={frameIndex}
                xMin={params.x_min}
                xMax={params.x_max}
              />
            )}
          </div>

          {/* Timeline scrubber */}
          {result && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", width: 36, textAlign: "right" }}>
                {result.times[0].toFixed(2)}
              </span>
              <input
                type="range"
                min={0}
                max={frameCount - 1}
                step={1}
                value={frameIndex}
                onChange={(e) => {
                  setPlaying(false);
                  setFrameIndex(Number(e.target.value));
                }}
                style={{ flex: 1, accentColor: "#6366f1" }}
              />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", width: 36 }}>
                {result.times[result.times.length - 1].toFixed(2)}
              </span>
            </div>
          )}

          {/* Info pills: energies + coefficients */}
          {result && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              {result.energies.map((e, i) => (
                <Pill key={`e${i}`} label={`E${i}`} value={e.toFixed(4)} color="#a5b4fc" />
              ))}
              {result.coefficients.map((c, i) => (
                <Pill key={`c${i}`} label={`|c${i}|`} value={c.toFixed(4)} color="#86efac" />
              ))}
              <Pill label="width" value={result.well_width.toFixed(2)} color="rgba(251,146,60,0.9)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Placeholder({ text, pulsing }: { text: string; pulsing?: boolean }) {
  return (
    <div
      style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize:  13,
          color:     "rgba(255,255,255,0.2)",
          animation: pulsing ? "pulse 1.2s infinite" : undefined,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function ErrorOverlay({ error }: { error: string }) {
  return (
    <div
      style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexDirection:  "column",
        gap:            8,
        padding:        24,
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(248,113,113,0.95)", textAlign: "center" }}>
        {error}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        Check your backend is running and the request schema matches.
      </span>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding:      "4px 10px",
        borderRadius: 6,
        border:       "1px solid rgba(255,255,255,0.07)",
        background:   "rgba(255,255,255,0.03)",
        fontSize:     11,
        display:      "flex",
        gap:          5,
        alignItems:   "center",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span style={{ color, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}