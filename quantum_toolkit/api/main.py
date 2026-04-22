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

Boundary-condition contract
---------------------------
free    : periodic BCs, V = 0.  Wave circulates on a ring; no reflections.
          Domain is widened to ±20 by the frontend so the packet disperses
          off-screen without wrapping back and interfering with itself.
barrier : periodic BCs, finite rectangular barrier at centre.
          Only the barrier causes reflection / tunnelling — the edges are
          transparent.
step    : periodic BCs, abrupt step at x = 0.
          Only the step causes partial reflection / transmission.
wall    : dirichlet BCs, hard V = WALL_V0 barriers at domain edges.
          Wave reflects fully from both edges and forms standing-wave
          interference patterns.
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
)
from core.evolution import evolve, solve_tise, analytical_infinite_well_energies


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quantum Toolkit API",
    description="REST API for quantum mechanics simulations",
    version="0.6.0",
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

# Approximate infinite wall for the "wall" potential type.
# Only applied at domain edges; completely independent of the user-facing V0.
WALL_V0 = 1e6


def build_potential(
    x: np.ndarray,
    potential_type: str,
    V0: float,
    barrier_left: float,
    barrier_right: float,
) -> np.ndarray:
    """
    Build the potential energy array V(x) on the spatial grid.

    Parameters
    ----------
    x               : uniform spatial grid
    potential_type  : "free" | "barrier" | "step" | "wall"
    V0              : barrier/step height (ignored for "free" and "wall")
    barrier_left    : left edge of the rectangular barrier (barrier only)
    barrier_right   : right edge of the rectangular barrier (barrier only)

    Returns
    -------
    V : np.ndarray, same shape as x

    Notes
    -----
    free
        V(x) = 0 everywhere.  The frontend uses periodic BCs so the domain
        acts as a ring — the wave circulates with no reflections at all.

    barrier
        Finite rectangular barrier centred at x = 0.  With periodic BCs from
        the frontend the domain edges are transparent; only the barrier itself
        causes partial reflection and quantum tunnelling.

    step
        Abrupt potential step at x = 0.  Partial reflection for any energy;
        evanescent penetration for E < V₀.  Periodic BCs → transparent edges.

    wall
        Very high potential at both domain edges (5 % of domain width on each
        side) combined with dirichlet BCs from the frontend.  The wave
        reflects fully from both boundaries and produces standing-wave
        interference.  V₀ from the user slider is intentionally NOT used here
        so the wall is always effectively infinite.
    """
    if potential_type == "free":
        # Zero potential everywhere — wave propagates without any reflection.
        return free_particle(x)

    elif potential_type == "barrier":
        # Finite rectangular barrier — adjustable height and width.
        # Periodic BCs (set by frontend) make the domain edges transparent.
        return potential_barrier(
            x, x_left=barrier_left, x_right=barrier_right, V0=V0
        )

    elif potential_type == "step":
        # Abrupt step rising at x = 0.
        # Periodic BCs (set by frontend) make the domain edges transparent.
        return potential_step(x, x_step=0.0, V0=V0)

    elif potential_type == "wall":
        # Hard walls at both edges of the domain only.
        # Dirichlet BCs (set by frontend) enforce ψ = 0 at the very boundary;
        # the thick high-V layer here gives a physically visible barrier and
        # ensures clean reflection well before the grid edge.
        V = np.zeros_like(x, dtype=float)
        edge_width = (x[-1] - x[0]) * 0.05   # 5 % of domain width on each side
        V[x <= x[0]  + edge_width] = WALL_V0
        V[x >= x[-1] - edge_width] = WALL_V0
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
        "version": "0.6.0",
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

    Boundary-condition summary
    --------------------------
    The frontend determines the correct BC for each potential type and sends
    it as `req.boundary`.  This endpoint trusts that value:

    free    → periodic   (transparent edges, wider domain ±20)
    barrier → periodic   (transparent edges; only barrier reflects/tunnels)
    step    → periodic   (transparent edges; only step reflects/transmits)
    wall    → dirichlet  (hard walls; full reflection; standing waves)

    Amplitude
    ---------
    psi0 is first normalised to unit norm, then scaled by `req.amplitude`.
    Crank-Nicolson is linear, so this scale factor is preserved in every frame.
    """
    try:
        x = np.linspace(req.x_min, req.x_max, req.N)
        V = build_potential(
            x, req.potential, req.V0, req.barrier_left, req.barrier_right
        )

        # Build and normalise psi0 to unit norm, then apply amplitude scale.
        psi0  = gaussian_wave_packet(x, x0=req.x0, sigma=req.sigma, k0=req.k0)
        norm0 = np.sqrt(np.trapezoid(np.abs(psi0) ** 2, x))
        if norm0 > 1e-15:
            psi0 = psi0 / norm0
        psi0 = psi0 * req.amplitude

        # Boundary condition is determined by the frontend based on potential type:
        #   "periodic"  → free / barrier / step  (transparent domain edges)
        #   "dirichlet" → wall                   (ψ = 0 at edges)
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

        # Cap V for serialisation so WALL_V0 = 1e6 doesn't break JSON consumers.
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