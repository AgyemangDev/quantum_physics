"use client";
import Navbar from "../components/Navbars/Navbar";
import { useState } from "react";

const TOPICS = [
  {
    id: "schrodinger",
    title: "Schrödinger Equation",
    tag: "TDSE",
    color: "var(--cyan)",
    equations: [
      "iħ ∂ψ/∂t = Ĥψ",
      "Ĥ = -ħ²/2m · ∂²/∂x² + V(x)",
    ],
    body: `The time-dependent Schrödinger equation governs how a quantum state ψ(x,t) evolves over time. The Hamiltonian Ĥ is the total energy operator — kinetic plus potential.

In our simulator, we discretize this equation using the Crank-Nicolson method, which preserves unitarity (∫|ψ|²dx = 1) at every time step.`,
    code: `# Crank-Nicolson step
A = I + (i·dt/2ħ)·H
B = I - (i·dt/2ħ)·H
ψⁿ⁺¹ = A⁻¹ · B · ψⁿ`,
  },
  {
    id: "tise",
    title: "Stationary States",
    tag: "TISE",
    color: "var(--violet)",
    equations: [
      "Ĥψₙ = Eₙψₙ",
      "Eₙ = n²π²ħ²/2mL²  (infinite well)",
    ],
    body: `When a particle is in a stationary state (eigenstate), its probability density |ψ|² does not change with time. These are solutions to the time-independent Schrödinger equation.

We find them numerically by discretizing the Hamiltonian into a tridiagonal matrix and solving the eigenvalue problem using scipy.linalg.eigh().`,
    code: `# Build Hamiltonian matrix (FDM)
t = ħ² / (2m·dx²)
H[i,i]   =  2t + V[i]
H[i,i±1] = -t

# Solve
E, ψ = scipy.linalg.eigh(H)`,
  },
  {
    id: "uncertainty",
    title: "Uncertainty Principle",
    tag: "HEISENBERG",
    color: "var(--green)",
    equations: [
      "Δx · Δp ≥ ħ/2",
      "Δx · Δk ≥ 1/2  (ħ=1 units)",
    ],
    body: `A Gaussian wave packet achieves the minimum uncertainty product Δx·Δk = ½. As the packet evolves in time, it spreads in position space — Δx grows — which corresponds to its momentum distribution sharpening.

Watch this live in the simulator: the momentum plot narrows as the position spread widens.`,
    code: `# Verify for Gaussian
psi = gaussian_wavepacket(x, x0, k0, sigma)

dx_val = sigma          # position width
dk_val = 1/(2*sigma)   # momentum width

assert dx_val * dk_val >= 0.5  # ✓`,
  },
  {
    id: "tunneling",
    title: "Quantum Tunneling",
    tag: "SCATTERING",
    color: "var(--amber)",
    equations: [
      "T = |t|²  (transmission coeff.)",
      "R = |r|²  (reflection coeff.)",
      "T + R = 1  (always)",
    ],
    body: `A classical particle cannot pass through a barrier if its energy E < V₀. Quantum mechanically, the wave function decays exponentially inside the barrier but remains non-zero — tunneling occurs.

The transmission coefficient T increases when the particle energy k₀²/2 approaches V₀, or when the barrier is narrower. Try it in the simulator.`,
    code: `# Transmission after collision
right_prob = sum(|ψ|²[x>0])
total_prob = sum(|ψ|²)
T = right_prob / total_prob
R = 1 - T`,
  },
  {
    id: "wavepacket",
    title: "Wave Packets",
    tag: "SUPERPOSITION",
    color: "var(--violet)",
    equations: [
      "ψ(x,0) = A·exp(-(x-x₀)²/4σ²)·exp(ik₀x)",
      "⟨x⟩ = x₀,   ⟨k⟩ = k₀",
    ],
    body: `A Gaussian wave packet is a superposition of plane waves — a localized particle with a definite mean momentum ħk₀. The width σ sets the trade-off between position and momentum certainty.

In free space, the packet's center moves at group velocity vg = ħk₀/m while the envelope spreads as σ(t) = σ√(1 + (ħt/2mσ²)²).`,
    code: `def gaussian_wavepacket(x, x0, k0, sigma):
    env  = exp(-(x-x0)**2 / (4*sigma**2))
    phase = exp(1j * k0 * x)
    psi  = env * phase
    return psi / norm(psi)`,
  },
];

export default function TheoryPage() {
  const [active, setActive] = useState("schrodinger");
  const topic = TOPICS.find(t => t.id === active)!;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <aside style={{ borderRight: "1px solid var(--border)", padding: "20px 12px", background: "var(--bg-deep)" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase" as const, padding: "0 4px" }}>
            ◈ Concepts
          </div>
          {TOPICS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)} className="btn" style={{
              display: "block", width: "100%", textAlign: "left" as const, marginBottom: 4,
              background: active === t.id ? "var(--cyan-glow)" : "transparent",
              borderColor: active === t.id ? t.color : "transparent",
              color: active === t.id ? t.color : "var(--text-secondary)",
            }}>
              {t.title}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={{ padding: "32px 40px", maxWidth: 780 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span className="tag" style={{ color: topic.color, borderColor: topic.color, background: `rgba(0,0,0,0)` }}>
              {topic.tag}
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, marginBottom: 24, color: "var(--text-primary)" }}>
            {topic.title}
          </h1>

          {/* Equations */}
          <div className="panel" style={{ padding: "16px 20px", marginBottom: 24, borderColor: topic.color + "44" }}>
            {topic.equations.map((eq, i) => (
              <div key={i} style={{
                fontFamily: "var(--font-mono)", fontSize: 16,
                color: topic.color, padding: "6px 0",
                borderBottom: i < topic.equations.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                {eq}
              </div>
            ))}
          </div>

          {/* Body */}
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 24, whiteSpace: "pre-line" as const }}>
            {topic.body}
          </p>

          {/* Code block */}
          <div className="panel" style={{ padding: 0, overflow: "hidden", borderColor: "var(--border)" }}>
            <div className="panel-header" style={{ background: "var(--bg-raised)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red-accent)" }}/>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)" }}/>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }}/>
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>python</span>
            </div>
            <pre style={{
              padding: "16px 20px", margin: 0, fontSize: 12,
              fontFamily: "var(--font-mono)", lineHeight: 1.7,
              color: "var(--text-primary)", background: "var(--bg-surface)",
              overflowX: "auto" as const,
            }}>
              <code>{topic.code}</code>
            </pre>
          </div>

          {/* Link to simulator */}
          <div style={{ marginTop: 24, padding: "14px 20px", background: "var(--cyan-glow)", borderRadius: 8, border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "space-between" as const }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              See this in action — run the live simulator
            </span>
            <a href="/simulator" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 11 }}>
              Open simulator →
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
