"use client";
import { useEffect, useRef } from "react";
import type { InfiniteWellResponse } from "./useInfiniteWell";

interface Props {
  data: InfiniteWellResponse;
  selectedN: number;
  width?: number;
  height?: number;
}

export default function EnergyBarChart({ data, selectedN, width = 500, height = 220 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    c.width  = width  * 2;
    c.height = height * 2;
    c.style.width  = `${width}px`;
    c.style.height = `${height}px`;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(6,8,16,0.55)";
    ctx.fillRect(0, 0, width, height);

    const pad = { t: 24, b: 32, l: 44, r: 16 };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const n      = data.n_states;
    const nums   = data.energies;
    const anals  = data.analytical_energies;
    const maxE   = Math.max(...anals) * 1.15;

    const groupW = W / n;
    const barW   = groupW * 0.28;
    const gap    = groupW * 0.06;

    nums.forEach((numE, i) => {
      const analE = anals[i];
      const relErr = Math.abs(numE - analE) / analE * 100;
      const isSelected = i === selectedN;

      const gx = pad.l + i * groupW + groupW * 0.5 - barW - gap / 2;

      // Numerical bar
      const numH = (numE / maxE) * H;
      const numColor = isSelected ? "#22d3ee" : "#22d3ee66";
      ctx.fillStyle = numColor;
      ctx.fillRect(gx, pad.t + H - numH, barW, numH);

      // Analytical bar
      const analH = (analE / maxE) * H;
      const analColor = isSelected ? "#a78bfa" : "#a78bfa66";
      ctx.fillStyle = analColor;
      ctx.fillRect(gx + barW + gap, pad.t + H - analH, barW, analH);

      // Error label
      ctx.fillStyle = isSelected ? "rgba(255,255,255,0.9)" : "rgba(148,163,184,0.5)";
      ctx.font      = isSelected ? "bold 7px monospace" : "6px monospace";
      ctx.textAlign = "center";
      const topY = pad.t + H - Math.max(numH, analH) - 4;
      ctx.fillText(`${relErr.toFixed(2)}%`, gx + barW + gap / 2, topY);

      // X label: n=1,2,...
      ctx.fillStyle = isSelected ? "white" : "rgba(148,163,184,0.5)";
      ctx.font = isSelected ? "bold 8px monospace" : "7px monospace";
      ctx.fillText(`n=${i + 1}`, gx + barW + gap / 2, height - 5);
    });

    // Y axis ticks
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    ctx.font = "6px monospace";
    ctx.textAlign = "right";
    [0, 0.25, 0.5, 0.75, 1.0].forEach(f => {
      const e  = f * maxE;
      const yp = pad.t + H - f * H;
      ctx.fillText(e.toFixed(1), pad.l - 3, yp + 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, yp);
      ctx.lineTo(pad.l + W, yp);
      ctx.stroke();
    });

    // Legend
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(pad.l, 4, 10, 6);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "7px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Numerical", pad.l + 13, 10);

    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(pad.l + 80, 4, 10, 6);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Analytical", pad.l + 93, 10);

  }, [data, selectedN, width, height]);

  return <canvas ref={ref} style={{ borderRadius: 6, display: "block", width: "100%" }} />;
}