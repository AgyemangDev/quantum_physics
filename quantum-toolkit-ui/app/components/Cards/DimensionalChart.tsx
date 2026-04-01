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
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth || 400;
    const H = 220;

    import("three").then((THREE) => {
      // ── Scene setup ──────────────────────────────────────────────────────
      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 200);
      camera.position.set(0, 14, 22);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // ── Build 2D wave packet surface ─────────────────────────────────────
      const N = 80;                  // grid resolution
      const RANGE = 10;              // x,y ∈ [-RANGE, RANGE]
      const sig = Math.max(sigma, 0.3);

      // Re(ψ(x,y)) = A·exp(−r²/4σ²)·cos(k₀·x)  where r² = (x−x₀)²+(y−x₀)²
      const getZ = (xi: number, yi: number) => {
        const dx = xi - x0, dy = yi - x0;
        const r2 = dx * dx + dy * dy;
        const A = 1 / (Math.sqrt(2 * Math.PI) * sig);
        return A * Math.exp(-r2 / (4 * sig * sig)) * Math.cos(k0 * xi);
      };

      // Build geometry via PlaneGeometry then displace Y
      const geo = new THREE.PlaneGeometry(RANGE * 2, RANGE * 2, N - 1, N - 1);
      const pos = geo.attributes.position;

      // Collect Z values for colour normalisation
      const zVals: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        const xi = pos.getX(i);
        const yi = pos.getY(i);
        zVals.push(getZ(xi, yi));
      }
      const zMax = Math.max(...zVals.map(Math.abs)) || 1;

      // Displace and colour
      const colorsArr: number[] = [];
      const col = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const xi = pos.getX(i);
        const yi = pos.getY(i);
        const z = zVals[i];
        pos.setZ(i, z * 6);           // scale height for drama

        // Colour: cyan→yellow for positive peaks, magenta for negatives (like the reference image)
        const t = z / zMax;           // -1..1
        if (t >= 0) {
          // 0 = dark teal, 1 = bright yellow
          col.setRGB(t * 1.0, t * 0.92, t > 0.5 ? (t - 0.5) * 0.3 : 0);
        } else {
          // negative: magenta/violet
          const u = -t;
          col.setRGB(u * 0.85, 0, u * 0.9);
        }
        colorsArr.push(col.r, col.g, col.b);
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colorsArr, 3));
      geo.computeVertexNormals();

      // Wireframe overlay (white lines, like reference image)
      const wireMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      const wire = new THREE.Mesh(geo, wireMat);
      wire.rotation.x = -Math.PI / 2;
      scene.add(wire);

      // Solid surface underneath the wires (darker, semi-transparent fill)
      const solidGeo = geo.clone();
      const solidMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      });
      const solid = new THREE.Mesh(solidGeo, solidMat);
      solid.rotation.x = -Math.PI / 2;
      scene.add(solid);

      // ── Grid floor (faint) ───────────────────────────────────────────────
      const floorGeo = new THREE.PlaneGeometry(RANGE * 2, RANGE * 2, 20, 20);
      const floorMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.07,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.5;
      scene.add(floor);

      // ── Axis arrows ──────────────────────────────────────────────────────
      const mkArrow = (dir: any, origin: any, color: number) => {
        const arrow = new THREE.ArrowHelper(
          dir.normalize(), origin, RANGE * 0.9, color, 0.6, 0.35
        );
        scene.add(arrow);
      };
      mkArrow(new THREE.Vector3(1, 0, 0),  new THREE.Vector3(-RANGE * 0.5, 0, RANGE * 0.6), 0xffffff);
      mkArrow(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-RANGE * 0.7, 0, RANGE * 0.3), 0xffffff);
      mkArrow(new THREE.Vector3(0, 1, 0),  new THREE.Vector3(-RANGE * 0.7, 0, RANGE * 0.6), 0xffffff);

      // ── Auto-rotate ──────────────────────────────────────────────────────
      let angle = Math.PI * 0.15;
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        angle += 0.004;
        const r = 24;
        camera.position.set(Math.sin(angle) * r, 14, Math.cos(angle) * r);
        camera.lookAt(0, 2, 0);
        renderer.render(scene, camera);
      };
      animate();
    });

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = el.querySelector("canvas");
        if (canvas) el.removeChild(canvas);
      }
    };
  }, [x0, k0, sigma]);

  return <div ref={mountRef} style={{ width: "100%", height: 220, borderRadius: 4, overflow: "hidden" }} />;
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