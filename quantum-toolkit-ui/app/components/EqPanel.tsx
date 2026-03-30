import type EqType from "../components/Eq";
import dynamic from "next/dynamic";
const Eq = dynamic(() => import("../components/Eq"), { ssr: false }) as typeof EqType;

export function EqPanel({ label, tex }: { label: string; tex: string }) {
  return (
    <div style={{ padding: "8px 14px 12px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: 9, color: "rgba(148,163,184,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</div>
      <Eq display tex={tex} />
    </div>
  );
}