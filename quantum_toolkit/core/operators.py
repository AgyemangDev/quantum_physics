"""
operators.py
------------
Quantum mechanical operators in matrix form (finite difference method).

All operators act on a 1D uniform spatial grid of N points.
Uses second-order central finite differences for spatial derivatives.

Available operators
-------------------
- kinetic_matrix         : T = -ℏ²/2m · d²/dx²  (dense)
- kinetic_matrix_sparse  : T sparse (CSR) — recommended for large grids
- potential_matrix       : V = diag(V(x))
- potential_matrix_sparse: V sparse (CSR)
- hamiltonian            : H = T + V  (dense)
- hamiltonian_sparse     : H = T + V  (sparse CSR) — recommended for TDSE
- momentum_matrix        : p = -iℏ d/dx  (central difference)
- position_matrix        : x̂ = diag(x)
- apply                  : apply operator to wave function

Units: natural units (ℏ = 1, m = 1) unless otherwise specified.
"""

import numpy as np
import scipy.sparse as sp


# ---------------------------------------------------------------------------
# Kinetic energy operator  T = -ℏ²/2m · d²/dx²
# ---------------------------------------------------------------------------

def kinetic_matrix(x: np.ndarray, hbar: float = 1.0, mass: float = 1.0) -> np.ndarray:
    """
    Dense kinetic energy matrix using second-order finite differences.

    The second derivative d²ψ/dx² is approximated as:
        (ψ_{i+1} - 2ψ_i + ψ_{i-1}) / Δx²

    So the kinetic energy operator becomes a tridiagonal matrix:
        T_ii     =  ℏ²/(m·Δx²)
        T_{i,i±1} = -ℏ²/(2m·Δx²)

    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid (N points)
    hbar : float      — reduced Planck constant (default: 1, natural units)
    mass : float      — particle mass (default: 1, natural units)

    Returns
    -------
    T : np.ndarray, shape (N, N) — real symmetric tridiagonal matrix

    Note
    ----
    For large grids (N > 500) or TDSE use, prefer kinetic_matrix_sparse().
    """
    N  = len(x)
    dx = x[1] - x[0]
    coeff = hbar ** 2 / (2.0 * mass * dx ** 2)

    diag = 2.0 * coeff * np.ones(N)
    off  = -coeff * np.ones(N - 1)

    return np.diag(diag) + np.diag(off, 1) + np.diag(off, -1)


def kinetic_matrix_sparse(x: np.ndarray, hbar: float = 1.0, mass: float = 1.0) -> sp.csr_matrix:
    """
    Sparse CSR kinetic energy matrix — recommended for TDSE and large grids.

    Same mathematical content as kinetic_matrix() but stored efficiently
    as a sparse matrix. Enables fast matrix-vector products in the
    Crank-Nicolson solver without allocating an N×N dense array.

    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    hbar : float
    mass : float

    Returns
    -------
    T : scipy.sparse.csr_matrix, shape (N, N)
    """
    N  = len(x)
    dx = x[1] - x[0]
    coeff = hbar ** 2 / (2.0 * mass * dx ** 2)

    diag = 2.0 * coeff * np.ones(N)
    off  = -coeff * np.ones(N - 1)

    return sp.diags([off, diag, off], [-1, 0, 1], format='csr')


# ---------------------------------------------------------------------------
# Potential energy operator  V = diag(V(x))
# ---------------------------------------------------------------------------

def potential_matrix(V: np.ndarray) -> np.ndarray:
    """
    Dense diagonal matrix for the potential energy operator V̂.

    In position representation, V̂ is diagonal:
        V_ij = V(xᵢ) · δ_ij

    Parameters
    ----------
    V : np.ndarray, shape (N,) — potential energy evaluated on the spatial grid

    Returns
    -------
    V_mat : np.ndarray, shape (N, N) — diagonal matrix
    """
    return np.diag(V.astype(float))


def potential_matrix_sparse(V: np.ndarray) -> sp.csr_matrix:
    """
    Sparse diagonal matrix for V̂ — recommended for TDSE.

    Parameters
    ----------
    V : np.ndarray, shape (N,)

    Returns
    -------
    V_mat : scipy.sparse.csr_matrix, shape (N, N)
    """
    return sp.diags(V.astype(float), format='csr')


# ---------------------------------------------------------------------------
# Hamiltonian  H = T + V
# ---------------------------------------------------------------------------

def hamiltonian(x: np.ndarray, V: np.ndarray,
                hbar: float = 1.0, mass: float = 1.0) -> np.ndarray:
    """
    Full Hamiltonian matrix H = T + V  (dense).

    H is the central operator of quantum mechanics:
        Ĥ = -ℏ²/2m · d²/dx² + V(x)

    Used for:
    - TISE: Ĥψₙ = Eₙψₙ  (eigenvalue problem → energy levels)
    - TDSE: iℏ∂ψ/∂t = Ĥψ (time evolution)

    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    V    : np.ndarray — potential energy V(x) on the grid
    hbar : float
    mass : float

    Returns
    -------
    H : np.ndarray, shape (N, N) — real symmetric matrix

    Note
    ----
    For TDSE or large grids, use hamiltonian_sparse() instead.
    """
    return kinetic_matrix(x, hbar, mass) + potential_matrix(V)


def hamiltonian_sparse(x: np.ndarray, V: np.ndarray,
                        hbar: float = 1.0, mass: float = 1.0) -> sp.csr_matrix:
    """
    Full Hamiltonian matrix H = T + V  (sparse CSR).

    Recommended for:
    - Crank-Nicolson TDSE solver (sparse linear system solve)
    - Large grids (N > 500)
    - Memory-efficient computation

    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    V    : np.ndarray — potential energy V(x)
    hbar : float
    mass : float

    Returns
    -------
    H : scipy.sparse.csr_matrix, shape (N, N)
    """
    return kinetic_matrix_sparse(x, hbar, mass) + potential_matrix_sparse(V)


# ---------------------------------------------------------------------------
# Momentum operator  p̂ = -iℏ d/dx
# ---------------------------------------------------------------------------

def momentum_matrix(x: np.ndarray, hbar: float = 1.0) -> np.ndarray:
    """
    Momentum operator matrix using central finite differences.

    The first derivative dψ/dx is approximated as:
        (ψ_{i+1} - ψ_{i-1}) / (2Δx)

    So the momentum operator is an anti-symmetric matrix:
        p_{i,i+1} = -iℏ / (2Δx)
        p_{i,i-1} = +iℏ / (2Δx)

    This operator is Hermitian: p† = p

    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    hbar : float

    Returns
    -------
    p : np.ndarray (complex128), shape (N, N) — anti-symmetric complex matrix
    """
    N  = len(x)
    dx = x[1] - x[0]
    coeff = -1j * hbar / (2.0 * dx)

    off_plus  =  coeff * np.ones(N - 1)
    off_minus = -coeff * np.ones(N - 1)

    return np.diag(off_plus, 1) + np.diag(off_minus, -1)


# ---------------------------------------------------------------------------
# Position operator  x̂ = diag(x)
# ---------------------------------------------------------------------------

def position_matrix(x: np.ndarray) -> np.ndarray:
    """
    Position operator matrix x̂ = diag(x).

    In position representation, x̂ is simply diagonal.
    Used for computing expectation values <x> = <ψ|x̂|ψ>.

    Parameters
    ----------
    x : np.ndarray — spatial grid

    Returns
    -------
    X : np.ndarray, shape (N, N) — diagonal matrix
    """
    return np.diag(x.astype(float))


# ---------------------------------------------------------------------------
# Apply operator to wave function
# ---------------------------------------------------------------------------

def apply(operator: np.ndarray, psi: np.ndarray) -> np.ndarray:
    """
    Apply an operator matrix to a wave function vector.

    Computes O|ψ⟩ = operator @ psi

    Works with both dense numpy arrays and sparse scipy matrices.

    Parameters
    ----------
    operator : np.ndarray or scipy.sparse matrix, shape (N, N)
    psi      : np.ndarray (complex), shape (N,)

    Returns
    -------
    result : np.ndarray (complex), shape (N,)
    """
    return operator @ psi


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

def commutator(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    """
    Compute the commutator [A, B] = AB - BA.

    In quantum mechanics, non-commuting operators correspond to
    incompatible observables (e.g. [x̂, p̂] = iℏ — Heisenberg uncertainty).

    Parameters
    ----------
    A : np.ndarray, shape (N, N)
    B : np.ndarray, shape (N, N)

    Returns
    -------
    [A, B] : np.ndarray (complex), shape (N, N)
    """
    return A @ B - B @ A


def is_hermitian(operator: np.ndarray, tol: float = 1e-10) -> bool:
    """
    Check if an operator matrix is Hermitian (self-adjoint): O† = O.

    Physical observables must be Hermitian to guarantee real eigenvalues.
    Useful for validating that H, x̂, p̂ are correctly constructed.

    Parameters
    ----------
    operator : np.ndarray — square matrix
    tol      : float      — numerical tolerance

    Returns
    -------
    bool : True if ||O - O†|| < tol
    """
    diff = np.max(np.abs(operator - operator.conj().T))
    return bool(diff < tol)


def expectation_value(operator: np.ndarray, psi: np.ndarray, x: np.ndarray) -> float:
    """
    Compute the expectation value <ψ|Ô|ψ> = ∫ ψ*(x) (Ôψ)(x) dx.

    Parameters
    ----------
    operator : np.ndarray or sparse matrix, shape (N, N)
    psi      : np.ndarray (complex), shape (N,)
    x        : np.ndarray — spatial grid (for integration)

    Returns
    -------
    ev : float — real part of the expectation value
    """
    O_psi = operator @ psi
    integrand = np.conj(psi) * O_psi
    return float(np.real(np.trapezoid(integrand, x)))