"""
operators.py
------------
Quantum mechanical operators for 1D systems.
 
Implements the kinetic energy operator, potential energy operator,
and the full Hamiltonian using the Finite Difference Method (FDM).
 
The Hamiltonian Ĥ = T̂ + V̂ is represented as a sparse matrix:
    - T̂ (kinetic energy) : tridiagonal matrix from FDM second derivative
    - V̂ (potential energy): diagonal matrix from V(x) values
 
The resulting matrix eigenvalue problem Ĥψ = Eψ gives:
    - eigenvalues  → energy levels E₁, E₂, E₃, ...
    - eigenvectors → stationary states ψ₁, ψ₂, ψ₃, ...
 
All operators use natural units (ℏ = 1, m = 1) unless specified.
 
FDM second derivative (central difference, O(Δx²) accuracy):
    d²ψ/dx² ≈ (ψᵢ₋₁ - 2ψᵢ + ψᵢ₊₁) / Δx²
"""
 
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
 
 
# ---------------------------------------------------------------------------
# Kinetic energy operator
# ---------------------------------------------------------------------------
 
def kinetic_energy_operator(x: np.ndarray, hbar: float = 1.0,
                             mass: float = 1.0) -> sp.dia_matrix:
    """
    Build the kinetic energy operator T̂ using the Finite Difference Method.
 
    T̂ = -ℏ²/(2m) · d²/dx²
 
    The second derivative is approximated by the central difference formula:
        d²ψ/dx² ≈ (ψᵢ₋₁ - 2ψᵢ + ψᵢ₊₁) / Δx²
 
    This produces a symmetric tridiagonal matrix:
        diagonal     : -2 · (-ℏ²/2mΔx²) = ℏ²/mΔx²
        off-diagonals:  1 · (-ℏ²/2mΔx²)
 
    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    hbar : float      — reduced Planck constant (default: 1, natural units)
    mass : float      — particle mass (default: 1, natural units)
 
    Returns
    -------
    T : scipy.sparse matrix (dia_matrix, real float64)
        Shape: (N, N) where N = len(x)
 
    Notes
    -----
    Sparse format is used for memory efficiency: storing only 3 diagonals
    instead of N² elements. For N=1000 this saves ~99.8% memory.
    """
    N  = len(x)
    dx = x[1] - x[0]
 
    # Prefactor: -ℏ²/(2m·Δx²)
    prefactor = -(hbar ** 2) / (2 * mass * dx ** 2)
 
    # Main diagonal: -2 × prefactor (positive, since prefactor is negative)
    main_diag  = -2 * prefactor * np.ones(N)
 
    # Off-diagonals: +1 × prefactor (negative)
    off_diag   = prefactor * np.ones(N - 1)
 
    # Build sparse tridiagonal matrix
    T = sp.diags(
        diagonals=[off_diag, main_diag, off_diag],
        offsets=[-1, 0, 1],
        shape=(N, N),
        format="csr",
    )
    return T
 
 
# ---------------------------------------------------------------------------
# Potential energy operator
# ---------------------------------------------------------------------------
 
def potential_energy_operator(V: np.ndarray) -> sp.dia_matrix:
    """
    Build the potential energy operator V̂ as a diagonal matrix.
 
    V̂ψ(x) = V(x) · ψ(x)
 
    In the position representation, V̂ is simply a diagonal matrix
    with V(xᵢ) on the diagonal. No approximation is needed here —
    the potential is evaluated exactly at each grid point.
 
    Parameters
    ----------
    V : np.ndarray — potential energy array V(x), shape (N,)
 
    Returns
    -------
    V_op : scipy.sparse diagonal matrix (csr_matrix)
           Shape: (N, N)
    """
    return sp.diags(V, offsets=0, format="csr")
 
 
# ---------------------------------------------------------------------------
# Full Hamiltonian
# ---------------------------------------------------------------------------
 
def hamiltonian(x: np.ndarray, V: np.ndarray, hbar: float = 1.0,
                mass: float = 1.0) -> sp.csr_matrix:
    """
    Build the full Hamiltonian operator Ĥ = T̂ + V̂.
 
    Ĥψ = Eψ  (time-independent Schrödinger equation)
 
    This is the central object of quantum mechanics. Solving its
    eigenvalue problem gives all observable energy levels and
    the corresponding stationary states of the system.
 
    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    V    : np.ndarray — potential energy V(x), same shape as x
    hbar : float      — reduced Planck constant (default: 1)
    mass : float      — particle mass (default: 1)
 
    Returns
    -------
    H : scipy.sparse.csr_matrix — Hamiltonian matrix, shape (N, N)
        Symmetric real matrix (since V is real and T is symmetric)
 
    Example
    -------
    >>> x = np.linspace(-10, 10, 512)
    >>> V = infinite_square_well(x)
    >>> H = hamiltonian(x, V)
    """
    T = kinetic_energy_operator(x, hbar=hbar, mass=mass)
    V_op = potential_energy_operator(V)
    return T + V_op
