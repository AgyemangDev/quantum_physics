"""
main.py
-------
FastAPI application entry point.

Run with:
    uvicorn api.main:app --reload

Available endpoints:
    GET  /                → health check
    POST /wave-packet     → Gaussian wave packet (Sprint 1)
    POST /evolve          → Time evolution Crank-Nicolson (Sprint 2)
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
)
from core.wavefunctions import (
    gaussian_wave_packet, probability_density,
    fourier_transform, uncertainty_position,
    uncertainty_momentum, check_normalization,
)
from core.potentials import (
    free_particle, potential_barrier,
    potential_step, harmonic_oscillator,
)
from core.evolution import evolve


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quantum Toolkit API",
    description="REST API for quantum mechanics simulations — JUNIA M1 2025/2026",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Potential factory
# ---------------------------------------------------------------------------

def build_potential(x: np.ndarray, potential_type: str,
                    V0: float, barrier_left: float, barrier_right: float) -> np.ndarray:
    """Build the requested potential on grid x."""
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
        "version": "0.2.0",
        "endpoints": ["/wave-packet", "/evolve"],
    }


@app.post("/wave-packet", response_model=WavePacketResponse)
def compute_wave_packet(req: WavePacketRequest):
    """
    Compute a Gaussian wave packet.

    Returns: x, Re(ψ), Im(ψ), |ψ|², momentum space,
             σ_x, σ_k, Heisenberg product, norm.
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

    Returns a list of frames (Re, Im, |ψ|²) at each recorded time step,
    along with the potential V(x) for display.

    Potential types:
        'free'     → V = 0 (free propagation, wave packet spreading)
        'barrier'  → rectangular barrier (quantum tunneling)
        'step'     → potential step (reflection/transmission)
        'harmonic' → harmonic oscillator (oscillating packet)
    """
    try:
        x   = np.linspace(req.x_min, req.x_max, req.N)
        V   = build_potential(x, req.potential, req.V0,
                              req.barrier_left, req.barrier_right)
        
        ramp_width = max(1, int(0.05 * req.N))
        ramp = np.linspace(0, 1e4, ramp_width)
        V[:ramp_width]  = np.maximum(V[:ramp_width],  ramp[::-1])
        V[-ramp_width:] = np.maximum(V[-ramp_width:], ramp)
        psi0 = gaussian_wave_packet(x, x0=req.x0, sigma=req.sigma, k0=req.k0)

        snapshots, times = evolve(
            psi0, x, V,
            t_end=req.t_end,
            dt=req.dt,
            store_every=req.store_every,
        )

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