"use client";
import { useState, useEffect, useRef } from "react";
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

// ── Surface3D — Re(ψ(x,y)) mesh rendered with Three.js ───────────────────────

function Surface3D({ x0, k0, sigma }: { x0: number; k0: number; sigma: number }) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const frameRef   = useRef<number>(0);
  const radiusRef  = useRef<number>(26);
  const angleRef   = useRef<number>(Math.PI * 0.15);
  const timeRef    = useRef<number>(0);
  const lastTsRef  = useRef<number>(0);
  const ANIM_DURATION = 2.0; 

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W  = el.clientWidth || 600;
    const H  = 380;
    let animating = true;

    import("three").then((THREE) => {
      if (!animating) return;

      const scene    = new THREE.Scene();
      const camera   = new THREE.PerspectiveCamera(50, W / H, 0.01, 500);
      camera.position.set(0, 12, 26);
      camera.lookAt(0, 1, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      const RANGE = 12;
      const N     = 400;
      const sig   = Math.max(sigma, 0.3);
      // ω = k₀²/2  (free particle dispersion, ℏ=m=1)
      const omega = (k0 * k0) / 2;

      const mkAxis = (
        from: [number, number, number],
        to:   [number, number, number],
        color: number,
      ) => {
        const mat = new THREE.LineBasicMaterial({ color });
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...from),
          new THREE.Vector3(...to),
        ]);
        scene.add(new THREE.Line(geo, mat));
      };

      mkAxis([-RANGE, 0, 0], [RANGE, 0, 0], 0xffffff);
      mkAxis([0, -RANGE * 0.5, 0], [0, RANGE * 0.5, 0], 0xffffff);
      mkAxis([0, 0, -RANGE], [0, 0, RANGE], 0xffffff);

      // Pre-build position arrays — update in-place each frame
      const rePositions = new Float32Array(N * 3);
      const imPositions = new Float32Array(N * 3);

      const reGeo = new THREE.BufferGeometry();
      const imGeo = new THREE.BufferGeometry();
      reGeo.setAttribute("position", new THREE.BufferAttribute(rePositions, 3));
      imGeo.setAttribute("position", new THREE.BufferAttribute(imPositions, 3));

      const reLine = new THREE.Line(reGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2 }));
      const imLine = new THREE.Line(imGeo, new THREE.LineBasicMaterial({ color: 0xa78bfa, linewidth: 2 }));
      scene.add(reLine);
      scene.add(imLine);

      const updateWaves = (t: number) => {
        for (let i = 0; i < N; i++) {
          const xi  = -RANGE + (2 * RANGE * i) / (N - 1);
          const dx  = xi - x0;
          const A   = Math.exp(-(dx * dx) / (4 * sig * sig));
          const phi = k0 * xi - omega * t;          // phase evolves with time
          const re  = A * Math.cos(phi) * 4.5;
          const im  = A * Math.sin(phi) * 4.5;

          rePositions[i * 3]     = xi;
          rePositions[i * 3 + 1] = re;
          rePositions[i * 3 + 2] = 0;

          imPositions[i * 3]     = xi;
          imPositions[i * 3 + 1] = 0;
          imPositions[i * 3 + 2] = im;
        }
        reGeo.attributes.position.needsUpdate = true;
        imGeo.attributes.position.needsUpdate = true;
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        radiusRef.current = Math.max(8, Math.min(60, radiusRef.current + e.deltaY * 0.05));
      };
      el.addEventListener("wheel", onWheel, { passive: false });

const animate = (ts: number) => {
  if (!animating) return;

  if (lastTsRef.current !== 0) {
    const dt = (ts - lastTsRef.current) / 1000;
    if (timeRef.current < ANIM_DURATION) {
      timeRef.current = Math.min(timeRef.current + dt, ANIM_DURATION);
      updateWaves(timeRef.current);
    }
    // Camera always rotates (cheap, looks alive)
    angleRef.current += 0.004;
    const r = radiusRef.current;
    camera.position.set(
      Math.sin(angleRef.current) * r,
      r * 0.46,
      Math.cos(angleRef.current) * r,
    );
    camera.lookAt(0, 1, 0);
    renderer.render(scene, camera);
  }
  lastTsRef.current = ts;

  // Only keep the loop alive — camera still needs to rotate
  frameRef.current = requestAnimationFrame(animate);
};

      frameRef.current = requestAnimationFrame(animate);
      rendererRef.current = { renderer, el, onWheel };
    });

    return () => {
      animating = false;
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current?.renderer) {
        rendererRef.current.el.removeEventListener("wheel", rendererRef.current.onWheel);
        rendererRef.current.renderer.dispose();
        const canvas = rendererRef.current.el.querySelector("canvas");
        if (canvas) rendererRef.current.el.removeChild(canvas);
        rendererRef.current = null;
      }
      lastTsRef.current = 0;
      timeRef.current   = 0;
    };
  }, [x0, k0, sigma]);

  return (
    <div style={{ position: "relative", width: "100%", height: 380, borderRadius: 4, overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontSize: 10, fontFamily: "monospace",
        color: "rgba(255,255,255,0.3)",
        pointerEvents: "none",
      }}>
        scroll to zoom
      </div>
    </div>
  );
}
// ── Chart 3 — Re(ψ) and Im(ψ) with 1D / 3D surface toggle ───────────────────

export function ReImChart({ data, x0, k0, sigma }: {
  data: Record<string, number>[]; x0: number; k0: number; sigma: number;
}) {
  const [mode, setMode] = useState<"1D" | "3D">("1D");

  return (
    <ChartCard
      title="Re(ψ) and Im(ψ)"
      dot="var(--violet)"
      eqBox={
        <EqBox>
          <Eq tex={String.raw`\psi = \underbrace{\cos(k_0 x)\cdot A}_{\text{Re}(\psi)} + i\,\underbrace{\sin(k_0 x)\cdot A}_{\text{Im}(\psi)}`} />
        </EqBox>
      }
      explanation={
        mode === "1D"
          ? `Oscillation frequency set by k₀ = ${k0}. Re(ψ) in violet and Im(ψ) in amber oscillate inside the green Gaussian envelope — the envelope shows the maximum possible amplitude at each x. Neither Re nor Im alone is observable — only |ψ|² is.`
          : `Re(ψ(x,y)) surface: height = real part of the 2D wave packet. Yellow peaks are positive, magenta troughs are negative. Winding rate set by k₀ = ${k0}, envelope width by σ = ${sigma}.`
      }
    >
      {/* 1D / 3D toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <div style={{
          display: "inline-flex", borderRadius: 6, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.15)",
          fontSize: 10, fontFamily: "'Space Mono', monospace",
        }}>
          {(["1D", "3D"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "3px 12px",
              background: mode === m ? "var(--violet)" : "transparent",
              color: mode === m ? "white" : "rgba(255,255,255,0.45)",
              border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: "inherit",
              transition: "background 0.15s, color 0.15s",
            }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "1D" ? (
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data}>
            <XAxis dataKey="x" stroke="white" tick={{ fontSize: 9 }} />
            <YAxis stroke="white" tick={{ fontSize: 9 }} width={36} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'Space Mono', monospace" }} />
            {/* Envelope — drawn first so it sits behind the oscillations */}
            <Line type="monotone" dataKey="env"  stroke="var(--green)" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="|ψ| envelope" />
            <Line type="monotone" dataKey="envN" stroke="var(--green)" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="-|ψ| envelope" legendType="none" />
            {/* Oscillations */}
            <Line type="monotone" dataKey="re" stroke="var(--violet)" dot={false} strokeWidth={1.5} name="Re(ψ)" />
            <Line type="monotone" dataKey="im" stroke="var(--amber)"  dot={false} strokeWidth={1.5} name="Im(ψ)" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Surface3D x0={x0} k0={k0} sigma={sigma} />
      )}
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