"use client";
import { useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";
import EqBox from "./EqBox";
import ChartCard from "./ChartCard";
import { Dimension, tooltipStyle, fmt } from "../../components/types";
import WireframeScene from "../Scene/Wireframescene";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void,
  deps: unknown[],
  height: number
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = canvas.offsetWidth || 500;
    const H = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    draw(ctx, W, H);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// ── Wireframe surface for Re(ψ) only ─────────────────────────────────────────

function WireframeSurface({ x0, sigma, k0, height = 220 }: {
  x0: number; sigma: number; k0: number; height?: number;
}) {
  const ref = useCanvas((ctx, W, H) => {
    const LINES_X = 60;
    const LINES_Y = 28;
    const rangeX = 10;
    const rangeY = 5;

    const project = (wx: number, wy: number, wz: number) => ({
      px: W * 0.5 + (wx / rangeX) * W * 0.38 - (wy / rangeY) * W * 0.22,
      py: H * 0.60 - wz * H * 0.42 - (wx / rangeX) * H * 0.12 - (wy / rangeY) * H * 0.08,
    });

    const val = (wx: number, wy: number) =>
      Math.cos(k0 * wx) * Math.exp(-((wx - x0) ** 2 + wy ** 2) / (4 * sigma ** 2));

    // Zero-plane grid
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    for (let ix = 0; ix <= LINES_X; ix++) {
      const wx = -rangeX + (ix / LINES_X) * 2 * rangeX;
      ctx.beginPath();
      for (let iy = 0; iy <= LINES_Y; iy++) {
        const wy = -rangeY + (iy / LINES_Y) * 2 * rangeY;
        const { px, py } = project(wx, wy, 0);
        iy === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let iy = 0; iy <= LINES_Y; iy++) {
      const wy = -rangeY + (iy / LINES_Y) * 2 * rangeY;
      ctx.beginPath();
      for (let ix = 0; ix <= LINES_X; ix++) {
        const wx = -rangeX + (ix / LINES_X) * 2 * rangeX;
        const { px, py } = project(wx, wy, 0);
        ix === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Surface — curtain lines along y at each x
    for (let ix = 0; ix <= LINES_X; ix++) {
      const wx = -rangeX + (ix / LINES_X) * 2 * rangeX;
      ctx.beginPath();
      let started = false;
      for (let iy = 0; iy <= LINES_Y; iy++) {
        const wy = -rangeY + (iy / LINES_Y) * 2 * rangeY;
        const { px, py } = project(wx, wy, val(wx, wy));
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      const absMax = Math.abs(val(wx, 0));
      const b = Math.round(100 + absMax * 155);
      ctx.strokeStyle = `rgba(${b},${b},0,0.85)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Surface — lines along x at each y
    for (let iy = 0; iy <= LINES_Y; iy++) {
      const wy = -rangeY + (iy / LINES_Y) * 2 * rangeY;
      ctx.beginPath();
      let started = false;
      for (let ix = 0; ix <= LINES_X; ix++) {
        const wx = -rangeX + (ix / LINES_X) * 2 * rangeX;
        const { px, py } = project(wx, wy, val(wx, wy));
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "rgba(220,180,0,0.45)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.2;
    const xS = project(-rangeX, -rangeY, 0), xE = project(rangeX, -rangeY, 0);
    ctx.beginPath(); ctx.moveTo(xS.px, xS.py); ctx.lineTo(xE.px, xE.py); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.moveTo(xE.px, xE.py); ctx.lineTo(xE.px-6, xE.py-3); ctx.lineTo(xE.px-6, xE.py+3); ctx.fill();

    const yS = project(-rangeX, -rangeY, 0), yE = project(-rangeX, rangeY, 0);
    ctx.beginPath(); ctx.moveTo(yS.px, yS.py); ctx.lineTo(yE.px, yE.py); ctx.stroke();

    const zO = project(-rangeX, -rangeY, 0), zT = project(-rangeX, -rangeY, 1);
    ctx.beginPath(); ctx.moveTo(zO.px, zO.py); ctx.lineTo(zT.px, zT.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(zT.px, zT.py); ctx.lineTo(zT.px+3, zT.py+6); ctx.lineTo(zT.px-3, zT.py+6); ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "11px 'Space Mono', monospace";
    ctx.fillText("x", xE.px + 6, xE.py + 4);
    ctx.fillText("y", yE.px - 14, yE.py - 4);
    ctx.fillText("Re{ψ(x,y)}", zT.px - 60, zT.py - 8);
    ctx.fillText("t = 0", 12, 18);

  }, [x0, sigma, k0, height], height);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height, display: "block", background: "#03086b", borderRadius: 6 }}
    />
  );
}

function WaveLegend() {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexWrap: "wrap" as const }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 20, height: 7, borderRadius: 2, background: "rgba(220,180,0,0.9)", display: "inline-block" }} />
        Re(ψ) &gt; 0  (crest)
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 20, height: 7, borderRadius: 2, background: "rgba(220,180,0,0.4)", display: "inline-block" }} />
        Re(ψ) &lt; 0  (trough)
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 20, height: 7, borderRadius: 2, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }} />
        zero-plane
      </span>
    </div>
  );
}

// ── Chart 1 — always 1D ───────────────────────────────────────────────────────

export function ProbChart({ data, x0, sigma }: {
  data: Record<string,number>[]; x0: number; sigma: number;
}) {
  return (
    <ChartCard
      title="Probability density |ψ(x)|²"
      dot="var(--cyan)"
      eqBox={<EqBox><Eq tex={String.raw`\rho(x)=|\psi(x)|^2`} /></EqBox>}
      explanation={`Peak at x₀ = ${x0}. Width controlled by σ = ${sigma}. Area under the curve always equals 1 — the particle must be somewhere.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine x={x0} stroke="rgba(0,229,255,0.3)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="prob" stroke="var(--cyan)" dot={false} strokeWidth={2} name="|ψ|²" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart 2 — always 1D ───────────────────────────────────────────────────────

export function EnvelopeChart({ data, x0, sigma }: {
  data: Record<string,number>[]; x0: number; sigma: number;
}) {
  return (
    <ChartCard
      title="Gaussian envelope |ψ(x)|"
      dot="var(--green)"
      eqBox={<EqBox><Eq tex={String.raw`|\psi(x)|=\left(2\pi\sigma^2\right)^{-1/4}e^{-(x-x_0)^2/4\sigma^2}`} /></EqBox>}
      explanation={`Amplitude before squaring. Centred at x₀ = ${x0}, width σ = ${sigma}. k₀ has no effect on this shape — only the oscillations inside it change.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine x={x0} stroke="rgba(0,255,136,0.3)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="env" stroke="var(--green)" dot={false} strokeWidth={2} name="|ψ|" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart 3 — 1D or 3D wireframe ─────────────────────────────────────────────

export function ReImChart({ data, x0, sigma, k0, dim }: {
  data: Record<string,number>[]; x0: number; sigma: number; k0: number; dim: Dimension;
}) {
  const eq = dim === "1D"
    ? String.raw`\psi = \underbrace{\cos(k_0 x)\cdot A}_{\text{Re}(\psi)} + i\,\underbrace{\sin(k_0 x)\cdot A}_{\text{Im}(\psi)}`
    : String.raw`\text{Re}\{\psi(x,y)\}=\cos(k_0 x)\cdot A\,e^{-\frac{(x-x_0)^2+y^2}{4\sigma^2}}`;

  const explanation = dim === "1D"
    ? `Oscillation frequency set by k₀ = ${k0}. Re(ψ) in violet and Im(ψ) in amber are 90° out of phase — Re leads Im by a quarter wavelength. Only |ψ|² is physically observable.`
    : `Yellow wireframe = Re(ψ(x,y)), magenta wireframe = Im(ψ(x,y)). Both surfaces are the same Gaussian-modulated wave — Im is exactly 90° phase-shifted from Re (cos → sin). The pink curtain shows Im projected onto the zero-plane. Stripe spacing = 2π/k₀ ≈ ${(2 * Math.PI / Math.abs(k0 || 1)).toFixed(2)}.`;

  return (
    <ChartCard
      title={dim === "1D" ? "Re(ψ) and Im(ψ)" : "Re(ψ) + Im(ψ) — 3D wireframe"}
      dot="var(--violet)"
      eqBox={<EqBox><Eq tex={eq} /></EqBox>}
      explanation={explanation}
    >
      {dim === "1D" && (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data}>
            <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={36} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'Space Mono',monospace" }} />
            <Line type="monotone" dataKey="re" stroke="var(--violet)" dot={false} strokeWidth={1.5} name="Re(ψ)" />
            <Line type="monotone" dataKey="im" stroke="var(--amber)"  dot={false} strokeWidth={1.5} name="Im(ψ)" />
          </LineChart>
        </ResponsiveContainer>
      )}
      {dim === "3D" && (
        <WireframeScene x0={x0} sigma={sigma} k0={k0} height={300} />
      )}
    </ChartCard>
  );
}

// ── Chart 4 — always 1D ───────────────────────────────────────────────────────

export function MomentumChart({ data, k0, sigma }: {
  data: Record<string,number>[]; k0: number; sigma: number;
}) {
  return (
    <ChartCard
      title="Momentum space |ψ̃(k)|²"
      dot="var(--violet)"
      eqBox={<EqBox><Eq tex={String.raw`\tilde{\psi}(k)=\frac{1}{\sqrt{2\pi}}\int\psi(x)e^{-ikx}dx`} /></EqBox>}
      explanation={`Peak at k₀ = ${k0}. Width σ_k ≈ 1/(2σ) = ${(1/(2*(sigma||1))).toFixed(3)}. Wider position packet (large σ) → narrower peak here. This is the uncertainty principle directly visible.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 9 }} label={{ value: "k", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 9 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine x={k0} stroke="rgba(139,92,246,0.4)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="prob_k" stroke="var(--violet)" dot={false} strokeWidth={2} name="|ψ̃|²" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}