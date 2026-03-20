"use client";
import { useEffect, useRef } from "react";

interface MomentumPlotProps {
  psiRe: Float64Array;
  psiIm: Float64Array;
  dx: number;
  width?: number;
  height?: number;
}

export default function MomentumPlot({ psiRe, psiIm, dx, width = 600, height = 140 }: MomentumPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !psiRe.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = psiRe.length;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);

    // Simple DFT magnitude (for display — no FFT library needed at N=500)
    // We use the fact that |FT[psi]|² is symmetric around k=0
    // For smoothness, sample 200 k values
    const Nk = 200;
    const kMax = Math.PI / dx;
    const kArr: number[] = [];
    const Pk: number[] = [];

    for (let ki = 0; ki < Nk; ki++) {
      const k = -kMax + (2 * kMax * ki) / (Nk - 1);
      let sumRe = 0, sumIm = 0;
      for (let i = 0; i < N; i++) {
        const phase = k * i * dx;
        sumRe += psiRe[i] * Math.cos(phase) + psiIm[i] * Math.sin(phase);
        sumIm += psiIm[i] * Math.cos(phase) - psiRe[i] * Math.sin(phase);
      }
      kArr.push(k);
      Pk.push((sumRe * sumRe + sumIm * sumIm) * dx * dx);
    }

    const maxPk = Math.max(...Pk) || 1;
    const pad = { l: 10, r: 10, t: 12, b: 12 };
    const plotW = width  - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;

    ctx.fillStyle = "#0d1225";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(139,92,246,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (plotH / 3) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + plotW, y); ctx.stroke();
    }

    // k=0 line
    const midX = pad.l + plotW / 2;
    ctx.strokeStyle = "rgba(139,92,246,0.3)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(midX, pad.t); ctx.lineTo(midX, pad.t + plotH); ctx.stroke();
    ctx.setLineDash([]);

    // Fill |ψ̃(k)|²
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH);
    grad.addColorStop(0, "rgba(139,92,246,0.8)");
    grad.addColorStop(1, "rgba(139,92,246,0.02)");

    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + plotH);
    for (let ki = 0; ki < Nk; ki++) {
      const px = pad.l + (ki / (Nk - 1)) * plotW;
      const py = pad.t + plotH - (Pk[ki] / maxPk) * plotH * 0.85;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#8b5cf6";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let ki = 0; ki < Nk; ki++) {
      const px = pad.l + (ki / (Nk - 1)) * plotW;
      const py = pad.t + plotH - (Pk[ki] / maxPk) * plotH * 0.85;
      ki === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(124,141,181,0.7)";
    ctx.font = "10px 'Space Mono', monospace";
    ctx.fillText("|ψ̃(k)|²", pad.l + 4, pad.t + 12);
    ctx.textAlign = "center";
    ctx.fillText("k=0", midX, pad.t + plotH - 3);

  }, [psiRe, psiIm, dx, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius: 4, width: "100%", height }}
    />
  );
}
