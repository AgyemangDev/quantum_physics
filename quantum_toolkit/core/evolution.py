"""
evolution.py
------------
Schrödinger equation solvers for 1D quantum systems.

Two solvers
-----------
TISE : Time-Independent Schrödinger Equation  →  Ĥψₙ = Eₙψₙ
       Solved by diagonalizing the Hamiltonian matrix (finite difference).
       Returns energy eigenvalues and eigenfunctions.

TDSE : Time-Dependent Schrödinger Equation    →  iℏ ∂ψ/∂t = Ĥψ
       Solved by the Crank-Nicolson method (unconditionally stable, O(Δt²)).
       Returns the wave function at each time step.

Units: natural units (ℏ = 1, m = 1) unless otherwise specified.
"""

import numpy as np
import scipy.linalg
import scipy.sparse
import scipy.sparse.linalg

from .operators import hamiltonian, hamiltonian_sparse


# ---------------------------------------------------------------------------
# TISE solver — Ĥψₙ = Eₙψₙ
# ---------------------------------------------------------------------------

def solve_tise(x: np.ndarray, V: np.ndarray, n_states: int = 10,
               hbar: float = 1.0, mass: float = 1.0):
    """
    Solve the Time-Independent Schrödinger Equation using finite differences.

    Constructs the Hamiltonian matrix H = T + V and diagonalizes it
    using scipy.linalg.eigh (optimized for real symmetric matrices).

    Returns the n_states lowest energy eigenvalues and eigenfunctions.

    Physics
    -------
    The TISE Ĥψₙ = Eₙψₙ describes stationary quantum states.
    Each solution (Eₙ, ψₙ) represents a state where the particle
    has a definite energy Eₙ. The probability density |ψₙ(x)|²
    does not change in time for these states.

    For the infinite square well of width L:
        Eₙ = n²π²ℏ²/(2mL²)   (analytical reference for validation)

    Parameters
    ----------
    x        : np.ndarray — uniform spatial grid (N points)
    V        : np.ndarray — potential energy V(x) on the grid
    n_states : int        — number of lowest eigenstates to compute
    hbar     : float      — reduced Planck constant
    mass     : float      — particle mass

    Returns
    -------
    energies      : np.ndarray, shape (n_states,)
                    Energy eigenvalues E₀ < E₁ < ... < E_{n-1}
    wavefunctions : np.ndarray, shape (N, n_states)
                    Normalized eigenfunctions — column k is ψₖ(x)
    """
    H = hamiltonian(x, V, hbar=hbar, mass=mass)

    energies, wavefunctions = scipy.linalg.eigh(
        H, subset_by_index=[0, n_states - 1]
    )

    # Normalize each eigenstate ∫|ψₙ|²dx = 1
    for n in range(n_states):
        norm = np.sqrt(np.trapezoid(np.abs(wavefunctions[:, n]) ** 2, x))
        if norm > 1e-15:
            wavefunctions[:, n] /= norm

        # Phase convention: make the first significant value positive
        idx = np.argmax(np.abs(wavefunctions[:, n]))
        if np.real(wavefunctions[idx, n]) < 0:
            wavefunctions[:, n] *= -1

    return energies, wavefunctions


def analytical_infinite_well_energies(n_max: int, L: float,
                                       hbar: float = 1.0, mass: float = 1.0) -> np.ndarray:
    """
    Analytical energy levels of the infinite square well.

    Eₙ = n²π²ℏ²/(2mL²),   n = 1, 2, 3, ...

    Used to validate the numerical TISE solver.

    Parameters
    ----------
    n_max : int   — number of levels to compute
    L     : float — well width
    hbar  : float
    mass  : float

    Returns
    -------
    energies : np.ndarray, shape (n_max,)
    """
    n = np.arange(1, n_max + 1)
    return (n ** 2 * np.pi ** 2 * hbar ** 2) / (2 * mass * L ** 2)


# ---------------------------------------------------------------------------
# TDSE solver — Crank-Nicolson method
# ---------------------------------------------------------------------------

def crank_nicolson_step(psi: np.ndarray, H_sparse: scipy.sparse.csr_matrix,
                         dt: float, hbar: float = 1.0) -> np.ndarray:
    """
    Advance the wave function by one time step Δt using Crank-Nicolson.

    The Crank-Nicolson scheme discretizes the TDSE as:

        iℏ (ψ(t+Δt) - ψ(t)) / Δt = ½ Ĥ (ψ(t+Δt) + ψ(t))

    Rearranging gives a linear system:

        A · ψ(t+Δt) = B · ψ(t)

    where:
        A = I + i(Δt/2ℏ) H
        B = I - i(Δt/2ℏ) H

    Properties
    ----------
    - Unconditionally stable (no CFL condition on Δt)
    - Second-order accurate in time: O(Δt²)
    - Unitary: preserves norm ||ψ|| = 1 exactly (up to floating point)
    - Time-reversible: A and B are conjugates of each other

    Parameters
    ----------
    psi      : np.ndarray (complex128) — current wave function ψ(t), shape (N,)
    H_sparse : scipy.sparse.csr_matrix — Hamiltonian matrix (sparse CSR)
    dt       : float                   — time step Δt
    hbar     : float                   — reduced Planck constant

    Returns
    -------
    psi_next : np.ndarray (complex128) — wave function at t + Δt, normalized
    """
    N = len(psi)
    I = scipy.sparse.identity(N, format='csr', dtype=complex)

    alpha = 1j * dt / (2.0 * hbar)
    A = I + alpha * H_sparse   # implicit side
    B = I - alpha * H_sparse   # explicit side

    rhs = B @ psi
    psi_next = scipy.sparse.linalg.spsolve(A, rhs)

    # Renormalize to correct accumulated floating-point drift
    norm = np.sqrt(np.sum(np.abs(psi_next) ** 2))
    if norm > 1e-15:
        psi_next /= norm

    return psi_next


def evolve(psi0: np.ndarray, x: np.ndarray, V: np.ndarray,
           t_end: float, dt: float,
           hbar: float = 1.0, mass: float = 1.0,
           store_every: int = 1):
    """
    Propagate ψ from t=0 to t=t_end using the Crank-Nicolson method.

    Parameters
    ----------
    psi0        : np.ndarray (complex) — initial wave function ψ(x, 0)
    x           : np.ndarray          — uniform spatial grid
    V           : np.ndarray          — potential energy V(x) (time-independent)
    t_end       : float               — total evolution time
    dt          : float               — time step
    hbar        : float
    mass        : float
    store_every : int                 — store snapshot every n steps
                                        (reduces memory for long simulations)

    Returns
    -------
    snapshots : list of np.ndarray (complex) — ψ(x, tₙ) at recorded times
    times     : list of float               — corresponding time values
    """
    H = hamiltonian_sparse(x, V, hbar=hbar, mass=mass)

    psi = psi0.astype(complex).copy()
    snapshots = [psi.copy()]
    times     = [0.0]

    n_steps = int(np.ceil(t_end / dt))

    for step in range(1, n_steps + 1):
        psi = crank_nicolson_step(psi, H, dt, hbar=hbar)
        if step % store_every == 0:
            snapshots.append(psi.copy())
            times.append(step * dt)

    return snapshots, times


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

def norm(psi: np.ndarray, x: np.ndarray) -> float:
    """
    Compute ∫|ψ(x)|² dx.

    Should remain ≈ 1.0 throughout time evolution.
    Significant deviation indicates numerical instability.

    Parameters
    ----------
    psi : np.ndarray (complex)
    x   : np.ndarray

    Returns
    -------
    norm_value : float
    """
    return float(np.trapezoid(np.abs(psi) ** 2, x))


def energy_expectation(psi: np.ndarray, H_sparse: scipy.sparse.csr_matrix) -> float:
    """
    Compute the energy expectation value <E> = <ψ|H|ψ>.

    For a stationary state ψₙ, this returns exactly Eₙ.
    For a superposition, it returns the weighted average of energies.

    Parameters
    ----------
    psi      : np.ndarray (complex)
    H_sparse : scipy.sparse.csr_matrix

    Returns
    -------
    E : float — energy expectation value
    """
    return float(np.real(np.conj(psi) @ (H_sparse @ psi)))


def transmission_coefficient(psi: np.ndarray, x: np.ndarray,
                               x_barrier_right: float) -> float:
    """
    Estimate the transmission probability T = P(x > x_barrier_right).

    T = ∫_{x_barrier_right}^{∞} |ψ(x)|² dx

    Parameters
    ----------
    psi              : np.ndarray (complex)
    x                : np.ndarray
    x_barrier_right  : float — right edge of the barrier

    Returns
    -------
    T : float in [0, 1]
    """
    mask = x > x_barrier_right
    dx = x[1] - x[0]
    return float(np.sum(np.abs(psi[mask]) ** 2) * dx)


def reflection_coefficient(psi: np.ndarray, x: np.ndarray,
                             x_barrier_left: float) -> float:
    """
    Estimate the reflection probability R = P(x < x_barrier_left).

    R = ∫_{-∞}^{x_barrier_left} |ψ(x)|² dx

    For a physical system: T + R ≈ 1 (conservation of probability).

    Parameters
    ----------
    psi             : np.ndarray (complex)
    x               : np.ndarray
    x_barrier_left  : float — left edge of the barrier

    Returns
    -------
    R : float in [0, 1]
    """
    mask = x < x_barrier_left
    dx = x[1] - x[0]
    return float(np.sum(np.abs(psi[mask]) ** 2) * dx)


def validate_tise(energies_numerical: np.ndarray, L: float,
                  hbar: float = 1.0, mass: float = 1.0) -> dict:
    """
    Validate TISE numerical results against analytical infinite well energies.

    Computes relative error between numerical and analytical energy levels.
    Useful for checking grid resolution and numerical accuracy.

    Parameters
    ----------
    energies_numerical : np.ndarray — energies from solve_tise()
    L                  : float      — well width
    hbar               : float
    mass               : float

    Returns
    -------
    dict with keys:
        analytical      : np.ndarray — analytical energy levels
        numerical       : np.ndarray — numerical energy levels
        relative_errors : np.ndarray — |E_num - E_ana| / E_ana
        max_error       : float      — maximum relative error
    """
    n = len(energies_numerical)
    E_ana = analytical_infinite_well_energies(n, L, hbar=hbar, mass=mass)
    rel_errors = np.abs(energies_numerical - E_ana) / np.abs(E_ana)

    return {
        "analytical":      E_ana,
        "numerical":       energies_numerical,
        "relative_errors": rel_errors,
        "max_error":       float(np.max(rel_errors)),
    }


# ---------------------------------------------------------------------------
# Serialization helper (for FastAPI responses)
# ---------------------------------------------------------------------------

def snapshots_to_dict(snapshots: list, times: list, x: np.ndarray) -> dict:
    """
    Serialize time evolution snapshots for the FastAPI response.

    Parameters
    ----------
    snapshots : list of np.ndarray (complex)
    times     : list of float
    x         : np.ndarray

    Returns
    -------
    dict with keys:
        x         : list[float]
        times     : list[float]
        frames    : list of dict — each frame has real, imag, prob
    """
    frames = []
    for psi in snapshots:
        frames.append({
            "real": np.real(psi).tolist(),
            "imag": np.imag(psi).tolist(),
            "prob": (np.abs(psi) ** 2).tolist(),
        })

    return {
        "x":      x.tolist(),
        "times":  times,
        "frames": frames,
    }


def tise_to_dict(x: np.ndarray, energies: np.ndarray,
                  wavefunctions: np.ndarray, V: np.ndarray) -> dict:
    """
    Serialize TISE results for the FastAPI response.

    Parameters
    ----------
    x             : np.ndarray
    energies      : np.ndarray, shape (n_states,)
    wavefunctions : np.ndarray, shape (N, n_states)
    V             : np.ndarray — potential

    Returns
    -------
    dict with keys:
        x           : list[float]
        V           : list[float]
        energies    : list[float]
        eigenstates : list of dict — each has real, imag, prob, n, energy
    """
    n_states = len(energies)
    eigenstates = []

    for n in range(n_states):
        psi_n = wavefunctions[:, n]
        eigenstates.append({
            "n":      n,
            "energy": float(energies[n]),
            "real":   np.real(psi_n).tolist(),
            "imag":   np.imag(psi_n).tolist(),
            "prob":   (np.abs(psi_n) ** 2).tolist(),
        })

    return {
        "x":          x.tolist(),
        "V":          V.tolist(),
        "energies":   energies.tolist(),
        "eigenstates": eigenstates,
    }