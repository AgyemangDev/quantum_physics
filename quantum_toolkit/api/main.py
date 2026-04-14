"""
main.py
-------
FastAPI application entry point.

Run with:
    uvicorn api.main:app --reload

Available endpoints:
    GET  /                -> health check
    POST /wave-packet     -> Gaussian wave packet (Sprint 1)
    POST /evolve          -> Time evolution Crank-Nicolson (Sprint 2)
    POST /infinite-well   -> TISE eigenstates — infinite square well (Sprint 3)
    POST /superposition   -> Linear combination of eigenstates (Sprint 4)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import (
    WavePacketRequest, WavePacketResponse,
    EvolveRequest, EvolveResponse, FrameData,
    InfiniteWellRequest, InfiniteWellResponse, EigenstateData,
    SuperpositionRequest, SuperpositionResponse,
)
from core.wavefunctions import (
    gaussian_wave_packet, probability_density,
    fourier_transform, uncertainty_position,
    uncertainty_momentum, check_normalization,
)
from core.potentials import (
    free_particle, potential_barrier,
    potential_step, harmonic_oscillator,
    infinite_square_well,
)
from core.evolution import evolve, solve_tise, analytical_infinite_well_energies


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quantum Toolkit API",
    description="REST API for quantum mechanics simulations — JUNIA M1 2025/2026",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Potential factory (for /evolve)
# ---------------------------------------------------------------------------

def build_potential(x, potential_type, V0, barrier_left, barrier_right):
    if potential_type == "free":
        return free_particle(x)
    elif potential_type == "barrier":
        return potential_barrier(x, x_left=barrier_left, x_right=barrier_right, V0=V0)
    elif potential_type == "step":
        return potential_step(x, x_step=0.0, V0=V0)
    elif potential_type == "harmonic":
        return harmonic_oscillator(x, omega=1.0, x0=0.0)
    else:
        raise ValueError(f"Unknown potential type: {potential_type}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Quantum Toolkit API is running",
        "version": "0.4.0",
        "endpoints": ["/wave-packet", "/evolve", "/infinite-well", "/superposition"],
    }


@app.post("/wave-packet", response_model=WavePacketResponse)
def compute_wave_packet(req: WavePacketRequest):
    """
    Compute a Gaussian wave packet.
    Returns: x, Re(psi), Im(psi), |psi|^2, momentum space, sigma_x, sigma_k, norm.
    """
    try:
        x   = np.linspace(req.x_min, req.x_max, req.N)
        psi = gaussian_wave_packet(x, x0=req.x0, sigma=req.sigma, k0=req.k0)
        k, psi_k = fourier_transform(psi, x)
        sx = uncertainty_position(psi, x)
        sk = uncertainty_momentum(psi, x)

        return WavePacketResponse(
            x=x.tolist(),
            real=np.real(psi).tolist(),
            imag=np.imag(psi).tolist(),
            prob=probability_density(psi).tolist(),
            k=k.tolist(),
            prob_k=np.abs(psi_k).tolist(),
            sigma_x=round(sx, 6),
            sigma_k=round(sk, 6),
            heisenberg_product=round(sx * sk, 6),
            norm=round(check_normalization(psi, x), 6),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evolve", response_model=EvolveResponse)
def compute_evolution(req: EvolveRequest):
    """
    Time-evolve a Gaussian wave packet using Crank-Nicolson.

    Design: amplitude and sigma are fully independent visual controls.

    The Gaussian wave packet has a natural peak height of 1/(σ√(2π)) when
    normalised to ∫|ψ|²dx = 1.  This means σ and peak height are coupled
    in the normalised form — a wider packet is automatically shorter.

    To break this coupling we:
      1. Build a unit-norm Gaussian ψ₀ (shape only, determined by σ).
      2. Multiply ψ₀ by `amplitude` to set the desired peak height
         independently of σ.  At this point ∫|ψ|² dx = amplitude².
      3. Feed this *unnormalised* ψ₀ directly into the Crank-Nicolson
         solver.  Because C-N is norm-preserving, the ratio between any
         two frames stays fixed: if frame 0 has peak P, every later frame
         will have peaks scaled by the same factor relative to norm.
      4. Return the raw Re/Im/prob arrays without any further rescaling.

    Result: changing `amplitude` scales the wave height uniformly across
    ALL frames while changing `sigma` only affects the spatial width,
    with zero cross-coupling between the two parameters.
    """
    try:
        x = np.linspace(req.x_min, req.x_max, req.N)

        # Potential is independent of amplitude and sigma
        V = build_potential(x, req.potential, req.V0, req.barrier_left, req.barrier_right)

        # Step 1 — unit-norm Gaussian (shape determined by σ only)
        psi0 = gaussian_wave_packet(x, x0=req.x0, sigma=req.sigma, k0=req.k0)
        dx   = x[1] - x[0]
        norm = np.sqrt(np.sum(np.abs(psi0) ** 2) * dx)
        if norm > 1e-15:
            psi0 = psi0 / norm          # ∫|ψ|²dx = 1, peak = 1/(σ√(2π))

        # Step 2 — scale by amplitude to set peak height independently of σ.
        # The peak of the unit-norm Gaussian is 1/(σ√(2π)).
        # We want the displayed peak to equal `amplitude` regardless of σ,
        # so we multiply by  amplitude × σ√(2π)  to cancel the σ-dependence.
        #
        # This means:
        #   peak height of psi0 = [1/(σ√(2π))] × [amplitude × σ√(2π)] = amplitude
        #
        # Now σ only controls the spatial width, not the peak height.
        sigma_factor = req.sigma * np.sqrt(2.0 * np.pi)
        psi0 = psi0 * (req.amplitude * sigma_factor)

        # Step 3 — evolve the amplitude-scaled packet.
        # C-N preserves the norm structure, so the amplitude ratio is
        # maintained consistently across every frame.
        snapshots, times = evolve(
            psi0, x, V,
            t_end=req.t_end,
            dt=req.dt,
            store_every=req.store_every,
            boundary=req.boundary,
        )

        # Step 4 — return raw arrays; no post-hoc rescaling needed.
        frames = [
            FrameData(
                real=np.real(psi).tolist(),
                imag=np.imag(psi).tolist(),
                prob=(np.abs(psi) ** 2).tolist(),
            )
            for psi in snapshots
        ]

        return EvolveResponse(
            x=x.tolist(),
            V=V.tolist(),
            times=times,
            frames=frames,
            n_frames=len(frames),
            dt=req.dt,
            t_end=req.t_end,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/infinite-well", response_model=InfiniteWellResponse)
def compute_infinite_well(req: InfiniteWellRequest):
    """
    Solve the TISE for an infinite square well (particle in a box).
    Returns energy eigenvalues + eigenfunctions + analytical comparison.
    """
    try:
        x = np.linspace(req.x_min, req.x_max, req.N)
        V = infinite_square_well(x, x_left=req.x_left, x_right=req.x_right)

        energies, wavefunctions = solve_tise(x, V, n_states=req.n_states)

        L = req.x_right - req.x_left
        analytical = analytical_infinite_well_energies(req.n_states, L)

        eigenstates = [
            EigenstateData(
                n=n,
                energy=round(float(energies[n]), 6),
                real=np.real(wavefunctions[:, n]).tolist(),
                prob=(np.abs(wavefunctions[:, n]) ** 2).tolist(),
            )
            for n in range(req.n_states)
        ]

        return InfiniteWellResponse(
            x=x.tolist(),
            V=np.clip(V, 0, 100).tolist(),
            energies=[round(float(e), 6) for e in energies],
            analytical_energies=[round(float(e), 6) for e in analytical],
            eigenstates=eigenstates,
            well_width=round(L, 4),
            n_states=req.n_states,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/superposition", response_model=SuperpositionResponse)
def compute_superposition(req: SuperpositionRequest):
    """
    Compute the time evolution of a superposition of eigenstates.

    ψ(x,t) = Σ cₙ ψₙ(x) e^(-iEₙt/ℏ)
    """
    try:
        n_states = len(req.coefficients)
        if n_states < 1:
            raise ValueError("At least 1 coefficient required.")

        x = np.linspace(req.x_min, req.x_max, req.N)
        V = infinite_square_well(x, x_left=req.x_left, x_right=req.x_right)

        energies, wavefunctions = solve_tise(x, V, n_states=n_states)

        c = np.array(req.coefficients, dtype=complex)
        c_norm = c / np.sqrt(np.sum(np.abs(c) ** 2))

        n_steps = int(np.ceil(req.t_end / req.dt))
        snapshots = []
        times     = []

        for step in range(0, n_steps + 1, req.store_every):
            t = step * req.dt

            psi = np.zeros(req.N, dtype=complex)
            for n in range(n_states):
                phase = np.exp(-1j * float(energies[n]) * t)
                psi  += c_norm[n] * wavefunctions[:, n] * phase

            snapshots.append(psi.copy())
            times.append(round(t, 6))

        frames = [
            FrameData(
                real=np.real(psi).tolist(),
                imag=np.imag(psi).tolist(),
                prob=(np.abs(psi) ** 2).tolist(),
            )
            for psi in snapshots
        ]

        L = req.x_right - req.x_left

        return SuperpositionResponse(
            x=x.tolist(),
            V=np.clip(V, 0, 100).tolist(),
            times=times,
            frames=frames,
            n_frames=len(frames),
            energies=[round(float(e), 6) for e in energies],
            coefficients=[round(float(abs(c_n)), 6) for c_n in c_norm],
            t_end=req.t_end,
            well_width=round(L, 4),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))