"""
main.py
-------
FastAPI application entry point.

Run with:
    uvicorn api.main:app --reload
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import WavePacketRequest, WavePacketResponse
from core.wavefunctions import (
    gaussian_wave_packet,
    probability_density,
    fourier_transform,
    uncertainty_position,
    uncertainty_momentum,
    check_normalization,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quantum Toolkit API",
    description="REST API for quantum mechanics simulations — JUNIA M1 Project 2025/2026",
    version="0.1.0",
)

# Allow React dev server (localhost:5173) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Quantum Toolkit API is running"}


@app.post("/wave-packet", response_model=WavePacketResponse)
def compute_wave_packet(req: WavePacketRequest):
    """
    Compute a Gaussian wave packet and return all data needed by the React dashboard.

    Parameters (body JSON):
        x0    : centre of the packet
        sigma : spatial width
        k0    : central wave vector
        x_min : left grid boundary
        x_max : right grid boundary
        N     : number of grid points

    Returns:
        x, Re(ψ), Im(ψ), |ψ|², k, |ψ̃(k)|², σ_x, σ_k, σ_x·σ_k, norm
    """
    try:
        # Build spatial grid
        x = np.linspace(req.x_min, req.x_max, req.N)

        # Compute wave function
        psi = gaussian_wave_packet(x, x0=req.x0, sigma=req.sigma, k0=req.k0)

        # Momentum space
        k, psi_k = fourier_transform(psi, x)

        # Uncertainties
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