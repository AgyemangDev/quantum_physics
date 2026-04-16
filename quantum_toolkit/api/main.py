"""
main.py
-------
FastAPI application entry point.

Run with:
    uvicorn api.main:app --reload

Available endpoints:
    GET  /                -> health check
    POST /wave-packet     -> Gaussian wave packet
    POST /evolve          -> Time evolution Crank-Nicolson
    POST /infinite-well   -> TISE eigenstates — infinite square well
    POST /superposition   -> Linear combination of eigenstates
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
    potential_step, infinite_square_well,
    # harmonic_oscillator is intentionally NOT imported — removed from codebase.
)
from core.evolution import evolve, solve_tise, analytical_infinite_well_energies


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quantum Toolkit API",
    description="REST API for quantum mechanics simulations",
    version="0.5.0",
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

WALL_V0 = 1e6  # Approximation of an infinite wall

def build_potential(x: np.ndarray, potential_type: str,
                    V0: float, barrier_left: float, barrier_right: float) -> np.ndarray:
    """
    Build the potential V(x) on the grid.

    Supported types
    ---------------
    free    : V(x) = 0 everywhere.  No reflections — use with periodic BCs.
    barrier : Finite rectangular barrier centred at x=0.  Supports tunneling.
    step    : Abrupt potential step at x=0.  Partial reflection/transmission.
    wall    : High V0 at domain edges → hard wall, full reflection, standing waves.
              NOTE: for wall, we raise V0 at the grid boundaries, not at the centre.
              The Dirichlet BCs in evolution.py already enforce ψ=0 at the very edge,
              so this adds an extra thick absorbing layer for physical clarity.
    """
    if potential_type == "free":
        return free_particle(x)

    elif potential_type == "barrier":
        # Finite rectangular barrier — adjustable height and width
        return potential_barrier(x, x_left=barrier_left, x_right=barrier_right, V0=V0)

    elif potential_type == "step":
        # Step at the centre of the domain (x_step = 0)
        return potential_step(x, x_step=0.0, V0=V0)

    elif potential_type == "wall":
        # Effectively infinite walls at both domain edges.
        # We place thick barriers near x_min and x_max so the wave
        # reflects well before it reaches the Dirichlet boundary.
        V = np.zeros_like(x)
        edge = (x[-1] - x[0]) * 0.05  # 5% of domain width on each side
        V[x <= x[0] + edge]  = WALL_V0
        V[x >= x[-1] - edge] = WALL_V0
        return V

    else:
        raise ValueError(f"Unknown potential type: {potential_type!r}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Quantum Toolkit API is running",
        "version": "0.5.0",
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
    Propagate a Gaussian wave packet in time using Crank-Nicolson.

    Physics notes
    -------------
    Free particle   : Uses periodic boundary conditions so the packet circulates
                      without artificial wall reflections.  V(x)=0 everywhere.

    Barrier         : Finite rectangular barrier at centre.  Crank-Nicolson with
                      Dirichlet BCs (ψ=0 at edges).  Partial tunneling / reflection.

    Step            : Abrupt step at x=0.  Partial transmission for E > V₀,
                      partial evanescent for E < V₀.

    Wall            : Very high V at domain edges → wave reflects fully and forms
                      standing-wave interference patterns.

    Amplitude       : The initial wavepacket psi0 is first normalised to unit norm,
                      then scaled by `amplitude`.  This sets the peak height and
                      persists across all frames because Crank-Nicolson is linear
                      (norm-conserving up to drift correction).
    """
    try:
        x = np.linspace(req.x_min, req.x_max, req.N)
        V = build_potential(x, req.potential, req.V0, req.barrier_left, req.barrier_right)

        # Build and normalise psi0
        psi0 = gaussian_wave_packet(x, x0=req.x0, sigma=req.sigma, k0=req.k0)
        norm0 = np.sqrt(np.trapezoid(np.abs(psi0) ** 2, x))
        if norm0 > 1e-15:
            psi0 = psi0 / norm0  # unit norm first

        # Apply amplitude as a vertical scale (independent of sigma)
        # Crank-Nicolson is linear, so this scale factor is preserved in time.
        psi0 = psi0 * req.amplitude

        # Boundary condition:
        #   periodic → free particle ring domain (no reflections)
        #   dirichlet → ψ=0 at walls (barrier, step, wall, default)
        boundary = req.boundary if hasattr(req, "boundary") else "dirichlet"

        snapshots, times = evolve(
            psi0, x, V,
            t_end=req.t_end,
            dt=req.dt,
            store_every=req.store_every,
            boundary=boundary,
        )

        frames = [
            FrameData(
                real=np.real(psi).tolist(),
                imag=np.imag(psi).tolist(),
                prob=(np.abs(psi) ** 2).tolist(),
            )
            for psi in snapshots
        ]

        # Cap V for serialisation so wall potential (1e6) doesn't break JSON consumers.
        # Consumers use Vmax from the response to scale the visual overlay.
        V_serialised = np.clip(V, 0, 200).tolist()

        return EvolveResponse(
            x=x.tolist(),
            V=V_serialised,
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
        snapshots, times = [], []

        for step in range(0, n_steps + 1, req.store_every):
            t = step * req.dt
            psi = np.zeros(req.N, dtype=complex)
            for n in range(n_states):
                psi += c_norm[n] * wavefunctions[:, n] * np.exp(-1j * float(energies[n]) * t)
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