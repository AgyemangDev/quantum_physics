"use client";
import Navbar from "../../components/Navbars/Navbar";

export default function Page() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 52px)", gap: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "white", textTransform: "uppercase" }}>Coming soon</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, color: "var(--text-primary)" }}>Simulator</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, textAlign: "center", lineHeight: 1.7 }}>
          This module is under development. The backend endpoint will be wired here once ready.
        </div>
        <div style={{ width: 48, height: 2, background: "var(--cyan)", borderRadius: 1 }} />
      </div>
    </div>
  );
}