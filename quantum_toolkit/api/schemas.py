"""
schemas.py
----------
Pydantic models for FastAPI request and response validation.
"""

from pydantic import BaseModel, Field
from typing import List


class WavePacketRequest(BaseModel):
    x0:    float = Field(default=0.0,   ge=-8.0,  le=5.0,  description="Centre du paquet")
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


class EvolveRequest(BaseModel):
    x0:    float = Field(default=0.0,  ge=-8.0, le=5.0,  description="Centre initial du paquet")
    sigma: float = Field(default=1.0,  ge=0.2,  le=3.0,  description="Largeur initiale")
    k0:    float = Field(default=3.0,  ge=-8.0, le=8.0,  description="Vecteur d'onde initial")

    # Wave amplitude — scales the initial ψ height independently of σ
    # After scaling, ψ is renormalized so probability is still conserved.
    amplitude: float = Field(default=1.0, ge=0.1, le=5.0, description="Amplitude du paquet d'onde")

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

    boundary: str = Field(default="dirichlet", description="'dirichlet' | 'periodic'")


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


class InfiniteWellRequest(BaseModel):
    x_left:   float = Field(default=-5.0,  ge=-9.0,  le=0.0,  description="Bord gauche du puits")
    x_right:  float = Field(default=5.0,   ge=0.0,   le=9.0,  description="Bord droit du puits")
    n_states: int   = Field(default=5,     ge=1,     le=10,   description="Nombre d'états propres")
    x_min:    float = Field(default=-10.0, description="Borne gauche de la grille")
    x_max:    float = Field(default=10.0,  description="Borne droite de la grille")
    N:        int   = Field(default=512,   ge=128,   le=1024, description="Nombre de points")


class EigenstateData(BaseModel):
    n:      int
    energy: float
    real:   List[float]
    prob:   List[float]


class InfiniteWellResponse(BaseModel):
    x:                   List[float]
    V:                   List[float]
    energies:            List[float]
    analytical_energies: List[float]
    eigenstates:         List[EigenstateData]
    well_width:          float
    n_states:            int


class SuperpositionRequest(BaseModel):
    coefficients: List[float] = Field(
        default=[1.0, 0.5, 0.25],
        description="Coefficients cₙ pour chaque état propre (non normalisés)"
    )
    x_left:   float = Field(default=-5.0,  ge=-8.0, le=0.0,  description="Bord gauche du puits")
    x_right:  float = Field(default=5.0,   ge=0.0,  le=8.0,  description="Bord droit du puits")
    t_end:    float = Field(default=5.0,   ge=0.1,  le=30.0, description="Temps total")
    dt:       float = Field(default=0.01,  ge=0.001, le=0.1, description="Pas de temps")
    store_every: int = Field(default=5,    ge=1,    le=20,   description="1 frame tous les n pas")
    x_min:    float = Field(default=-10.0)
    x_max:    float = Field(default=10.0)
    N:        int   = Field(default=512,   ge=128,  le=1024)


class SuperpositionResponse(BaseModel):
    x:            List[float]
    V:            List[float]
    times:        List[float]
    frames:       List[FrameData]
    n_frames:     int
    energies:     List[float]
    coefficients: List[float]
    t_end:        float
    well_width:   float