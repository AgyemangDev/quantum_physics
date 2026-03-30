"use client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";
import EqBox from "./EqBox";
import ChartCard from "./ChartCard";
import { tooltipStyle, fmt } from "../../components/types";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

// ── Chart 1 — Probability density ────────────────────────────────────────────

export function ProbChart({ data, x0, sigma }: {
  data: Record<string, number>[]; x0: number; sigma: number;
}) {
  return (
    <ChartCard
      title="Probability density |ψ(x)|²"
      dot="var(--cyan)"
      eqBox={
        <EqBox>
          <Eq tex={String.raw`\rho(x)=|\psi(x)|^2`} />
        </EqBox>
      }
      explanation={`Peak at x₀ = ${x0}. Width controlled by σ = ${sigma}. Area under the curve always equals 1 — the particle must be somewhere.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="white" tick={{ fontSize: 9 }} />
          <YAxis stroke="white" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine x={x0} stroke="rgba(0,229,255,0.3)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="prob" stroke="var(--cyan)" dot={false} strokeWidth={2} name="|ψ|²" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart 2 — Gaussian envelope ───────────────────────────────────────────────

export function EnvelopeChart({ data, x0, sigma }: {
  data: Record<string, number>[]; x0: number; sigma: number;
}) {
  return (
    <ChartCard
      title="Gaussian envelope |ψ(x)|"
      dot="var(--green)"
      eqBox={
        <EqBox>
          <Eq tex={String.raw`|\psi(x)|=\left(2\pi\sigma^2\right)^{-1/4}e^{-(x-x_0)^2/4\sigma^2}`} />
        </EqBox>
      }
      explanation={`Amplitude before squaring. Centred at x₀ = ${x0}, width σ = ${sigma}. k₀ has no effect on this shape — only the oscillations inside it change.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="white" tick={{ fontSize: 9 }} />
          <YAxis stroke="white" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine x={x0} stroke="rgba(0,255,136,0.3)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="env" stroke="var(--green)" dot={false} strokeWidth={2} name="|ψ|" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart 3 — Re(ψ) and Im(ψ) — always 1D ────────────────────────────────────

export function ReImChart({ data, x0, k0 }: {
  data: Record<string, number>[]; x0: number; k0: number;
}) {
  return (
    <ChartCard
      title="Re(ψ) and Im(ψ)"
      dot="var(--violet)"
      eqBox={
        <EqBox>
          <Eq tex={String.raw`\psi = \underbrace{\cos(k_0 x)\cdot A}_{\text{Re}(\psi)} + i\,\underbrace{\sin(k_0 x)\cdot A}_{\text{Im}(\psi)}`} />
        </EqBox>
      }
      explanation={`Oscillation frequency set by k₀ = ${k0}. Re(ψ) in violet and Im(ψ) in amber are always 90° out of phase — Re leads Im by a quarter wavelength (λ/4). Neither Re nor Im alone is physically observable — only |ψ|² is.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="white" tick={{ fontSize: 9 }} />
          <YAxis stroke="white" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'Space Mono', monospace" }} />
          <Line type="monotone" dataKey="re" stroke="var(--violet)" dot={false} strokeWidth={1.5} name="Re(ψ)" />
          <Line type="monotone" dataKey="im" stroke="var(--amber)"  dot={false} strokeWidth={1.5} name="Im(ψ)" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Chart 4 — Momentum space ──────────────────────────────────────────────────

export function MomentumChart({ data, k0, sigma }: {
  data: Record<string, number>[]; k0: number; sigma: number;
}) {
  return (
    <ChartCard
      title="Momentum space |ψ̃(k)|²"
      dot="var(--violet)"
      eqBox={
        <EqBox>
          <Eq tex={String.raw`\tilde{\psi}(k)=\frac{1}{\sqrt{2\pi}}\int\psi(x)e^{-ikx}dx`} />
        </EqBox>
      }
      explanation={`Peak at k₀ = ${k0}. Width σ_k ≈ 1/(2σ) = ${(1 / (2 * (sigma || 1))).toFixed(3)}. Wider position packet (large σ) → narrower peak here. This is the uncertainty principle directly visible.`}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data}>
          <XAxis dataKey="x" stroke="white" tick={{ fontSize: 9 }}
            label={{ value: "k", position: "insideBottomRight", offset: -4, fill: "white", fontSize: 9 }} />
          <YAxis stroke="white" tick={{ fontSize: 9 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
          <ReferenceLine x={k0} stroke="rgba(139,92,246,0.4)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="prob_k" stroke="var(--violet)" dot={false} strokeWidth={2} name="|ψ̃|²" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}