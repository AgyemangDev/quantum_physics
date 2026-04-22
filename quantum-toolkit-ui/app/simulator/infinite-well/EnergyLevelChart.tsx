"use client";
import { useEffect, useRef } from "react";
import type { InfiniteWellResponse } from "./useInfiniteWell";

const COLORS = ["#22d3ee","#a78bfa","#34d399","#f59e0b","#f87171",
                "#38bdf8","#c084fc","#4ade80","#fbbf24","#fb7185"];

const VIEW_XMIN   = -6;
const VIEW_XMAX   =  6;
const VIEW_XRANGE = VIEW_XMAX - VIEW_XMIN;

interface Props {
  data: InfiniteWellResponse;
  selectedN: number;
  expanded?: boolean;
}

export default function EnergyLevelChart({ data, selectedN, expanded = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref     = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c   = ref.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;

    const width  = wrap.clientWidth  || 500;
    const height = wrap.clientHeight || (expanded ? 560 : 320);

    const sx = width  / 500;
    const sy = height / 320;
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
      t: Math.round(20 * sy),
      b: Math.round(36 * sy),
      l: Math.round(52 * sx),
      r: Math.round(16 * sx),
    };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const fs = {
      tiny:   `${Math.round(9  * s)}px monospace`,
      small:  `${Math.round(10 * s)}px monospace`,
      medium: `${Math.round(11 * s)}px monospace`,
      label:  `${Math.round(13 * s)}px monospace`,
    };

    const maxE  = Math.max(...data.energies) * 1.4;
    const mapX  = (xi: number) => pad.l + ((xi - VIEW_XMIN) / VIEW_XRANGE) * W;
    const mapY  = (e:  number) => pad.t + H - (e / maxE) * H;
    const amplitude = Math.min((H / (data.n_states + 1)) * 0.35, 30 * s);

    // ── Well boundaries ───────────────────────────────────────────────────
    const x           = data.x;
    const V           = data.V;
    const insideWell  = V.map(v => v < 1);
    const firstInside = insideWell.indexOf(true);
    const lastInside  = insideWell.lastIndexOf(true);
    const xWallLeft   = x[firstInside] ?? -5;
    const xWallRight  = x[lastInside]  ??  5;
    const pxWallLeft  = mapX(xWallLeft);
    const pxWallRight = mapX(xWallRight);

    // ── Hatched walls ─────────────────────────────────────────────────────
    const drawHatch = (x0: number, x1: number) => {
      if (x1 <= x0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, pad.t, x1 - x0, H);
      ctx.clip();
      ctx.fillStyle   = "rgba(245,158,11,0.07)";
      ctx.fillRect(x0, pad.t, x1 - x0, H);
      ctx.strokeStyle = "rgba(245,158,11,0.18)";
      ctx.lineWidth   = 0.8 * s;
      const hatchStep = Math.round(8 * s);
      for (let xi = x0 - H; xi < x1 + H; xi += hatchStep) {
        ctx.beginPath();
        ctx.moveTo(xi,     pad.t);
        ctx.lineTo(xi + H, pad.t + H);
        ctx.stroke();
      }
      ctx.restore();
    };
    drawHatch(pad.l,                            Math.max(pad.l, pxWallLeft));
    drawHatch(Math.min(pad.l + W, pxWallRight), pad.l + W);

    // ── Wall lines ────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(245,158,11,0.7)";
    ctx.lineWidth   = 1.5 * s;
    [pxWallLeft, pxWallRight].forEach(px => {
      if (px < pad.l || px > pad.l + W) return;
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, pad.t + H);
      ctx.stroke();
    });

    // ── Well floor ────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(245,158,11,0.4)";
    ctx.lineWidth   = 1 * s;
    ctx.beginPath();
    ctx.moveTo(Math.max(pad.l, pxWallLeft),      mapY(0));
    ctx.lineTo(Math.min(pad.l + W, pxWallRight), mapY(0));
    ctx.stroke();

    // ── Faint n²E₁ reference grid ─────────────────────────────────────────
    const E1 = data.energies[0] ?? 0;
    ctx.setLineDash([1 * s, 5 * s]);
    ctx.lineWidth = 0.3 * s;
    data.energies.forEach((_, idx) => {
      const refE = E1 * (idx + 1) * (idx + 1);
      if (refE > maxE) return;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(pad.l,     mapY(refE));
      ctx.lineTo(pad.l + W, mapY(refE));
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // ── Pre-compute level y positions ─────────────────────────────────────
    const eyPx = data.eigenstates.map(es => mapY(es.energy));

    // ── Draw all eigenstates ──────────────────────────────────────────────
    data.eigenstates.forEach((es, idx) => {
      const color      = COLORS[idx % COLORS.length];
      const isSelected = idx === selectedN;
      const ey         = eyPx[idx];

      const lineLeft  = Math.max(pad.l, pxWallLeft);
      const lineRight = Math.min(pad.l + W, pxWallRight);
      ctx.strokeStyle = isSelected ? color : color + "55";
      ctx.lineWidth   = (isSelected ? 1.5 : 0.8) * s;
      ctx.setLineDash(isSelected ? [] : [3 * s, 4 * s]);
      ctx.beginPath();
      ctx.moveTo(lineLeft,  ey);
      ctx.lineTo(lineRight, ey);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isSelected ? color : "rgba(255,255,255,0.65)";
      ctx.font      = isSelected ? `bold ${fs.medium}` : fs.small;
      ctx.textAlign = "right";
      ctx.fillText(`E${idx + 1}`, pad.l - 4 * sx, ey + 3 * sy);

      ctx.fillStyle = isSelected ? color + "cc" : "rgba(255,255,255,0.45)";
      ctx.font      = fs.tiny;
      ctx.fillText(es.energy.toFixed(2), pad.l - 4 * sx, ey + 10 * sy);

      const psiMax = Math.max(...es.real.map(Math.abs)) || 1;

      const drawWave = (lw: number, style: string, blur = 0) => {
        ctx.save();
        const clipL = Math.max(pad.l, pxWallLeft);
        const clipR = Math.min(pad.l + W, pxWallRight);
        ctx.beginPath();
        ctx.rect(clipL, pad.t, clipR - clipL, H);
        ctx.clip();
        ctx.beginPath();
        ctx.strokeStyle = style;
        ctx.lineWidth   = lw;
        ctx.shadowBlur  = blur;
        ctx.shadowColor = color;
        let started = false;
        es.real.forEach((v, i) => {
          if (!insideWell[i]) { started = false; return; }
          const xp = pad.l + ((x[i] - VIEW_XMIN) / VIEW_XRANGE) * W;
          const yp = ey - (v / psiMax) * amplitude;
          if (!started) { ctx.moveTo(xp, yp); started = true; }
          else          { ctx.lineTo(xp, yp); }
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      };

      drawWave((isSelected ? 1.6 : 0.9) * s, isSelected ? color : color + "55");
      if (isSelected) drawWave(1.8 * s, color, 7 * s);
    });

    // ── Y axis energy values ──────────────────────────────────────────────
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font      = fs.tiny;
    ctx.textAlign = "right";
    data.energies.forEach((e, idx) => {
      const ey = eyPx[idx];
      if (ey < pad.t + 4 || ey > pad.t + H - 4) return;
      if (data.n_states > 7 && idx % 2 !== 0) return;
      ctx.fillText(e.toFixed(1), pad.l - 18 * sx, ey + 2);
    });

    // ── X axis ticks ──────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = fs.small;
    ctx.textAlign = "center";
    [-6, -4, -2, 0, 2, 4, 6].forEach(v => {
      const xp = mapX(v);
      if (xp < pad.l - 1 || xp > pad.l + W + 1) return;
      ctx.fillText(String(v), xp, height - pad.b + 14 * sy);
    });
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = fs.label;
    ctx.fillText("x", pad.l + W / 2, height - pad.b + 24 * sy);

    // ── Y axis label ──────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = fs.small;
    ctx.textAlign = "center";
    ctx.translate(10 * sx, pad.t + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Energy  (ℏ=m=1)", 0, 0);
    ctx.restore();

    // ── Top-right annotation ──────────────────────────────────────────────
    ctx.fillStyle = "rgba(245,158,11,0.35)";
    ctx.font      = fs.tiny;
    ctx.textAlign = "right";
    ctx.fillText(
      `L=${data.well_width.toFixed(1)}  E₁=${data.energies[0]?.toFixed(2) ?? "—"}`,
      pad.l + W,
      pad.t - 6 * sy,
    );
  }, [data, selectedN, expanded]);

  return (
    <div
      ref={wrapRef}
      style={{
        width:  "100%",
        height: expanded ? "min(560px, 65vh)" : 320,
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