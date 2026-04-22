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

Boundary-condition contract (set by the frontend, passed via main.py)
----------------------------------------------------------------------
free    → periodic    wave circulates on a ring; V = 0; wider domain ±20
barrier → absorbing   CAP at both edges; wave is damped to zero; no wrap-around
step    → absorbing   CAP at both edges; wave is damped to zero; no wrap-around
wall    → dirichlet   ψ = 0 at edges; hard wall; full reflection
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
# Complex Absorbing Potential (CAP) — absorbing boundary layer
# ---------------------------------------------------------------------------

def _build_cap(x: np.ndarray,
               cap_x_inner: float = 10.0,
               cap_strength: float = 20.0) -> np.ndarray:
    """
    Build a Complex Absorbing Potential (CAP) layer at both domain edges.

    The CAP begins at x = ±cap_x_inner and ramps up quadratically to the
    domain boundary.  cap_x_inner should be set to the edge of the *visible*
    plot window so that all absorption happens in the invisible buffer zone —
    the wave simply vanishes off-screen rather than appearing to reflect.

    Physics
    -------
    The modified Hamiltonian becomes H' = H - i·W(x), where W(x) ≥ 0.
    In the absorbing region the norm decays as e^{-W·t/hbar}, smoothly
    removing probability from the domain.  The quadratic ramp minimises
    reflection from the CAP onset.

    Parameters
    ----------
    x            : np.ndarray — uniform spatial grid, shape (N,)
    cap_x_inner  : float      — |x| where the CAP begins; set to the visible
                                plot half-width (default 10.0).
    cap_strength : float      — peak CAP strength at the domain boundary.

    Returns
    -------
    W : np.ndarray, shape (N,), real — absorbing potential W(x) >= 0.
    """
    W = np.zeros_like(x, dtype=float)

    # Left absorbing layer: x in [x[0], -cap_x_inner]
    # s = 0 at the onset (x = -cap_x_inner), s = 1 at the domain edge (x[0])
    cap_width_left = (-cap_x_inner) - x[0]
    if cap_width_left > 0:
        left_mask = x < -cap_x_inner
        s_left = ((-cap_x_inner) - x[left_mask]) / cap_width_left
        W[left_mask] = cap_strength * s_left ** 2

    # Right absorbing layer: x in [cap_x_inner, x[-1]]
    # s = 0 at the onset (x = cap_x_inner), s = 1 at the domain edge (x[-1])
    cap_width_right = x[-1] - cap_x_inner
    if cap_width_right > 0:
        right_mask = x > cap_x_inner
        s_right = (x[right_mask] - cap_x_inner) / cap_width_right
        W[right_mask] = cap_strength * s_right ** 2

    return W


# ---------------------------------------------------------------------------
# Hamiltonian builders
# ---------------------------------------------------------------------------

def _build_periodic_hamiltonian(x: np.ndarray, V: np.ndarray,
                                  hbar: float = 1.0, mass: float = 1.0
                                  ) -> scipy.sparse.csr_matrix:
    """
    Build a Hamiltonian with periodic boundary conditions.

    The kinetic energy uses a second-order finite difference stencil
    with wrap-around at both ends: ψ[0] connects to ψ[N-1] and vice versa.
    This makes the domain a ring — a particle exiting the right edge
    re-enters from the left with no reflection.

    Used for: free potential only.
    """
    N  = len(x)
    dx = x[1] - x[0]

    coeff = -(hbar ** 2) / (2.0 * mass * dx ** 2)

    diag      = np.full(N, -2.0 * coeff, dtype=complex)
    off_diag  = np.full(N - 1, coeff, dtype=complex)

    H = (
        scipy.sparse.diags(diag,     0, format="lil") +
        scipy.sparse.diags(off_diag, 1, format="lil") +
        scipy.sparse.diags(off_diag,-1, format="lil")
    )

    # Periodic wrap-around: connect last point to first
    H[0, N - 1] = coeff
    H[N - 1, 0] = coeff

    H += scipy.sparse.diags(V.astype(complex), 0, format="lil")

    return H.tocsr()


def _build_absorbing_hamiltonian(x: np.ndarray, V: np.ndarray,
                                   hbar: float = 1.0, mass: float = 1.0,
                                   cap_x_inner: float = 10.0,
                                   cap_strength: float = 20.0
                                   ) -> scipy.sparse.csr_matrix:
    """
    Build a Hamiltonian with Complex Absorbing Potential (CAP) boundaries.

    Uses standard (non-periodic) finite differences for the kinetic energy,
    so there is no wrap-around.  The CAP layer at each edge smoothly damps
    the wave to zero without reflecting it back into the domain.

    The effective potential is:
        V_eff(x) = V(x) - i·W(x)

    where W(x) is the real, non-negative CAP profile built by _build_cap().

    Used for: barrier and step potentials.
    """
    N  = len(x)
    dx = x[1] - x[0]

    coeff    = -(hbar ** 2) / (2.0 * mass * dx ** 2)
    diag     = np.full(N, -2.0 * coeff, dtype=complex)
    off_diag = np.full(N - 1, coeff, dtype=complex)

    H = (
        scipy.sparse.diags(diag,     0, format="lil") +
        scipy.sparse.diags(off_diag, 1, format="lil") +
        scipy.sparse.diags(off_diag,-1, format="lil")
    )

    # Build complex effective potential: V_real - i*W
    W     = _build_cap(x, cap_x_inner=cap_x_inner, cap_strength=cap_strength)
    V_eff = V.astype(complex) - 1j * W

    H += scipy.sparse.diags(V_eff, 0, format="lil")

    return H.tocsr()


# ---------------------------------------------------------------------------
# Crank-Nicolson time step
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
    - Unitary for real H: preserves norm ||ψ|| = 1 exactly (up to floating point)
    - With CAP (complex H): norm decreases as probability is absorbed — correct physics

    NOTE: With absorbing BCs the norm is intentionally NOT conserved —
    probability is removed as the wave enters the CAP region.
    renorm_every is therefore ignored for absorbing boundaries.

    Parameters
    ----------
    psi      : np.ndarray (complex128) — current wave function ψ(t), shape (N,)
    H_sparse : scipy.sparse.csr_matrix — Hamiltonian matrix (sparse CSR)
    dt       : float                   — time step Δt
    hbar     : float                   — reduced Planck constant

    Returns
    -------
    psi_next : np.ndarray (complex128) — wave function at t + Δt
    """
    N = len(psi)
    I = scipy.sparse.identity(N, format='csr', dtype=complex)

    alpha = 1j * dt / (2.0 * hbar)
    A = I + alpha * H_sparse
    B = I - alpha * H_sparse

    rhs = B @ psi
    psi_next = scipy.sparse.linalg.spsolve(A, rhs)
    return psi_next


# ---------------------------------------------------------------------------
# Main time propagator
# ---------------------------------------------------------------------------

def evolve(psi0: np.ndarray, x: np.ndarray, V: np.ndarray,
           t_end: float, dt: float,
           hbar: float = 1.0, mass: float = 1.0,
           store_every: int = 1,
           boundary: str = "dirichlet",
           renorm_every: int = 100,
           cap_x_inner: float = 10.0):
    """
    Propagate ψ from t=0 to t=t_end using the Crank-Nicolson method.

    Parameters
    ----------
    psi0         : np.ndarray (complex) — initial wave function ψ(x, 0)
    x            : np.ndarray          — uniform spatial grid
    V            : np.ndarray          — potential energy V(x) (time-independent)
    t_end        : float               — total evolution time
    dt           : float               — time step
    hbar         : float
    mass         : float
    store_every  : int                 — store snapshot every n steps
    boundary     : str                 — "periodic"  (free — transparent ring domain)
                                         "absorbing" (barrier/step — CAP, wave disappears at edges)
                                         "dirichlet" (wall — ψ=0 at boundaries, hard reflection)
    renorm_every : int                 — correct floating-point norm drift every n steps.
                                         Only applied for periodic/dirichlet BCs.
                                         Ignored for absorbing BCs (norm decay is physical).

    Returns
    -------
    snapshots : list of np.ndarray (complex) — ψ(x, tₙ) at recorded times
    times     : list of float               — corresponding time values

    Notes
    -----
    Periodic BCs (free only)
        Domain is a ring. A wave exiting one edge re-enters from the other
        with no reflection. Suitable for observing free dispersion.

    Absorbing BCs (barrier / step)
        A Complex Absorbing Potential (CAP) layer occupies the outer 15 % of
        the domain on each side. The wave is smoothly damped to zero as it
        enters this region — it neither reflects nor wraps around.
        The norm decreases as probability is absorbed; this is physical and
        correct. renorm_every is ignored.

    Dirichlet BCs (wall only)
        ψ = 0 enforced at both grid endpoints. Combined with the thick high-V
        layer built by build_potential(), the wave reflects fully from both
        edges and forms standing-wave interference patterns.

    Norm conservation
        Periodic/Dirichlet: renormalize every `renorm_every` steps to correct
        accumulated floating-point drift (correction ≈ 1e-12 per 100 steps).
        Absorbing: no renormalization — norm decay is real absorbed probability.
    """
    if boundary == "periodic":
        H = _build_periodic_hamiltonian(x, V, hbar=hbar, mass=mass)
    elif boundary == "absorbing":
        H = _build_absorbing_hamiltonian(x, V, hbar=hbar, mass=mass,
                                          cap_x_inner=cap_x_inner)
    else:
        # dirichlet
        H = hamiltonian_sparse(x, V, hbar=hbar, mass=mass)

    psi = psi0.astype(complex).copy()
    initial_norm = np.sqrt(np.sum(np.abs(psi) ** 2))

    snapshots = [psi.copy()]
    times     = [0.0]

    n_steps = int(np.ceil(t_end / dt))

    for step in range(1, n_steps + 1):
        psi = crank_nicolson_step(psi, H, dt, hbar=hbar)

        # For periodic/dirichlet BCs only: correct floating-point drift.
        # For absorbing BCs norm decay is physical — do NOT renormalize.
        if boundary != "absorbing" and renorm_every > 0 and step % renorm_every == 0:
            current_norm = np.sqrt(np.sum(np.abs(psi) ** 2))
            if current_norm > 1e-15:
                psi = psi * (initial_norm / current_norm)

        if step % store_every == 0:
            snapshots.append(psi.copy())
            times.append(round(step * dt, 6))

    return snapshots, times


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------

def norm(psi: np.ndarray, x: np.ndarray) -> float:
    """
    Compute ∫|ψ(x)|² dx.

    Should remain ≈ 1.0 throughout time evolution for periodic/dirichlet BCs.
    For absorbing BCs, decreases as probability is absorbed — this is correct.
    """
    return float(np.trapezoid(np.abs(psi) ** 2, x))


def energy_expectation(psi: np.ndarray, H_sparse: scipy.sparse.csr_matrix) -> float:
    """
    Compute the energy expectation value <E> = <ψ|H|ψ>.

    For a stationary state ψₙ, this returns exactly Eₙ.
    For a superposition, it returns the weighted average of energies.
    """
    return float(np.real(np.conj(psi) @ (H_sparse @ psi)))


def transmission_coefficient(psi: np.ndarray, x: np.ndarray,
                               x_barrier_right: float) -> float:
    """
    Estimate the transmission probability T = P(x > x_barrier_right).

    T = ∫_{x_barrier_right}^{∞} |ψ(x)|² dx
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
    """
    mask = x < x_barrier_left
    dx = x[1] - x[0]
    return float(np.sum(np.abs(psi[mask]) ** 2) * dx)


def validate_tise(energies_numerical: np.ndarray, L: float,
                  hbar: float = 1.0, mass: float = 1.0) -> dict:
    """
    Validate TISE numerical results against analytical infinite well energies.

    Computes relative error between numerical and analytical energy levels.
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
        "x":           x.tolist(),
        "V":           V.tolist(),
        "energies":    energies.tolist(),
        "eigenstates": eigenstates,
    }