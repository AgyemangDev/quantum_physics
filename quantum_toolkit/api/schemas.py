"""
schemas.py
----------
Pydantic models for FastAPI request and response validation.
"""

from pydantic import BaseModel, Field
from typing import List


# ---------------------------------------------------------------------------
# Wave Packet — Request / Response
# ---------------------------------------------------------------------------

class WavePacketRequest(BaseModel):
    x0:    float = Field(default=0.0,   ge=-5.0,  le=5.0,  description="Centre du paquet")
    sigma: float = Field(default=1.0,   ge=0.2,   le=3.0,  description="Largeur du paquet")
    k0:    float = Field(default=3.0,   ge=-8.0,  le=8.0,  description="Vecteur d'onde initial")
    x_min: float = Field(default=-10.0, description="Borne gauche de la grille")
    x_max: float = Field(default=10.0,  description="Borne droite de la grille")
    N:     int   = Field(default=512,   ge=128,   le=2048, description="Nombre de points")


class WavePacketResponse(BaseModel):
    x:                  List[float]
    real:               List[float]
    imag:               List[float]
    prob:               List[float]
    k:                  List[float]
    prob_k:             List[float]
    sigma_x:            float
    sigma_k:            float
    heisenberg_product: float
    norm:               float


# ---------------------------------------------------------------------------
# Time Evolution — Request / Response
# ---------------------------------------------------------------------------

class EvolveRequest(BaseModel):
    x0:    float = Field(default=0.0,  ge=-5.0, le=5.0,  description="Centre initial du paquet")
    sigma: float = Field(default=1.0,  ge=0.2,  le=3.0,  description="Largeur initiale")
    k0:    float = Field(default=3.0,  ge=-8.0, le=8.0,  description="Vecteur d'onde initial")

    potential:     str   = Field(default="free", description="'free' | 'barrier' | 'step' | 'harmonic'")
    V0:            float = Field(default=8.0,  ge=0.0,  le=50.0, description="Hauteur du potentiel")
    barrier_left:  float = Field(default=-1.0, description="Bord gauche de la barrière")
    barrier_right: float = Field(default=1.0,  description="Bord droit de la barrière")

    t_end:       float = Field(default=3.0,   ge=0.1,  le=20.0, description="Temps final")
    dt:          float = Field(default=0.005, ge=0.001, le=0.05, description="Pas de temps")
    store_every: int   = Field(default=10,    ge=1,    le=50,   description="1 frame tous les n pas")

    x_min: float = Field(default=-10.0)
    x_max: float = Field(default=10.0)
    N:     int   = Field(default=512, ge=128, le=1024)


class FrameData(BaseModel):
    real: List[float]
    imag: List[float]
    prob: List[float]


class EvolveResponse(BaseModel):
    x:        List[float]
    V:        List[float]
    times:    List[float]
    frames:   List[FrameData]
    n_frames: int
    dt:       float
    t_end:    float