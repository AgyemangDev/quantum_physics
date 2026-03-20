export interface WavePacketResponse {
  x: number[]; real: number[]; imag: number[];
  prob: number[]; k: number[]; prob_k: number[];
  sigma_x: number; sigma_k: number;
  heisenberg_product: number; norm: number;
}

export type Dimension = "1D" | "2D" | "3D";

export function buildChartData(
  xs: number[], ys1: number[], ys2?: number[], keys = ["y1", "y2"]
) {
  const step = Math.max(1, Math.floor(xs.length / 256));
  const out = [];
  for (let i = 0; i < xs.length; i += step) {
    const row: Record<string, number> = { x: parseFloat(xs[i].toFixed(3)) };
    row[keys[0]] = parseFloat(ys1[i].toFixed(5));
    if (ys2) row[keys[1]] = parseFloat(ys2[i].toFixed(5));
    out.push(row);
  }
  return out;
}

export const tooltipStyle = {
  background: "var(--bg-raised)", border: "1px solid var(--border)",
  borderRadius: 4, fontSize: 11,
  fontFamily: "'Space Mono', monospace",
  color: "var(--text-primary)",
};

export const fmt = (v: unknown) =>
  typeof v === "number" ? v.toFixed(5) : String(v);
