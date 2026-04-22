"use client";
import { useEffect, useRef } from "react";

interface LineChartProps {
  x:      number[];
  y:      number[];
  y2?:    number[];
  V?:     number[];
  Vmax?:  number;
  color?:  string;
  color2?: string;
  expanded?: boolean;
}

export default function LineChart({
  x, y, y2, V, Vmax,
  color  = "#22d3ee",
  color2 = "#a78bfa",
  expanded = false,
}: LineChartProps): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref     = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c    = ref.current;
    const wrap = wrapRef.current;
    if (!c || !wrap || !x.length) return;

    const width  = wrap.clientWidth  || 420;
    const height = wrap.clientHeight || (expanded ? 420 : 190);

    const sx = width  / 420;
    const sy = height / 190;
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
      l: Math.round((expanded ? 36 : 10) * sx),
      r: Math.round(10 * sx),
    };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    const fs = {
      tiny:  `${Math.round(9  * s)}px monospace`,
      small: `${Math.round(10 * s)}px monospace`,
      med:   `${Math.round(11 * s)}px monospace`,
    };

    const allY   = [...y, ...(y2 ?? [])];
    const yMin   = Math.min(...allY);
    const yMax   = Math.max(...allY);
    const yRange = yMax - yMin || 1;
    const xMin   = x[0];
    const xMax   = x[x.length - 1];
    const xRange = xMax - xMin;

    const mapX = (xi: number) => pad.l + ((xi - xMin) / xRange) * W;
    const mapY = (yi: number) => pad.t + H - ((yi - yMin) / yRange) * H;

    // ── Y-axis label ──────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = fs.small;
    ctx.textAlign = "center";
    ctx.translate(expanded ? pad.l - 22 * sx : pad.l - 2, pad.t + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(y2 ? "ψ" : "|ψ|²", 0, 0);
    ctx.restore();

    // ── X-axis label ──────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font      = fs.med;
    ctx.textAlign = "center";
    ctx.fillText("x", pad.l + W / 2, height - pad.b + 22 * sy);

    // ── Y-axis tick values ────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font      = fs.tiny;
    ctx.textAlign = "right";
    const yTicks = expanded ? 5 : 3;
    for (let i = 0; i <= yTicks; i++) {
      const val = yMin + (yRange * i) / yTicks;
      const yp  = mapY(val);
      ctx.fillText(val.toFixed(2), pad.l - 4 * sx, yp + 3);
      if (expanded) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth   = 0.5;
        ctx.setLineDash([2 * s, 4 * s]);
        ctx.beginPath();
        ctx.moveTo(pad.l,     yp);
        ctx.lineTo(pad.l + W, yp);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Vertical grid lines ───────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth   = 0.5 * s;
    ctx.setLineDash([]);
    [-8, -4, 0, 4, 8].forEach(v => {
      if (v < xMin || v > xMax) return;
      const xp = mapX(v);
      ctx.beginPath();
      ctx.moveTo(xp, pad.t);
      ctx.lineTo(xp, pad.t + H);
      ctx.stroke();
    });

    // ── V overlay ─────────────────────────────────────────────────────────
    if (V && Vmax && Vmax > 0) {
      ctx.save();
      ctx.setLineDash([2 * s, 4 * s]);
      ctx.strokeStyle = "rgba(251,191,36,0.6)";
      ctx.lineWidth   = 1.5 * s;
      ctx.beginPath();
      V.forEach((v, i) => {
        const vClamped = Math.min(v, Vmax);
        const vn = (vClamped / Vmax) * (H * 0.7);
        const xp = pad.l + (i / (V.length - 1)) * W;
        const yp = pad.t + H - vn;
        i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
      });
      ctx.stroke();
      ctx.restore();
    }

    // ── Zero line ─────────────────────────────────────────────────────────
    const y0 = mapY(0);
    if (y0 > pad.t && y0 < pad.t + H) {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth   = 0.5 * s;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(pad.l,     y0);
      ctx.lineTo(pad.l + W, y0);
      ctx.stroke();
    }

    // ── Draw y ────────────────────────────────────────────────────────────
    ctx.shadowColor = color;
    ctx.shadowBlur  = 4 * s;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.6 * s;
    ctx.setLineDash([]);
    y.forEach((v, i) => {
      i === 0 ? ctx.moveTo(mapX(x[i]), mapY(v)) : ctx.lineTo(mapX(x[i]), mapY(v));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Draw y2 ───────────────────────────────────────────────────────────
    if (y2) {
      ctx.shadowColor = color2;
      ctx.shadowBlur  = 4 * s;
      ctx.beginPath();
      ctx.strokeStyle = color2;
      ctx.lineWidth   = 1.6 * s;
      y2.forEach((v, i) => {
        i === 0 ? ctx.moveTo(mapX(x[i]), mapY(v)) : ctx.lineTo(mapX(x[i]), mapY(v));
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ── X-axis tick labels ────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font      = fs.small;
    ctx.textAlign = "center";
    [-8, -4, 0, 4, 8].forEach(v => {
      if (v < xMin || v > xMax) return;
      ctx.fillText(String(v), mapX(v), height - pad.b + 14 * sy);
    });
  }, [x, y, y2, V, Vmax, color, color2, expanded]);

  return (
    <div
      ref={wrapRef}
      style={{
        width:    "100%",
        height:   expanded ? "min(420px, 55vh)" : 190,
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