"use client";
import { useEffect, useRef } from "react";

interface LineChartProps {
  x:        number[];
  y:        number[];
  y2?:      number[];
  V?:       number[];
  Vmax?:    number;
  color?:   string;
  color2?:  string;
  width?:   number;
  height?:  number;
  /** Optional fixed Y-axis domain [min, max].
   *  When provided the axis is frozen to these bounds so changes in
   *  amplitude are visible as an actual change in wave height rather
   *  than just a rescale of the viewport. */
  yDomain?: [number, number];
}

export default function LineChart({
  x, y, y2, V, Vmax,
  color   = "#22d3ee",
  color2  = "#a78bfa",
  width   = 420,
  height  = 190,
  yDomain,
}: LineChartProps): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !x.length) return;

    const ctx = c.getContext("2d")!;
    c.width  = width  * 2;
    c.height = height * 2;
    c.style.width  = `${width}px`;
    c.style.height = `${height}px`;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "rgba(6,8,16,0.55)";
    ctx.fillRect(0, 0, width, height);

    const pad = { t: 14, b: 24, l: 10, r: 10 };
    const W = width  - pad.l - pad.r;
    const H = height - pad.t - pad.b;

    // ── Y-axis bounds ────────────────────────────────────────────
    // If a fixed domain is supplied we use it so the wave visually
    // grows / shrinks as amplitude changes.  Otherwise fall back to
    // auto-scaling (original behaviour).
    let yMin: number, yMax: number;
    if (yDomain) {
      [yMin, yMax] = yDomain;
    } else {
      const allY = [...y, ...(y2 ?? [])];
      yMin = Math.min(...allY);
      yMax = Math.max(...allY);
    }
    const yRange = yMax - yMin || 1;

    const xMin  = x[0];
    const xMax  = x[x.length - 1];
    const xRange = xMax - xMin;

    const mapX = (xi: number) => pad.l + ((xi - xMin) / xRange) * W;
    const mapY = (yi: number) => pad.t + H - ((yi - yMin) / yRange) * H;

    // Y-axis label
    ctx.save();
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    ctx.font      = "8px monospace";
    ctx.textAlign = "center";
    ctx.translate(pad.l - 2, pad.t + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ψ", 0, 0);
    ctx.restore();

    // X-axis label
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    ctx.font      = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("x", pad.l + W / 2, height - 2);

    // Y-axis tick values
    ctx.fillStyle = "rgba(148,163,184,0.3)";
    ctx.font      = "7px monospace";
    ctx.textAlign = "right";
    [yMin, (yMin + yMax) / 2, yMax].forEach(v => {
      ctx.fillText(v.toFixed(2), pad.l - 2, mapY(v) + 3);
    });

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    [-8, -4, 0, 4, 8].forEach(v => {
      if (v < xMin || v > xMax) return;
      const xp = mapX(v);
      ctx.beginPath();
      ctx.moveTo(xp, pad.t);
      ctx.lineTo(xp, pad.t + H);
      ctx.stroke();
    });

    // V overlay — dashed amber, independent vertical scale
    if (V && Vmax && Vmax > 0) {
      ctx.save();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = "rgba(251,191,36,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const VdisplayMax = Vmax;
      V.forEach((v, i) => {
        const vClamped = Math.min(v, VdisplayMax);
        const vn = VdisplayMax > 0 ? (vClamped / VdisplayMax) * (H * 0.7) : 0;
        const xp = pad.l + (i / (V.length - 1)) * W;
        const yp = pad.t + H - vn;
        i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Zero line
    const y0 = mapY(0);
    if (y0 > pad.t && y0 < pad.t + H) {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(pad.l, y0);
      ctx.lineTo(pad.l + W, y0);
      ctx.stroke();
    }

    // Draw y — with subtle glow
    ctx.shadowColor = color;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.6;
    ctx.setLineDash([]);
    y.forEach((v, i) => {
      i === 0 ? ctx.moveTo(mapX(x[i]), mapY(v)) : ctx.lineTo(mapX(x[i]), mapY(v));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw y2
    if (y2) {
      ctx.shadowColor = color2;
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.strokeStyle = color2;
      ctx.lineWidth   = 1.6;
      y2.forEach((v, i) => {
        i === 0 ? ctx.moveTo(mapX(x[i]), mapY(v)) : ctx.lineTo(mapX(x[i]), mapY(v));
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // X-axis tick labels
    ctx.fillStyle   = "rgba(148,163,184,0.45)";
    ctx.font        = "8px 'JetBrains Mono', monospace";
    ctx.textAlign   = "center";
    [-8, -4, 0, 4, 8].forEach(v => {
      if (v < xMin || v > xMax) return;
      ctx.fillText(String(v), mapX(v), height - 5);
    });
  }, [x, y, y2, V, Vmax, color, color2, width, height, yDomain]);

  return (
    <canvas
      ref={ref}
      style={{ borderRadius: 6, display: "block", width: "100%" }}
    />
  );
}