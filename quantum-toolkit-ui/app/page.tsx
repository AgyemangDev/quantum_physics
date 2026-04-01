"use client";
import Link from "next/link";
import Navbar from "./components/Navbars/Navbar";
import FeatureCard from "./components/Cards/Featurecard";
import MethodCard from "./components/Cards/Methodcard";
import TeamCard from "./components/Cards/Teamcard";
import HeroEquations from "./components/Hero/Heroequations";
import { FEATURES} from "./assets/data/features";
import { TEAM } from "./assets/data/teams";

const SIMULATORS = [
  { href: "/simulator/wave-packet",  label: "Wave Packet",  tag: "Ready",       color: "var(--green)"  },
  { href: "/simulator/time-evolution",    label: "Time Evolution",    tag: "Ready", color: "var(--amber)"  },
  { href: "/simulator/infinite-well", label: "Inifinite Well", tag: "Ready", color: "white" },
  { href: "/simulator/superposition", label: "Superposition", tag: "Coming Soon", color: "red" },
];


const linkStyle: React.CSSProperties = {
  color: "var(--cyan)",
  textDecoration: "none",
  borderBottom: "1px solid rgba(0,229,255,0.3)",
  paddingBottom: 1,
  transition: "border-color 0.2s",
};
export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="grid-bg" style={{ position: "relative", padding: "88px 40px 100px", textAlign: "center", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700, height: 320,
          background: "radial-gradient(ellipse, rgba(0,229,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="tag" style={{ color: "var(--cyan)", borderColor: "var(--border-bright)", background: "var(--cyan-glow)", display: "inline-block", marginBottom: 24 }}>
          JUNIA · HEI-ISEN-ISA · 2025–2026
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "clamp(38px, 6vw, 70px)", lineHeight: 1.04,
          marginBottom: 22, letterSpacing: "-0.025em",
        }}>
          Quantum Mechanics<br />
          <span className="glow-text" style={{ color: "var(--cyan)" }}>with Python</span>
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.75 }}>
          Interactive 1D quantum simulation — solve the Schrödinger equation, visualise wave functions, and explore tunneling, superposition, and uncertainty in real time.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const }}>
          <Link href="/simulator/wave-packet" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 13, padding: "12px 28px" }}>
            ▶  Open Simulator
          </Link>
          <Link href="/theory" className="btn" style={{ textDecoration: "none", fontSize: 13, padding: "12px 28px" }}>
            ◈  Theory
          </Link>
        </div>
        <HeroEquations />
      </section>

      {/* ── Simulator modules ── */}
      <section style={{ padding: "56px 40px 0", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "white", textTransform: "uppercase" as const, marginBottom: 24 }}>
          ◈ Simulator modules
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
          {SIMULATORS.map(({ href, label, tag, color }) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div className="panel" style={{
                padding: "16px 24px", display: "flex", alignItems: "center", gap: 14,
                transition: "border-color 0.2s, transform 0.2s", minWidth: 200,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = color;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 10, color, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{tag}</div>
                </div>
                <span style={{ marginLeft: "auto", color: "white", fontSize: 16 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "56px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "white", textTransform: "uppercase" as const, marginBottom: 28, textAlign: "center" as const }}>
          ◈ What is inside
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── Methods ── */}
      <section style={{ padding: "0 40px 64px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="panel" style={{ padding: "32px 36px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <MethodCard
            tag="TISE Solver"
            title="Finite Difference Method"
            body="Discretizes the Hamiltonian into a sparse tridiagonal matrix. Eigenvalues accurate to less than 0.5% vs analytical solutions for n = 1–5."
            accent="var(--cyan)"
            formula="Eₙ = n²π²ħ²/2mL²"
          />
          <MethodCard
            tag="TDSE Solver"
            title="Crank-Nicolson"
            body="Unconditionally stable implicit scheme. Norm conserved to less than 10⁻⁶ over thousands of steps. O(N) per time step via Thomas algorithm."
            accent="var(--violet)"
            formula="(I + iĤΔt/2ħ)ψⁿ⁺¹ = (I − iĤΔt/2ħ)ψⁿ"
          />
        </div>
      </section>

      {/* ── Team ── */}
      <section style={{ borderTop: "1px solid var(--border)", padding: "64px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "white", textTransform: "uppercase" as const, marginBottom: 8, textAlign: "center" as const }}>
          ◈ Team
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, textAlign: "center" as const, marginBottom: 8 }}>
          Who built this
        </div>
        <div style={{ fontSize: 13, color: "white", textAlign: "center" as const, marginBottom: 48 }}>
          Hover the cards to flip
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" as const }}>
          {TEAM.map(t => <TeamCard key={t.name} {...t} />)}
        </div>
        <div style={{ textAlign: "center" as const, marginTop: 40, fontSize: 12, color: "white", lineHeight: 1.8 }}>
          Supervisors:{" "}
          <a href="https://www.linkedin.com/in/pierrecapiod/" target="_blank" rel="noopener noreferrer" style={linkStyle}>Pierre CAPIOD</a>
          {" &amp; "}
          <a href="https://www.linkedin.com/in/meledavid/" target="_blank" rel="noopener noreferrer" style={linkStyle}>David MELE</a>
          <span style={{ margin: "0 10px", opacity: 0.3 }}>·</span>
          Coordinator:{" "}
          <a href="https://www.linkedin.com/in/kekeli-n-konou-9b587431/" target="_blank" rel="noopener noreferrer" style={linkStyle}>Dr. Kekeli N&apos;KONOU</a>
        </div>
      </section>
    </div>
  );
}