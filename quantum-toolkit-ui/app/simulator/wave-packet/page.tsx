"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type EqType from "../../components/Eq";
import Navbar from "../../components/Navbars/Navbar";

import Sidebar from "@/app/components/Navbars/Sidebar";
import MetricCard from "@/app/components/Cards/MetricCard";
import { ProbChart, EnvelopeChart, ReImChart, MomentumChart } from "@/app/components/Cards/DimensionalChart";
import { WavePacketResponse, buildChartData } from "../../components/types";

const Eq = dynamic(() => import("../../components/Eq"), { ssr: false }) as typeof EqType;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function WavePacketPage() {
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
    setLoading(true); setError(null);
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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => compute({ x0, sigma, k0 }), 200);
    return () => clearTimeout(t);
  }, [x0, sigma, k0, compute]);

  const probData     = data ? buildChartData(data.x, data.prob,                        undefined, ["prob"])   : [];
  const envelopeData = data ? buildChartData(data.x, data.prob.map(v => Math.sqrt(v)), undefined, ["env"])    : [];
  const reImData     = data ? buildChartData(data.x, data.real, data.imag,             ["re", "im"])          : [];
  const momData      = data ? buildChartData(data.k, data.prob_k,                      undefined, ["prob_k"]) : [];

  const hp   = data?.heisenberg_product ?? 0;
  const hpOk = hp >= 0.499;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "calc(100vh - 52px)" }}>

        <Sidebar
          x0={x0} sigma={sigma} k0={k0}
          norm={data?.norm ?? null}
          loading={loading} error={error}
          setX0={setX0} setSigma={setSigma} setK0={setK0}
        />

        <main style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Metrics row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <MetricCard
              label="σ_x  position"
              value={data ? data.sigma_x.toFixed(4) : "—"}
              color="var(--cyan)"
              sub="uncertainty in x"
            />
            <MetricCard
              label="σ_k  momentum"
              value={data ? data.sigma_k.toFixed(4) : "—"}
              color="var(--violet)"
              sub="uncertainty in k"
            />
            <div className="panel" style={{ padding: "12px 16px", flex: 2, minWidth: 180 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                σ_x · σ_k — Heisenberg
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: hpOk ? "var(--green)" : "var(--red-accent)" }}>
                  {data ? hp.toFixed(5) : "—"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {hpOk ? "≥ 0.5 ✓ minimum uncertainty" : "< 0.5 ✗"}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                <Eq tex={String.raw`\sigma_x \cdot \sigma_k \geq \tfrac{1}{2}`} />
              </div>
            </div>
          </div>

          {/* 2×2 chart grid — all 1D */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <ProbChart     data={probData}     x0={x0} sigma={sigma} />
            <EnvelopeChart data={envelopeData} x0={x0} sigma={sigma} />
            <ReImChart     data={reImData}     x0={x0} k0={k0} />
            <MomentumChart data={momData}      k0={k0} sigma={sigma} />
          </div>

        </main>
      </div>
    </div>
  );
}