"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbars/Navbar";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

// KaTeX must be client-only (no SSR)
const Eq = dynamic(() => import("../components/Eq"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface WavePacketResponse {
  x: number[]; real: number[]; imag: number[];
  prob: number[]; k: number[]; prob_k: number[];
  sigma_x: number; sigma_k: number;
  heisenberg_product: number; norm: number;
}

// Downsample array to max `n` points for chart performance
function downsample(arr: number[], n = 256): number[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

function buildChartData(
  xs: number[], ys1: number[], ys2?: number[], ys3?: number[],
  keys = ["y1", "y2", "y3"]
) {
  const n = 256;
  const step = Math.max(1, Math.floor(xs.length / n));
  const out = [];
  for (let i = 0; i < xs.length; i += step) {
    const row: Record<string, number> = { x: parseFloat(xs[i].toFixed(3)) };
    row[keys[0]] = parseFloat(ys1[i].toFixed(5));
    if (ys2) row[keys[1]] = parseFloat(ys2[i].toFixed(5));
    if (ys3) row[keys[2]] = parseFloat(ys3[i].toFixed(5));
    out.push(row);
  }
  return out;
}

// ── small sub-components ────────────────────────────────────────────────────

function EqBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(0,229,255,0.04)", border: "1px solid var(--border)",
      borderRadius: 6, padding: "10px 14px", fontSize: 13,
      color: "var(--text-secondary)", marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const,
      color: "var(--text-muted)", marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="panel" style={{ padding: "12px 16px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function NormBar({ norm }: { norm: number }) {
  const pct = Math.min(norm * 100, 100);
  const ok  = norm > 0.999 && norm < 1.001;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Norm</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: ok ? "var(--green)" : "var(--red-accent)", fontFamily: "var(--font-mono)" }}>
          {norm.toFixed(6)}
        </span>
      </div>
      <div style={{ height: 6, background: "var(--bg-raised)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: ok ? "var(--green)" : "var(--red-accent)", borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <EqBox>
        <Eq tex={String.raw`\int_{-\infty}^{+\infty}|\psi(x)|^2\,dx = 1`} />
      </EqBox>
    </div>
  );
}

// Slider that shows limit labels at edges
function Slider({
  label, value, min, max, step, color = "var(--cyan)",
  onChange, explanation,
}: {
  label: string; value: number; min: number; max: number;
  step: number; color?: string; onChange: (v: number) => void;
  explanation?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
        <span style={{ fontSize: 13, color, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{value.toFixed(step < 0.1 ? 2 : 1)}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{
          height: 4, borderRadius: 2, pointerEvents: "none",
          background: `linear-gradient(to right, ${color} ${pct}%, var(--bg-raised) ${pct}%)`,
          position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%",
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: "relative", zIndex: 1, background: "transparent", width: "100%" }}
        />
      </div>
      {/* Edge labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{min}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{max}</span>
      </div>
      {explanation && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{explanation}</div>
      )}
    </div>
  );
}

// ── Chart panels ─────────────────────────────────────────────────────────────

function ChartPanel({
  title, dot, children, explanation, eqBox,
}: {
  title: string; dot: string;
  children: React.ReactNode;
  explanation: string;
  eqBox?: React.ReactNode;
}) {
  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div className="panel-header">
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-secondary)" }}>{title}</span>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {eqBox}
        {children}
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, borderLeft: `2px solid ${dot}`, paddingLeft: 10 }}>
          {explanation}
        </div>
      </div>
    </div>
  );
}

const CHART_STYLE = {
  fontSize: 10,
  fontFamily: "'Space Mono', monospace",
};

const tooltipStyle = {
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  fontSize: 11,
  fontFamily: "'Space Mono', monospace",
  color: "var(--text-primary)",
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [x0,    setX0]    = useState(0);
  const [sigma, setSigma] = useState(1.0);
  const [k0,    setK0]    = useState(3.0);

  const [data,    setData]    = useState<WavePacketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const compute = useCallback(async (p: { x0: number; sigma: number; k0: number }) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/wave-packet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x0: p.x0, sigma: p.sigma, k0: p.k0, x_min: -10, x_max: 10, N: 512 }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced auto-compute — 200ms per spec
  useEffect(() => {
    const t = setTimeout(() => compute({ x0, sigma, k0 }), 200);
    return () => clearTimeout(t);
  }, [x0, sigma, k0, compute]);

  // Chart data
  const probData     = data ? buildChartData(data.x, data.prob,                          undefined, undefined, ["prob"])            : [];
  const envelopeData = data ? buildChartData(data.x, data.prob.map(v => Math.sqrt(v)),   undefined, undefined, ["env"])             : [];
  const reImData     = data ? buildChartData(data.x, data.real, data.imag,               undefined, ["re", "im"])                   : [];
  const momData      = data ? buildChartData(data.k, data.prob_k,                        undefined, undefined, ["prob_k"])          : [];

  const hp = data?.heisenberg_product ?? 0;
  const hpOk = hp >= 0.499;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 56px)" }}>

        {/* ── Sidebar ── */}
        <aside style={{ borderRight: "1px solid var(--border)", padding: "20px 16px", background: "var(--bg-deep)", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" as const }}>◈ Parameters</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? "var(--amber)" : "var(--green)", display: "inline-block", animation: loading ? "pulse-glow 1s infinite" : "none" }} />
              {loading ? "updating…" : "live"}
            </span>
          </div>

          {/* Wave function equation */}
          <EqBox>
            <div style={{ marginBottom: 6, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Wave function</div>
            <Eq display tex={String.raw`\psi(x)=\!\left(2\pi\sigma^2\right)^{\!-1/4}\exp\!\left(-\frac{(x-x_0)^2}{4\sigma^2}\right)e^{ik_0 x}`} />
          </EqBox>

          <Slider
            label="Centre x₀" value={x0} min={-5} max={5} step={0.5}
            onChange={setX0}
            explanation="Shifts where the packet is centred in space. Moving it left or right changes the starting position of the particle."
          />
          <Slider
            label="Width σ" value={sigma} min={0.2} max={3.0} step={0.1}
            color="var(--green)" onChange={setSigma}
            explanation="Wider σ → particle more spread out in position, sharper in momentum. Narrower σ → more localised, but momentum becomes uncertain."
          />
          <Slider
            label="Wave vector k₀" value={k0} min={-8} max={8} step={0.5}
            color="var(--violet)" onChange={setK0}
            explanation="Sets the average momentum of the particle (p = ħk₀). Positive = moves right, negative = moves left. Higher |k₀| = faster particle."
          />

          {/* Norm bar */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
            {data ? <NormBar norm={data.norm} /> : (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Move a slider to compute</div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,68,102,0.1)", border: "1px solid rgba(255,68,102,0.4)", borderRadius: 6, fontSize: 11, color: "#ff4466" }}>
              {error}
            </div>
          )}
        </aside>

        {/* ── Main content ── */}
        <main style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {/* Metrics row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
            <MetricCard label="σ_x  position" value={data ? data.sigma_x.toFixed(4) : "—"} color="var(--cyan)" sub="uncertainty in x" />
            <MetricCard label="σ_k  momentum" value={data ? data.sigma_k.toFixed(4) : "—"} color="var(--violet)" sub="uncertainty in k" />
            <div className="panel" style={{ padding: "12px 16px", flex: 2, minWidth: 200 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>σ_x · σ_k  (Heisenberg)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: hpOk ? "var(--green)" : "var(--red-accent)", fontFamily: "var(--font-mono)" }}>
                  {data ? hp.toFixed(5) : "—"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {hpOk ? "≥ 0.5  ✓  minimum uncertainty" : "< 0.5  ✗  violation"}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Eq tex={String.raw`\sigma_x \cdot \sigma_k \geq \tfrac{1}{2}`} />
              </div>
            </div>
          </div>

          {/* Chart 1 — Probability density */}
          <ChartPanel
            title="Probability density  |ψ(x)|²"
            dot="var(--cyan)"
            eqBox={
              <EqBox>
                <Eq tex={String.raw`\rho(x) = |\psi(x)|^2`} />
                {"  "}
                <Eq tex={String.raw`\psi(x)=\left(2\pi\sigma^2\right)^{-1/4}\exp\!\left(-\frac{(x-x_0)^2}{4\sigma^2}\right)e^{ik_0 x}`} />
              </EqBox>
            }
            explanation={`This curve shows where the particle is most likely to be found. The peak sits at x₀ = ${x0}. The wider the curve (larger σ = ${sigma}), the less certain we are about the particle's exact position. The area under the entire curve always equals 1 — the particle must be somewhere.`}
          >
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={probData} style={CHART_STYLE}>
                <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 10 }} label={{ value: "x", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(5) : String(v))} />
                <ReferenceLine x={x0} stroke="rgba(0,229,255,0.3)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="prob" stroke="var(--cyan)" dot={false} strokeWidth={2} name="|ψ|²" />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          {/* Chart 2 — Gaussian envelope */}
          <ChartPanel
            title="Gaussian envelope  |ψ(x)|"
            dot="var(--green)"
            eqBox={
              <EqBox>
                <Eq tex={String.raw`|\psi(x)| = \left(2\pi\sigma^2\right)^{-1/4}\exp\!\left(-\frac{(x-x_0)^2}{4\sigma^2}\right)`} />
              </EqBox>
            }
            explanation={`This is the amplitude envelope — the "container" that determines the shape of the wave packet. Unlike the probability density, this shows the actual height of the wave before squaring. The envelope is a pure Gaussian centred at x₀ = ${x0} with width σ = ${sigma}. It does not depend on k₀ — changing the momentum only shifts oscillations inside the envelope, not the envelope itself.`}
          >
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={envelopeData} style={CHART_STYLE}>
                <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(5) : String(v))} />
                <ReferenceLine x={x0} stroke="rgba(0,255,136,0.3)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="env" stroke="var(--green)" dot={false} strokeWidth={2} name="|ψ|" />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          {/* Chart 3 — Real & imaginary parts */}
          <ChartPanel
            title="Real & imaginary parts of ψ(x)"
            dot="var(--violet)"
            eqBox={
              <EqBox>
                <Eq tex={String.raw`\psi(x) = \underbrace{\text{Re}(\psi)}_{\cos(k_0 x)\cdot\text{env}} + i\,\underbrace{\text{Im}(\psi)}_{\sin(k_0 x)\cdot\text{env}}`} />
              </EqBox>
            }
            explanation={`The wave function is complex — it has both a real and an imaginary part that oscillate inside the Gaussian envelope. The oscillation frequency is set by k₀ = ${k0}: higher |k₀| means more rapid oscillations. Re(ψ) and Im(ψ) are always 90° out of phase with each other. Neither Re(ψ) nor Im(ψ) alone is physically observable — only |ψ|² is.`}
          >
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={reImData} style={CHART_STYLE}>
                <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(5) : String(v))} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'Space Mono', monospace" }} />
                <Line type="monotone" dataKey="re" stroke="var(--violet)" dot={false} strokeWidth={1.5} name="Re(ψ)" />
                <Line type="monotone" dataKey="im" stroke="var(--amber)"  dot={false} strokeWidth={1.5} name="Im(ψ)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

          {/* Chart 4 — Momentum space */}
          <ChartPanel
            title="Momentum space  |ψ̃(k)|²"
            dot="var(--violet)"
            eqBox={
              <EqBox>
                <Eq tex={String.raw`\tilde{\psi}(k) = \frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}\psi(x)\,e^{-ikx}\,dx`} />
              </EqBox>
            }
            explanation={`This is the Fourier transform of ψ(x) — it shows the distribution of momenta in the wave packet. The peak sits at k₀ = ${k0}, which is the most probable momentum. The width of this peak is σ_k = ${data?.sigma_k.toFixed(3) ?? "…"}. Notice: a wider packet in position space (large σ) gives a narrower peak here, and vice versa. This is the Heisenberg uncertainty principle in action.`}
          >
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={momData} style={CHART_STYLE}>
                <XAxis dataKey="x" stroke="var(--text-muted)" tick={{ fontSize: 10 }} label={{ value: "k", position: "insideBottomRight", offset: -4, fill: "var(--text-muted)", fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(5) : String(v))} />
                <ReferenceLine x={k0} stroke="rgba(139,92,246,0.4)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="prob_k" stroke="var(--violet)" dot={false} strokeWidth={2} name="|ψ̃(k)|²" />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>

        </main>
      </div>
    </div>
  );
}