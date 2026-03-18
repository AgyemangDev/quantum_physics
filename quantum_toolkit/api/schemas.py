"""
schemas.py
----------
Pydantic models for FastAPI request and response validation.
"""

from pydantic import BaseModel, Field
from typing import List


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class WavePacketRequest(BaseModel):
    x0:    float = Field(default=0.0,  ge=-5.0,  le=5.0,  description="Centre du paquet")
    sigma: float = Field(default=1.0,  ge=0.2,   le=3.0,  description="Largeur du paquet")
    k0:    float = Field(default=3.0,  ge=-8.0,  le=8.0,  description="Vecteur d'onde initial")
    x_min: float = Field(default=-10.0, description="Borne gauche de la grille")
    x_max: float = Field(default=10.0,  description="Borne droite de la grille")
    N:     int   = Field(default=512,   ge=128,   le=2048, description="Nombre de points")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class WavePacketResponse(BaseModel):
    x:        List[float]
    real:     List[float]   # Re(ψ)
    imag:     List[float]   # Im(ψ)
    prob:     List[float]   # |ψ|²
    k:        List[float]
    prob_k:   List[float]   # |ψ̃(k)|²
    sigma_x:  float
    sigma_k:  float
    heisenberg_product: float  # σ_x · σ_k (doit être ≥ 0.5)
    norm:     float            # sanity check ≈ 1.0