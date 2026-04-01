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

export default function EnergyLevelChart({ data, selectedN, width = 500, height = 320 }: Props) {
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

    const pad = { t: 20, b: 28, l: 44, r: 16 };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const x    = data.x;
    const xMin = x[0], xMax = x[x.length - 1];
    const xRange = xMax - xMin;

    const maxE  = Math.max(...data.energies) * 1.15;
    const mapX  = (xi: number) => pad.l + ((xi - xMin) / xRange) * W;
    const mapY  = (e:  number) => pad.t + H - (e / maxE) * H;

    // Draw V(x) well shape as filled region
    ctx.beginPath();
    ctx.fillStyle = "rgba(245,158,11,0.06)";
    const V = data.V;
    const Vcap = 100;
    V.forEach((v, i) => {
      const xp = pad.l + (i / (V.length - 1)) * W;
      const vn = Math.min(v, Vcap);
      const yp = pad.t + H - (vn / Vcap) * H;
      i === 0 ? ctx.moveTo(xp, pad.t + H) : null;
      ctx.lineTo(xp, yp);
    });
    ctx.lineTo(pad.l + W, pad.t + H);
    ctx.closePath();
    ctx.fill();

    // Well walls dashed
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = "rgba(245,158,11,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    V.forEach((v, i) => {
      const xp = pad.l + (i / (V.length - 1)) * W;
      const vn = Math.min(v, Vcap);
      const yp = pad.t + H - (vn / Vcap) * H;
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // For each eigenstate: horizontal energy line + wavefunction offset
    data.eigenstates.forEach((es, idx) => {
      const color = COLORS[idx % COLORS.length];
      const isSelected = idx === selectedN;
      const ey = mapY(es.energy);

      // Energy line
      ctx.strokeStyle = isSelected ? color : color + "66";
      ctx.lineWidth   = isSelected ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(pad.l, ey);
      ctx.lineTo(pad.l + W, ey);
      ctx.stroke();

      // Label
      ctx.fillStyle = isSelected ? color : color + "88";
      ctx.font = isSelected ? "bold 8px monospace" : "7px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`E${idx + 1}`, pad.l - 3, ey + 3);

      // Wavefunction offset by energy
      const scale = (maxE / data.n_states) * 0.4;
      ctx.beginPath();
      ctx.strokeStyle = isSelected ? color : color + "55";
      ctx.lineWidth   = isSelected ? 1.4 : 0.8;
      es.real.forEach((v, i) => {
        const xp = mapX(x[i]);
        const yp = ey - (v * scale);
        i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
      });
      ctx.stroke();
    });

    // X axis ticks
    ctx.fillStyle = "rgba(148,163,184,0.45)";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    [-8,-4,0,4,8].forEach(v => {
      const xp = mapX(v);
      ctx.fillText(String(v), xp, height - 4);
    });

    // Y axis label
    ctx.save();
    ctx.fillStyle = "rgba(148,163,184,0.4)";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.translate(10, pad.t + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Energy", 0, 0);
    ctx.restore();

  }, [data, selectedN, width, height]);

  return <canvas ref={ref} style={{ borderRadius: 6, display: "block", width: "100%" }} />;
}