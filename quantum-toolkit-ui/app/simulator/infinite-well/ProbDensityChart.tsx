"use client";
import { useEffect, useRef } from "react";
import type { InfiniteWellResponse } from "./useInfiniteWell";

const COLORS = ["#22d3ee","#a78bfa","#34d399","#f59e0b","#f87171",
                "#38bdf8","#c084fc","#4ade80","#fbbf24","#fb7185"];

interface Props {
  data: InfiniteWellResponse;
  selectedN: number;
  expanded?: boolean;
}

export default function ProbDensityChart({ data, selectedN, expanded = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref     = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c    = ref.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;

    const width  = wrap.clientWidth  || 500;
    const height = wrap.clientHeight || (expanded ? 480 : 220);

    const sx = width  / 500;
    const sy = height / 220;
    const s  = Math.min(sx, sy);

    const DPR = window.devicePixelRatio || 1;
    c.width        = width  * DPR;
    c.height       = height * DPR;
    c.style.width  = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d")!;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(6,8,16,0.55)";
    ctx.fillRect(0, 0, width, height);

    const pad = {
      t: Math.round(14 * sy),
      b: Math.round(28 * sy),
      l: Math.round(10 * sx),
      r: Math.round(10 * sx),
    };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const fs = {
      tick:  `${Math.round(9  * s)}px monospace`,
      label: `${Math.round(11 * s)}px monospace`,
      axis:  `${Math.round(10 * s)}px monospace`,
    };

    const es    = data.eigenstates[selectedN];
    const prob  = es.prob;
    const x     = data.x;
    const V     = data.V;
    const color = COLORS[selectedN % COLORS.length];

    const probMax = Math.max(...prob) || 1;
    const xMin    = x[0];
    const xMax    = x[x.length - 1];
    const xRange  = xMax - xMin;
    const mapX    = (xi: number) => pad.l + ((xi - xMin) / xRange) * W;
    const mapY    = (yi: number) => pad.t + H - (yi / (probMax * 1.2)) * H;

    // ── V overlay ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.setLineDash([2 * s, 4 * s]);
    ctx.strokeStyle = "rgba(245,158,11,0.5)";
    ctx.lineWidth   = 1.2 * s;
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

    // ── Fill under prob ───────────────────────────────────────────────────
    ctx.beginPath();
    prob.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = mapY(v);
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.lineTo(mapX(x[x.length - 1]), pad.t + H);
    ctx.lineTo(mapX(x[0]),             pad.t + H);
    ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();

    // ── Prob line ─────────────────────────────────────────────────────────
    ctx.shadowColor = color;
    ctx.shadowBlur  = 5 * s;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8 * s;
    prob.forEach((v, i) => {
      const xp = mapX(x[i]);
      const yp = mapY(v);
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Y axis ticks (expanded only) ──────────────────────────────────────
    if (expanded) {
      ctx.fillStyle  = "rgba(255,255,255,0.75)";
      ctx.font       = fs.tick;
      ctx.textAlign  = "right";
      const ySteps   = 5;
      for (let i = 0; i <= ySteps; i++) {
        const val = (probMax * 1.2) * (i / ySteps);
        const yp  = mapY(val);
        ctx.fillText(val.toFixed(2), pad.l - 4 * sx, yp + 3);
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth   = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.l,     yp);
        ctx.lineTo(pad.l + W, yp);
        ctx.stroke();
        ctx.restore();
      }
      // Y axis label
      ctx.save();
      ctx.fillStyle  = "rgba(255,255,255,0.85)";
      ctx.font       = fs.axis;
      ctx.textAlign  = "center";
      ctx.translate(pad.l - 28 * sx, pad.t + H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("|ψ(x)|²", 0, 0);
      ctx.restore();
    }

    // ── X axis ticks ──────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font      = fs.tick;
    ctx.textAlign = "center";
    [-8, -4, 0, 4, 8].forEach(v => {
      const xp = mapX(v);
      if (xp < pad.l || xp > pad.l + W) return;
      ctx.fillText(String(v), xp, height - pad.b + 14 * sy);
    });

    // X label
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = fs.label;
    ctx.fillText("x", pad.l + W / 2, height - pad.b + 24 * sy);

  }, [data, selectedN, expanded]);

  return (
    <div
      ref={wrapRef}
      style={{
        width:  "100%",
        height: expanded ? "min(480px, 60vh)" : 220,
        position: "relative",
      }}
    >
      <canvas
        ref={ref}
        style={{ position: "absolute", inset: 0, borderRadius: 6, display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}