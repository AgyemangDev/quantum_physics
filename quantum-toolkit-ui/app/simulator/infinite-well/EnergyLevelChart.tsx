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

    const maxE = Math.max(...data.energies) * 1.25;
    const mapX = (xi: number) => pad.l + ((xi - xMin) / xRange) * W;
    const mapY = (e:  number) => pad.t + H - (e / maxE) * H;

    // Find well boundaries from V array
    const V = data.V;
    const dx_grid = x[1] - x[0];
    // well is where V ≈ 0
    const insideWell = V.map(v => v < 1);
    const firstInside = insideWell.indexOf(true);
    const lastInside  = insideWell.lastIndexOf(true);
    const xWallLeft  = x[firstInside]  ?? -5;
    const xWallRight = x[lastInside]   ??  5;
    const pxWallLeft  = mapX(xWallLeft);
    const pxWallRight = mapX(xWallRight);

    // ── Draw hatched wall regions ──────────────────────────────────────────
    const drawHatch = (x0: number, x1: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, pad.t, x1 - x0, H);
      ctx.clip();
      ctx.fillStyle = "rgba(245,158,11,0.07)";
      ctx.fillRect(x0, pad.t, x1 - x0, H);
      ctx.strokeStyle = "rgba(245,158,11,0.18)";
      ctx.lineWidth = 0.8;
      for (let xi = x0 - H; xi < x1 + H; xi += 8) {
        ctx.beginPath();
        ctx.moveTo(xi, pad.t);
        ctx.lineTo(xi + H, pad.t + H);
        ctx.stroke();
      }
      ctx.restore();
    };
    drawHatch(pad.l, pxWallLeft);
    drawHatch(pxWallRight, pad.l + W);

    // ── Wall vertical lines ────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(245,158,11,0.7)";
    ctx.lineWidth = 1.5;
    [pxWallLeft, pxWallRight].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, pad.t + H);
      ctx.stroke();
    });

    // ── Well floor (V=0 line) ─────────────────────────────────────────────
    const floorY = mapY(0);
    ctx.strokeStyle = "rgba(245,158,11,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pxWallLeft, floorY);
    ctx.lineTo(pxWallRight, floorY);
    ctx.stroke();

    // ── Grid lines (subtle) ───────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    [-8,-4,0,4,8].forEach(v => {
      const xp = mapX(v);
      ctx.beginPath();
      ctx.moveTo(xp, pad.t);
      ctx.lineTo(xp, pad.t + H);
      ctx.stroke();
    });

    // ── For each eigenstate ────────────────────────────────────────────────
    data.eigenstates.forEach((es, idx) => {
      const color      = COLORS[idx % COLORS.length];
      const isSelected = idx === selectedN;
      const ey         = mapY(es.energy);

      // Amplitude scale: spacing between levels * 0.4
      const spacing    = H / (data.n_states + 1);
      const amplitude  = spacing * 0.42;

      // Energy level horizontal line (full width inside well)
      ctx.strokeStyle = isSelected ? color : color + "55";
      ctx.lineWidth   = isSelected ? 1.5 : 0.8;
      ctx.setLineDash(isSelected ? [] : [3, 4]);
      ctx.beginPath();
      ctx.moveTo(pxWallLeft,  ey);
      ctx.lineTo(pxWallRight, ey);
      ctx.stroke();
      ctx.setLineDash([]);

      // Energy label on left
      ctx.fillStyle = "white";
      ctx.font        = isSelected ? "bold 8px monospace" : "7px monospace";
      ctx.textAlign   = "right";
      ctx.fillText(`E${idx + 1}`, pad.l - 3, ey + 3);

      // Wavefunction — only draw INSIDE the well
      // Find max amplitude for normalization
      const psiMax = Math.max(...es.real.map(Math.abs)) || 1;

      ctx.beginPath();
      ctx.strokeStyle = isSelected ? color : color + "55";
      ctx.lineWidth   = isSelected ? 1.6 : 0.9;
      let started = false;
      es.real.forEach((v, i) => {
        if (!insideWell[i]) { started = false; return; }
        const xp = mapX(x[i]);
        const yp = ey - (v / psiMax) * amplitude;
        if (!started) { ctx.moveTo(xp, yp); started = true; }
        else ctx.lineTo(xp, yp);
      });
      ctx.stroke();

      // Glow for selected
      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.8;
        let s2 = false;
        es.real.forEach((v, i) => {
          if (!insideWell[i]) { s2 = false; return; }
          const xp = mapX(x[i]);
          const yp = ey - (v / psiMax) * amplitude;
          if (!s2) { ctx.moveTo(xp, yp); s2 = true; }
          else ctx.lineTo(xp, yp);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // ── X axis ticks ──────────────────────────────────────────────────────
    ctx.fillStyle = "white";
    ctx.font        = "7px monospace";
    ctx.textAlign   = "center";
    ctx.setLineDash([]);
    [-8,-4,0,4,8].forEach(v => {
      ctx.fillText(String(v), mapX(v), height - 4);
    });

    // ── Y axis label ──────────────────────────────────────────────────────
    ctx.save();ctx.fillStyle = "white";
    ctx.fillStyle = "white";
    ctx.font        = "7px monospace";
    ctx.textAlign   = "center";
    ctx.translate(10, pad.t + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Energy", 0, 0);
    ctx.restore();

  }, [data, selectedN, width, height]);

  return (
    <canvas
      ref={ref}
      style={{ borderRadius: 6, display: "block", width: "100%" }}
    />
  );
}