export const TOPICS = [
  {
    id: "schrodinger",
    title: "Schrödinger Equation",
    tag: "TDSE",
    route: "/simulator/time-evolution",
    color: "var(--cyan)",
    equations: [
      "iħ ∂ψ/∂t = Ĥψ",
      "Ĥ = -ħ²/2m · ∂²/∂x² + V(x)",
    ],
    body: `The time-dependent Schrödinger equation governs how a quantum state ψ(x,t) evolves over time. The Hamiltonian Ĥ is the total energy operator — kinetic plus potential.

We evolve ψ numerically using a unitary scheme so probability is conserved at every step.`,
    code: `A = I + (i·Δt/2ħ)·H
B = I - (i·Δt/2ħ)·H

ψ(t + Δt) = A⁻¹ · B · ψ(t)`
  },

  {
    id: "tise",
    title: "Stationary States",
    tag: "TISE",
    route: "/simulator/bound-states",
    color: "var(--violet)",
    equations: [
      "Ĥψₙ = Eₙψₙ",
      "Eₙ = n²π²ħ² / (2mL²)",
    ],
    body: `Stationary states are eigenfunctions of the Hamiltonian. Their probability density does not change in time.

We compute them numerically by diagonalizing the Hamiltonian matrix.`,
    code: `t = ħ² / (2mΔx²)

Hᵢᵢ   = 2t + V(xᵢ)
Hᵢᵢ±₁ = -t

Solve:  Hψ = Eψ`
  },

  {
    id: "wavepacket",
    title: "Wave Packets",
    tag: "SUPERPOSITION",
    route: "/simulator/wave-packet",
    color: "var(--violet)",
    equations: [
      "ψ(x) = A·e^{-(x-x₀)² / 4σ²} · e^{ik₀x}",
      "⟨x⟩ = x₀ , ⟨k⟩ = k₀",
    ],
    body: `A Gaussian wave packet represents a localized quantum particle.

Its width σ controls uncertainty, and it spreads over time due to dispersion.`,
    code: `ψ(x) = exp(-(x-x₀)² / 4σ²) · exp(i k₀ x)

σ(t) = σ √(1 + (ħt / 2mσ²)²)`
  },
];