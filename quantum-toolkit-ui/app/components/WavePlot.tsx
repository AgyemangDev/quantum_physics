"use client";
import { useEffect, useRef } from "react";

interface WavePlotProps {
  x: Float64Array;
  prob: Float64Array;
  V: Float64Array;
  psiRe?: Float64Array;
  psiIm?: Float64Array;
  width?: number;
  height?: number;
  showComponents?: boolean;
}

export default function WavePlot({
  x, prob, V, psiRe, psiIm,
  width = 600, height = 220,
  showComponents = false,
}: WavePlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !x.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);

    // clear
    ctx.fillStyle = "#0d1225";
    ctx.fillRect(0, 0, width, height);

    // grid lines
    ctx.strokeStyle = "rgba(0,229,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const xp = (width / 6) * i;
      ctx.beginPath(); ctx.moveTo(xp, 0); ctx.lineTo(xp, height); ctx.stroke();
    }

    const N = x.length;
    const pad = { l: 10, r: 10, t: 16, b: 16 };
    const plotW = width  - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;

    const maxProb = Math.max(...Array.from(prob)) || 1;
    const maxV    = Math.max(...Array.from(V))    || 1;

    const toX = (i: number) => pad.l + (i / (N - 1)) * plotW;
    const toY = (v: number, maxV: number) => pad.t + plotH - (v / maxV) * plotH * 0.8;

    // Draw potential V(x) — dashed amber
    if (maxV > 0) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,184,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const px = toX(i);
        const py = toY(V[i], maxV * 1.2);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw Re(ψ) — violet, thin
    if (showComponents && psiRe) {
      const maxRe = Math.max(...Array.from(psiRe).map(Math.abs)) || 1;
      ctx.strokeStyle = "rgba(139,92,246,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const px = toX(i);
        const py = pad.t + plotH / 2 - (psiRe[i] / maxRe) * (plotH / 2) * 0.7;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Draw Im(ψ) — green, thin
    if (showComponents && psiIm) {
      const maxIm = Math.max(...Array.from(psiIm).map(Math.abs)) || 1;
      ctx.strokeStyle = "rgba(0,255,136,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const px = toX(i);
        const py = pad.t + plotH / 2 - (psiIm[i] / maxIm) * (plotH / 2) * 0.7;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Draw |ψ|² filled — cyan glow
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH);
    grad.addColorStop(0, "rgba(0,229,255,0.7)");
    grad.addColorStop(1, "rgba(0,229,255,0.02)");

    ctx.beginPath();
    ctx.moveTo(toX(0), pad.t + plotH);
    for (let i = 0; i < N; i++) {
      const px = toX(i);
      const py = toY(prob[i], maxProb * 1.15);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(toX(N - 1), pad.t + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Outline
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = toX(i);
      const py = toY(prob[i], maxProb * 1.15);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Axis labels
    ctx.fillStyle = "rgba(124,141,181,0.7)";
    ctx.font = "10px 'Space Mono', monospace";
    ctx.fillText("|ψ|²", pad.l + 4, pad.t + 12);

  }, [x, prob, V, psiRe, psiIm, width, height, showComponents]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius: 4, width: "100%", height: height }}
    />
  );
}
