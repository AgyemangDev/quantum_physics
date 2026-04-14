"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

const COLORS = ["#22d3ee", "#a78bfa", "#f59e0b", "#22c55e", "#f87171"];

// ── Canvas chart helper ───────────────────────────────────────────────────────

function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void,
  deps: unknown[], height: number
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = canvas.offsetWidth || 600;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, height);
    draw(ctx, W, height);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function drawGrid(ctx: CanvasRenderingContext2D, pad: {t:number;b:number;l:number;r:number}, W: number, H: number) {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  [-8,-4,0,4,8].forEach(v => {
    const xp = pad.l + ((v + 10) / 20) * (W - pad.l - pad.r);
    ctx.beginPath(); ctx.moveTo(xp, pad.t); ctx.lineTo(xp, H - pad.b); ctx.stroke();
  });
  ctx.fillStyle = "rgba(148,163,184,0.35)";
  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  [-8,-4,0,4,8].forEach(v => {
    const xp = pad.l + ((v + 10) / 20) * (W - pad.l - pad.r);
    ctx.fillText(String(v), xp, H - 3);
  });
  ctx.textAlign = "right";
  ctx.fillText("x", W - pad.r + 8, H - pad.b + 4);
}

// ── Chart 1: |ψ(x,t)|² with V(x) overlay ────────────────────────────────────

export function ProbDensityChart({ x, prob, V, height = 200 }: {
  x: number[]; prob: number[]; V: number[]; height?: number;
}) {
  const ref = useCanvas((ctx, W, H) => {
    const pad = { t: 12, b: 22, l: 36, r: 12 };
    const PW = W - pad.l - pad.r;
    const PH = H - pad.t - pad.b;

    ctx.fillStyle = "rgba(6,8,16,0.6)";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, pad, W, H);

    if (!x.length) return;
    const xMin = x[0], xRange = x[x.length - 1] - xMin;
    const probMax = Math.max(...prob) || 1;

    const mapX = (xi: number) => pad.l + ((xi - xMin) / xRange) * PW;
    const mapY = (v: number, max: number) => pad.t + PH - (v / max) * PH * 0.9;

    // V(x) dashed amber overlay
    const Vmax = Math.min(Math.max(...V) || 1, 50);
    if (Vmax > 0) {
      ctx.save();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = "rgba(251,191,36,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      V.forEach((v, i) => {
        const xp = mapX(x[i]);
        const yp = pad.t + PH - (Math.min(v, Vmax) / Vmax) * PH * 0.7;
        i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
      });
      ctx.stroke();
      ctx.restore();
    }

    // |ψ|² fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + PH);
    grad.addColorStop(0, "rgba(34,211,238,0.6)");
    grad.addColorStop(1, "rgba(34,211,238,0.02)");
    ctx.beginPath();
    prob.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = mapY(v, probMax);
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.lineTo(mapX(x[x.length - 1]), pad.t + PH);
    ctx.lineTo(mapX(x[0]), pad.t + PH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // |ψ|² line
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    prob.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = mapY(v, probMax);
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Y axis label
    ctx.fillStyle = "rgba(148,163,184,0.4)";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("|ψ|²", 2, pad.t + 10);

  }, [x, prob, V, height], height);

  return (
    <canvas ref={ref} style={{ width: "100%", height, display: "block", borderRadius: 6, background: "rgba(6,8,16,0.6)" }} />
  );
}

// ── Chart 2: Re(ψ) and Im(ψ) with envelope ───────────────────────────────────

export function ReImChart({ x, real, imag, prob, height = 200 }: {
  x: number[]; real: number[]; imag: number[]; prob: number[]; height?: number;
}) {
  const ref = useCanvas((ctx, W, H) => {
    const pad = { t: 12, b: 22, l: 36, r: 12 };
    const PW = W - pad.l - pad.r;
    const PH = H - pad.t - pad.b;

    ctx.fillStyle = "rgba(6,8,16,0.6)";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, pad, W, H);

    if (!x.length) return;
    const xMin = x[0], xRange = x[x.length - 1] - xMin;
    const allY = [...real, ...imag];
    const yMax = Math.max(...allY.map(Math.abs)) || 1;

    const mapX = (xi: number) => pad.l + ((xi - xMin) / xRange) * PW;
    const mapY = (v: number)  => pad.t + PH / 2 - (v / yMax) * (PH / 2) * 0.9;

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + PH / 2);
    ctx.lineTo(pad.l + PW, pad.t + PH / 2);
    ctx.stroke();

    // Envelope ±|ψ| — dashed green
    const env = prob.map(Math.sqrt);
    const envMax = Math.max(...env) || 1;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "rgba(34,197,94,0.65)";
    ctx.lineWidth = 1.2;
    // +|ψ|
    ctx.beginPath();
    env.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = pad.t + PH / 2 - (v / envMax) * (PH / 2) * 0.9;
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    // −|ψ|
    ctx.beginPath();
    env.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = pad.t + PH / 2 + (v / envMax) * (PH / 2) * 0.9;
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    ctx.restore();

    // Im(ψ) — amber
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.3;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 3;
    ctx.beginPath();
    imag.forEach((v, i) => {
      i === 0 ? ctx.moveTo(mapX(x[i]), mapY(v)) : ctx.lineTo(mapX(x[i]), mapY(v));
    });
    ctx.stroke();

    // Re(ψ) — cyan
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    real.forEach((v, i) => {
      i === 0 ? ctx.moveTo(mapX(x[i]), mapY(v)) : ctx.lineTo(mapX(x[i]), mapY(v));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = "rgba(148,163,184,0.4)";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Re(ψ)", 2, pad.t + 10);
    ctx.fillStyle = "rgba(245,158,11,0.5)";
    ctx.fillText("Im(ψ)", 2, pad.t + 22);

  }, [x, real, imag, prob, height], height);

  return (
    <canvas ref={ref} style={{ width: "100%", height, display: "block", borderRadius: 6, background: "rgba(6,8,16,0.6)" }} />
  );
}

// ── Chart 3: Individual eigenstates ──────────────────────────────────────────

export function EigenstatesChart({ x, V, eigenstates, coefficients, height = 200 }: {
  x: number[]; V: number[];
  eigenstates?: Array<{ prob: number[]; real: number[] }>;
  coefficients: number[];
  height?: number;
}) {
  const ref = useCanvas((ctx, W, H) => {
    const pad = { t: 12, b: 22, l: 36, r: 12 };
    const PW = W - pad.l - pad.r;
    const PH = H - pad.t - pad.b;

    ctx.fillStyle = "rgba(6,8,16,0.6)";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, pad, W, H);

    if (!x.length || !eigenstates?.length) {
      ctx.fillStyle = "rgba(100,116,139,0.4)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Compute to see eigenstates", W / 2, H / 2);
      return;
    }

    const xMin = x[0], xRange = x[x.length - 1] - xMin;
    const norm = Math.sqrt(coefficients.reduce((s, c) => s + c * c, 0)) || 1;

    // Draw each eigenstate ψₙ(x) offset vertically
    eigenstates.forEach((es, i) => {
      const color = COLORS[i % COLORS.length];
      const weight = coefficients[i] / norm;
      const scale = 0.7 * weight;
      const yOffset = pad.t + PH * (0.15 + i * (0.7 / eigenstates.length));

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.3 + Math.abs(weight) * 0.7;
      ctx.beginPath();
      es.real.forEach((v, j) => {
        const xp = pad.l + ((x[j] - xMin) / xRange) * PW;
        const yp = yOffset - v * scale * PH * 0.12;
        j === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
      });
      ctx.stroke();

      // State label
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = color;
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`ψ${i + 1}`, pad.l - 2, yOffset + 3);
    });

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(148,163,184,0.4)";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ψₙ(x)", 2, pad.t + 10);

  }, [x, V, eigenstates, coefficients, height], height);

  return (
    <canvas ref={ref} style={{ width: "100%", height, display: "block", borderRadius: 6, background: "rgba(6,8,16,0.6)" }} />
  );
}

// ── Shared panel wrapper ──────────────────────────────────────────────────────

export function ChartPanel({ title, eq, legend, note, children }: {
  title: string;
  eq?: string;
  legend?: Array<{ color: string; label: string; dashed?: boolean }>;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.015)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{
          fontSize: 9, color: "rgba(148,163,184,0.45)",
          textTransform: "uppercase" as const, letterSpacing: "0.12em", fontFamily: "monospace",
        }}>
          {title}
        </span>
        {eq && (
          <div style={{ fontSize: "0.7em", opacity: 0.6 }}>
            <Eq tex={eq} />
          </div>
        )}
      </div>
      {children}
      {legend && (
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" as const }}>
          {legend.map(l => (
            <span key={l.label} style={{
              fontSize: 10, color: l.color, fontFamily: "monospace",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{
                display: "inline-block", width: 16, height: 2,
                background: l.dashed ? "none" : l.color,
                borderTop: l.dashed ? `2px dashed ${l.color}` : "none",
              }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {note && (
        <div style={{ marginTop: 8, fontSize: 10, color: "rgba(100,116,139,0.5)", fontFamily: "monospace" }}>
          {note}
        </div>
      )}
    </div>
  );
}