"use client";
import dynamic from "next/dynamic";
import type EqType from "../Eq";
import EqBox from "../../components/Cards/EqBox";

const Eq = dynamic(() => import("../Eq"), { ssr: false }) as typeof EqType;

export default function NormBar({ norm }: { norm: number }) {
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
      <div style={{ height: 5, background: "var(--bg-raised)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: ok ? "var(--green)" : "var(--red-accent)", borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <EqBox>
        <Eq tex={String.raw`\int_{-\infty}^{+\infty}|\psi|^2\,dx = 1`} />
      </EqBox>
    </div>
  );
}
