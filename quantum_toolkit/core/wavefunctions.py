"""
wavefunctions.py
----------------
Wave function construction utilities.
Provides Gaussian wave packets and general normalization tools.

All functions operate on a 1D uniform spatial grid (numpy array).
Units: natural units (ℏ = 1, m = 1) unless otherwise specified.
"""

import numpy as np


# ---------------------------------------------------------------------------
# Core construction
# ---------------------------------------------------------------------------

def gaussian_wave_packet(x: np.ndarray, x0: float = 0.0, sigma: float = 1.0, k0: float = 0.0) -> np.ndarray:
    """
    Construct a normalized Gaussian wave packet.

    ψ(x) = (2πσ²)^(-1/4) · exp(-(x-x0)² / 4σ²) · exp(i·k0·x)

    The Gaussian envelope localizes the particle around x0 with
    position uncertainty σ. The phase exp(i·k0·x) gives the packet
    a mean momentum p = ℏ·k0.

    Parameters
    ----------
    x     : np.ndarray  — uniform spatial grid
    x0    : float       — centre of the packet (mean position)
    sigma : float       — spatial width (position uncertainty σ_x)
    k0    : float       — central wave vector (mean momentum = ℏk0)

    Returns
    -------
    psi : np.ndarray (complex128) — normalized wave function
    """
    envelope = np.exp(-((x - x0) ** 2) / (4 * sigma ** 2))
    phase    = np.exp(1j * k0 * x)
    psi      = envelope * phase
    return normalize(psi, x)


def plane_wave(x: np.ndarray, k: float) -> np.ndarray:
    """
    Construct a plane wave e^(ikx).

    Not normalizable on an infinite domain — use on a finite grid
    as a building block for superpositions.

    Parameters
    ----------
    x : np.ndarray — spatial grid
    k : float      — wave vector

    Returns
    -------
    psi : np.ndarray (complex128)
    """
    return np.exp(1j * k * x)


def superposition(coefficients: list, wavefunctions: list, x: np.ndarray) -> np.ndarray:
    """
    Build a normalized linear superposition of wave functions.

    ψ = normalize( Σ cₙ ψₙ )

    Parameters
    ----------
    coefficients  : list of complex — expansion coefficients cₙ
    wavefunctions : list of np.ndarray — component wave functions ψₙ
    x             : np.ndarray — spatial grid (for normalization)

    Returns
    -------
    psi : np.ndarray (complex128) — normalized superposition
    """
    psi = sum(c * wf for c, wf in zip(coefficients, wavefunctions))
    return normalize(psi, x)


def stationary_state(x: np.ndarray, n: int, L: float) -> np.ndarray:
    """
    Analytical eigenstate of the infinite square well [0, L].

    ψₙ(x) = sqrt(2/L) · sin(nπx/L)   for x ∈ [0, L]
    ψₙ(x) = 0                          elsewhere

    Useful for validation against numerical TISE solutions.

    Parameters
    ----------
    x : np.ndarray — spatial grid
    n : int        — quantum number (n ≥ 1)
    L : float      — well width

    Returns
    -------
    psi : np.ndarray (float64)
    """
    psi = np.zeros_like(x, dtype=float)
    inside = (x >= 0) & (x <= L)
    psi[inside] = np.sqrt(2 / L) * np.sin(n * np.pi * x[inside] / L)
    return psi


# ---------------------------------------------------------------------------
# Normalization & diagnostics
# ---------------------------------------------------------------------------

def normalize(psi: np.ndarray, x: np.ndarray) -> np.ndarray:
    """
    Normalize ψ so that ∫|ψ(x)|² dx = 1.

    Uses the trapezoidal rule for integration.

    Parameters
    ----------
    psi : np.ndarray (complex) — wave function to normalize
    x   : np.ndarray          — spatial grid

    Returns
    -------
    psi_norm : np.ndarray (complex128)

    Raises
    ------
    ValueError if the wave function has zero norm.
    """
    norm = np.sqrt(np.trapezoid(np.abs(psi) ** 2, x))
    if norm < 1e-15:
        raise ValueError("Wave function has zero norm — cannot normalize.")
    return psi / norm


def probability_density(psi: np.ndarray) -> np.ndarray:
    """
    Compute the probability density ρ(x) = |ψ(x)|².

    Parameters
    ----------
    psi : np.ndarray (complex)

    Returns
    -------
    rho : np.ndarray (float64) — always non-negative
    """
    return np.abs(psi) ** 2


def check_normalization(psi: np.ndarray, x: np.ndarray) -> float:
    """
    Return ∫|ψ|² dx — should be ≈ 1.0 for a normalized wave function.

    Useful for sanity checks and test assertions.

    Parameters
    ----------
    psi : np.ndarray (complex)
    x   : np.ndarray

    Returns
    -------
    norm_value : float
    """
    return float(np.trapezoid(np.abs(psi) ** 2, x))


# ---------------------------------------------------------------------------
# Expectation values
# ---------------------------------------------------------------------------

def expectation_position(psi: np.ndarray, x: np.ndarray) -> float:
    """
    Compute <x> = ∫ x |ψ(x)|² dx.

    Parameters
    ----------
    psi : np.ndarray (complex)
    x   : np.ndarray

    Returns
    -------
    <x> : float
    """
    return float(np.trapezoid(x * np.abs(psi) ** 2, x))


def expectation_momentum(psi: np.ndarray, x: np.ndarray, hbar: float = 1.0) -> float:
    """
    Compute <p> = -iℏ ∫ ψ*(x) dψ/dx dx   (central finite difference).

    Parameters
    ----------
    psi  : np.ndarray (complex)
    x    : np.ndarray
    hbar : float

    Returns
    -------
    <p> : float (real part)
    """
    dx = x[1] - x[0]
    dpsi_dx = np.gradient(psi, dx)
    integrand = np.conj(psi) * (-1j * hbar * dpsi_dx)
    return float(np.real(np.trapezoid(integrand, x)))


def uncertainty_position(psi: np.ndarray, x: np.ndarray) -> float:
    """
    Compute σ_x = sqrt(<x²> - <x>²).

    Parameters
    ----------
    psi : np.ndarray (complex)
    x   : np.ndarray

    Returns
    -------
    sigma_x : float
    """
    rho = np.abs(psi) ** 2
    x_mean  = float(np.trapezoid(x * rho, x))
    x2_mean = float(np.trapezoid(x ** 2 * rho, x))
    return float(np.sqrt(max(x2_mean - x_mean ** 2, 0.0)))


def uncertainty_momentum(psi: np.ndarray, x: np.ndarray, hbar: float = 1.0) -> float:
    """
    Compute σ_k via the Fourier transform: σ_k = sqrt(<k²> - <k>²).

    Parameters
    ----------
    psi  : np.ndarray (complex)
    x    : np.ndarray
    hbar : float

    Returns
    -------
    sigma_p : float  (in units of ℏ)
    """
    dx = x[1] - x[0]
    N  = len(x)
    k  = np.fft.fftshift(np.fft.fftfreq(N, dx)) * 2 * np.pi
    psi_k = np.fft.fftshift(np.fft.fft(psi)) * dx
    rho_k = np.abs(psi_k) ** 2

    # Normalize in k-space
    norm_k = np.trapezoid(rho_k, k)
    rho_k /= norm_k

    k_mean  = float(np.trapezoid(k * rho_k, k))
    k2_mean = float(np.trapezoid(k ** 2 * rho_k, k))
    return float(np.sqrt(max(k2_mean - k_mean ** 2, 0.0)))


# ---------------------------------------------------------------------------
# Fourier transform (momentum space)
# ---------------------------------------------------------------------------

def fourier_transform(psi: np.ndarray, x: np.ndarray):
    """
    Compute the momentum-space wave function ψ̃(k) via FFT.

    Returns properly normalized arrays for both k and ψ̃(k).

    Parameters
    ----------
    psi : np.ndarray (complex)
    x   : np.ndarray

    Returns
    -------
    k     : np.ndarray — wave vector axis (centered, ascending)
    psi_k : np.ndarray (complex) — momentum-space wave function
    """
    dx    = x[1] - x[0]
    N     = len(x)
    k     = np.fft.fftshift(np.fft.fftfreq(N, dx)) * 2 * np.pi
    psi_k = np.fft.fftshift(np.fft.fft(psi)) * dx
    return k, psi_k


# ---------------------------------------------------------------------------
# Serialization helper (for FastAPI responses)
# ---------------------------------------------------------------------------

def to_dict(psi: np.ndarray, x: np.ndarray) -> dict:
    """
    Serialize a wave function to a JSON-serializable dict for the REST API.

    Returns real and imaginary parts separately (JSON does not support
    complex numbers natively).

    Parameters
    ----------
    psi : np.ndarray (complex)
    x   : np.ndarray

    Returns
    -------
    dict with keys:
        x        : list[float]
        real     : list[float]   — Re(ψ)
        imag     : list[float]   — Im(ψ)
        prob     : list[float]   — |ψ|²
        norm     : float         — ∫|ψ|²dx (should be ≈ 1)
    """
    return {
        "x":    x.tolist(),
        "real": np.real(psi).tolist(),
        "imag": np.imag(psi).tolist(),
        "prob": probability_density(psi).tolist(),
        "norm": check_normalization(psi, x),
    }