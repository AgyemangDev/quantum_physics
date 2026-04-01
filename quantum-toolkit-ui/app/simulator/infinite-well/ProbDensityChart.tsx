"use client";
import { useEffect, useRef } from "react";
import type { InfiniteWellResponse } from "./useInfiniteWell";

const COLORS = ["#22d3ee","#a78bfa","#34d399","#f59e0b","#f87171",
                "#38bdf8","#c084fc","#4ade80","#fbbf24","#fb7185"];

interface Props {
  data: InfiniteWellResponse;
  selectedN: number;
  width?: number;
  height?: number;
}

export default function ProbDensityChart({ data, selectedN, width = 500, height = 220 }: Props) {
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

    const pad = { t: 14, b: 24, l: 10, r: 10 };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const es   = data.eigenstates[selectedN];
    const prob = es.prob;
    const x    = data.x;
    const V    = data.V;
    const color = COLORS[selectedN % COLORS.length];

    const probMax = Math.max(...prob) || 1;
    const xMin = x[0], xMax = x[x.length - 1], xRange = xMax - xMin;
    const mapX = (xi: number) => pad.l + ((xi - xMin) / xRange) * W;
    const mapY = (yi: number) => pad.t + H - (yi / (probMax * 1.2)) * H;

    // V overlay
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "rgba(245,158,11,0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const Vcap = 100;
    V.forEach((v, i) => {
      const xp = pad.l + (i / (V.length - 1)) * W;
      const vn = Math.min(v, Vcap) / Vcap * (H * 0.8);
      const yp = pad.t + H - vn;
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    ctx.restore();

    // Fill under prob
    ctx.beginPath();
    prob.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = mapY(v);
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.lineTo(mapX(x[x.length - 1]), pad.t + H);
    ctx.lineTo(mapX(x[0]), pad.t + H);
    ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();

    // Prob line
    ctx.shadowColor = color;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    prob.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = mapY(v);
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // X ticks
    ctx.fillStyle = "rgba(148,163,184,0.45)";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    [-8,-4,0,4,8].forEach(v => {
      ctx.fillText(String(v), mapX(v), height - 5);
    });

    // X label
    ctx.fillText("x", pad.l + W / 2, height - 2);

  }, [data, selectedN, width, height]);

  return <canvas ref={ref} style={{ borderRadius: 6, display: "block", width: "100%" }} />;
}