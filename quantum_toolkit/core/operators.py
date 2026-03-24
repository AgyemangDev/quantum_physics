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


# ---------------------------------------------------------------------------
# Eigenvalue solver (TISE)
# ---------------------------------------------------------------------------

def solve_tise(x: np.ndarray, V: np.ndarray, num_states: int = 10,
               hbar: float = 1.0, mass: float = 1.0) -> tuple:
    """
    Solve the Time-Independent Schrödinger Equation (TISE).

    Ĥψₙ = Eₙψₙ

    Finds the lowest `num_states` energy eigenvalues and eigenvectors
    using the ARPACK sparse eigensolver (scipy.sparse.linalg.eigsh).

    This is orders of magnitude faster than full diagonalization for
    large matrices, since we only need the lowest few eigenvalues.

    Parameters
    ----------
    x          : np.ndarray — uniform spatial grid
    V          : np.ndarray — potential energy array
    num_states : int        — number of eigenstates to compute (default: 10)
    hbar       : float      — reduced Planck constant (default: 1)
    mass       : float      — particle mass (default: 1)

    Returns
    -------
    energies   : np.ndarray, shape (num_states,)
                 Energy eigenvalues E₁ ≤ E₂ ≤ ... ≤ Eₙ (sorted ascending)

    eigenstates: np.ndarray, shape (N, num_states)
                 Normalized eigenvectors. Column k is ψₖ(x).
                 Each eigenstate satisfies ∫|ψₖ|²dx ≈ 1.

    Notes
    -----
    - Uses 'which="SM"' to find the Smallest Magnitude eigenvalues,
      which correspond to the lowest energy bound states.
    - Eigenstates are normalized using the trapezoidal rule.
    - The sign of each eigenstate is fixed so the first lobe is positive
      (convention: makes comparison between runs consistent).

    Example
    -------
    >>> x = np.linspace(0, 10, 512)
    >>> V = infinite_square_well(x, x_left=0, x_right=10)
    >>> energies, states = solve_tise(x, V, num_states=5)
    >>> print(energies)  # Should be ≈ [0.49, 1.97, 4.44, 7.90, 12.34] for L=10
    """
    H = hamiltonian(x, V, hbar=hbar, mass=mass)

    # Clamp num_states to valid range
    N = len(x)
    num_states = min(num_states, N - 2)

    # Solve sparse eigenvalue problem — find lowest num_states eigenvalues
    energies, eigenstates = spla.eigsh(H, k=num_states, which="SM")

    # Sort by energy (ascending)
    idx = np.argsort(energies)
    energies   = energies[idx]
    eigenstates = eigenstates[:, idx]

    # Normalize each eigenstate: ∫|ψ|²dx = 1
    dx = x[1] - x[0]
    for i in range(num_states):
        norm = np.sqrt(np.trapezoid(np.abs(eigenstates[:, i]) ** 2, x))
        if norm > 1e-15:
            eigenstates[:, i] /= norm
        # Fix sign convention: first significant lobe is positive
        first_lobe = eigenstates[:, i][np.abs(eigenstates[:, i]) > 0.01 * np.max(np.abs(eigenstates[:, i]))]
        if len(first_lobe) > 0 and first_lobe[0] < 0:
            eigenstates[:, i] *= -1

    return energies, eigenstates


# ---------------------------------------------------------------------------
# Momentum operator
# ---------------------------------------------------------------------------

def momentum_operator(x: np.ndarray, hbar: float = 1.0) -> sp.csr_matrix:
    """
    Build the momentum operator p̂ using central finite differences.

    p̂ = -iℏ · d/dx

    Approximated with central differences (antisymmetric, imaginary):
        dψ/dx ≈ (ψᵢ₊₁ - ψᵢ₋₁) / (2Δx)

    Note: p̂ is anti-Hermitian in this discretization — it is used
    mainly for computing expectation values <p>, not for building H.

    Parameters
    ----------
    x    : np.ndarray — uniform spatial grid
    hbar : float      — reduced Planck constant (default: 1)

    Returns
    -------
    p_op : scipy.sparse.csr_matrix — momentum matrix, shape (N, N)
           Complex matrix (imaginary entries)
    """
    N  = len(x)
    dx = x[1] - x[0]

    # Central difference: off-diagonals ±1/(2Δx), multiplied by -iℏ
    prefactor = -1j * hbar / (2 * dx)

    upper = prefactor * np.ones(N - 1)
    lower = -prefactor * np.ones(N - 1)

    p_op = sp.diags(
        diagonals=[lower, upper],
        offsets=[-1, 1],
        shape=(N, N),
        format="csr",
    )
    return p_op


# ---------------------------------------------------------------------------
# Expectation values from operators
# ---------------------------------------------------------------------------

def expectation_value(psi: np.ndarray, operator: sp.csr_matrix,
                       x: np.ndarray) -> complex:
    """
    Compute the expectation value <ψ|Ô|ψ> = ∫ψ*(x) Ô ψ(x) dx.

    Parameters
    ----------
    psi      : np.ndarray (complex) — normalized wave function
    operator : scipy.sparse matrix  — quantum operator matrix
    x        : np.ndarray           — spatial grid

    Returns
    -------
    <O> : complex (imaginary part should be ≈ 0 for Hermitian operators)
    """
    Opsi = operator.dot(psi)
    integrand = np.conj(psi) * Opsi
    return np.trapezoid(integrand, x)


def energy_expectation(psi: np.ndarray, x: np.ndarray, V: np.ndarray,
                        hbar: float = 1.0, mass: float = 1.0) -> float:
    """
    Compute the energy expectation value <E> = <ψ|Ĥ|ψ>.

    Useful for validating that an eigenstate satisfies <E> ≈ Eₙ,
    and for tracking energy during time evolution.

    Parameters
    ----------
    psi  : np.ndarray (complex) — normalized wave function
    x    : np.ndarray           — spatial grid
    V    : np.ndarray           — potential energy array
    hbar : float                — reduced Planck constant
    mass : float                — particle mass

    Returns
    -------
    <E> : float
    """
    H = hamiltonian(x, V, hbar=hbar, mass=mass)
    return float(np.real(expectation_value(psi, H, x)))


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

def hamiltonian_info(x: np.ndarray, V: np.ndarray) -> dict:
    """
    Return diagnostic information about the Hamiltonian matrix.

    Useful for debugging, validation, and API responses.

    Parameters
    ----------
    x : np.ndarray — spatial grid
    V : np.ndarray — potential energy array

    Returns
    -------
    dict with keys:
        N          : int   — matrix dimension
        dx         : float — grid spacing
        is_symmetric: bool — should always be True
        nnz        : int   — number of non-zero elements
        sparsity   : float — fraction of non-zero elements
    """
    H = hamiltonian(x, V)
    N = len(x)
    nnz = H.nnz

    # Check symmetry: |H - Hᵀ| should be zero
    diff = H - H.T
    is_symmetric = np.allclose(diff.data, 0, atol=1e-10) if diff.nnz > 0 else True

    return {
        "N":            N,
        "dx":           float(x[1] - x[0]),
        "is_symmetric": is_symmetric,
        "nnz":          nnz,
        "sparsity":     round(nnz / (N * N), 6),
    }