"""
potentials.py
-------------
Potential energy functions for 1D quantum systems.

Each function takes a spatial grid (numpy array) and returns
the potential energy V(x) as a numpy array of the same shape.

All potentials are in natural units (ℏ = 1, m = 1, eV-scale energies).
Units: energy in eV-equivalent, length in arbitrary units.

Available potentials
--------------------
- free_particle          : V(x) = 0 everywhere
- infinite_square_well   : V = 0 inside [x_left, x_right], ∞ outside
- finite_square_well     : V = -V0 inside [x_left, x_right], 0 outside
- potential_barrier      : V = V0 inside [x_left, x_right], 0 outside
- potential_step         : V = 0 for x < x_step, V = V0 for x ≥ x_step
- harmonic_oscillator    : V(x) = ½ k (x - x0)²
- double_well            : V(x) = a(x² - b²)²
- kronig_penney          : periodic array of rectangular barriers
"""

import numpy as np


# ---------------------------------------------------------------------------
# Free particle
# ---------------------------------------------------------------------------

def free_particle(x: np.ndarray) -> np.ndarray:
    """
    Free particle — no potential anywhere.

    V(x) = 0

    This is the simplest case: a particle moving without any force.
    Useful as a baseline and for testing wave packet propagation.

    Parameters
    ----------
    x : np.ndarray — spatial grid

    Returns
    -------
    V : np.ndarray (float64) — zero array, same shape as x
    """
    return np.zeros_like(x, dtype=float)


# ---------------------------------------------------------------------------
# Square wells and barriers
# ---------------------------------------------------------------------------

def infinite_square_well(x: np.ndarray, x_left: float = -5.0, x_right: float = 5.0,
                          wall_height: float = 1e6) -> np.ndarray:
    """
    Infinite square well (particle in a box).

    V(x) = 0          for x_left ≤ x ≤ x_right
    V(x) = wall_height elsewhere  (approximates infinity numerically)

    This is the most fundamental quantum system. It produces
    discrete, quantized energy levels — the hallmark of quantum mechanics.
    Analytical energy levels: Eₙ = n²π²ℏ²/(2mL²), n = 1, 2, 3, ...

    Parameters
    ----------
    x          : np.ndarray — spatial grid
    x_left     : float      — left wall position
    x_right    : float      — right wall position
    wall_height: float      — numerical approximation of ∞ (default: 1e6)

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-10, 10, 512)
    >>> V = infinite_square_well(x, x_left=-5.0, x_right=5.0)
    """
    V = np.full_like(x, wall_height, dtype=float)
    inside = (x >= x_left) & (x <= x_right)
    V[inside] = 0.0
    return V


def finite_square_well(x: np.ndarray, x_left: float = -3.0, x_right: float = 3.0,
                        V0: float = 10.0) -> np.ndarray:
    """
    Finite square well.

    V(x) = -V0   for x_left ≤ x ≤ x_right   (attractive well)
    V(x) =  0    elsewhere

    Unlike the infinite well, the particle can tunnel into the walls.
    Only a finite number of bound states exist, depending on V0 and width.
    A key result: there is ALWAYS at least one bound state, no matter
    how shallow the well.

    Parameters
    ----------
    x      : np.ndarray — spatial grid
    x_left : float      — left edge of the well
    x_right: float      — right edge of the well
    V0     : float      — well depth (positive value; energy is -V0 inside)

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-10, 10, 512)
    >>> V = finite_square_well(x, x_left=-3.0, x_right=3.0, V0=10.0)
    """
    V = np.zeros_like(x, dtype=float)
    inside = (x >= x_left) & (x <= x_right)
    V[inside] = -V0
    return V


def potential_barrier(x: np.ndarray, x_left: float = -1.0, x_right: float = 1.0,
                       V0: float = 10.0) -> np.ndarray:
    """
    Rectangular potential barrier.

    V(x) = V0   for x_left ≤ x ≤ x_right
    V(x) = 0    elsewhere

    This is the canonical system for demonstrating quantum tunneling:
    a particle with energy E < V0 has a non-zero probability of
    passing through the barrier — classically impossible.

    The transmission coefficient T depends on barrier width and V0.

    Parameters
    ----------
    x      : np.ndarray — spatial grid
    x_left : float      — left edge of the barrier
    x_right: float      — right edge of the barrier
    V0     : float      — barrier height (positive)

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-10, 10, 512)
    >>> V = potential_barrier(x, x_left=-1.0, x_right=1.0, V0=10.0)
    """
    V = np.zeros_like(x, dtype=float)
    inside = (x >= x_left) & (x <= x_right)
    V[inside] = V0
    return V


def potential_step(x: np.ndarray, x_step: float = 0.0, V0: float = 5.0) -> np.ndarray:
    """
    Potential step.

    V(x) = 0    for x < x_step
    V(x) = V0   for x ≥ x_step

    Demonstrates both reflection and transmission at a boundary.
    If E > V0: partial reflection + partial transmission (quantum behavior).
    If E < V0: full reflection + exponential decay (evanescent wave).

    Parameters
    ----------
    x      : np.ndarray — spatial grid
    x_step : float      — position of the step
    V0     : float      — height of the step (can be negative for a drop)

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-10, 10, 512)
    >>> V = potential_step(x, x_step=0.0, V0=5.0)
    """
    V = np.zeros_like(x, dtype=float)
    V[x >= x_step] = V0
    return V


# ---------------------------------------------------------------------------
# Continuous potentials
# ---------------------------------------------------------------------------

def harmonic_oscillator(x: np.ndarray, omega: float = 1.0,
                         x0: float = 0.0, mass: float = 1.0) -> np.ndarray:
    """
    Quantum harmonic oscillator potential.

    V(x) = ½ m ω² (x - x0)²

    The harmonic oscillator is one of the most important systems in
    quantum mechanics. It has an infinite ladder of equally spaced
    energy levels: Eₙ = ℏω(n + ½), n = 0, 1, 2, ...

    The ground state is a Gaussian — exactly matching our wave packet.
    This system models molecular vibrations and many field theories.

    Parameters
    ----------
    x     : np.ndarray — spatial grid
    omega : float      — angular frequency ω (controls well curvature)
    x0    : float      — equilibrium position (centre of the well)
    mass  : float      — particle mass (default: 1 in natural units)

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-10, 10, 512)
    >>> V = harmonic_oscillator(x, omega=1.0, x0=0.0)
    """
    return 0.5 * mass * omega ** 2 * (x - x0) ** 2


def double_well(x: np.ndarray, a: float = 1.0, b: float = 2.0) -> np.ndarray:
    """
    Symmetric double well potential.

    V(x) = a · (x² - b²)²

    Creates two symmetric minima at x = ±b separated by a central barrier.
    Demonstrates quantum tunneling between two stable positions and
    is a model for molecular bonds and spontaneous symmetry breaking.

    Barrier height at x=0: V(0) = a · b⁴
    Well minima at x=±b:   V(±b) = 0

    Parameters
    ----------
    x : np.ndarray — spatial grid
    a : float      — overall energy scale (controls barrier height)
    b : float      — well separation (minima at ±b)

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-5, 5, 512)
    >>> V = double_well(x, a=0.5, b=2.0)
    """
    return a * (x ** 2 - b ** 2) ** 2


def kronig_penney(x: np.ndarray, V0: float = 10.0, barrier_width: float = 0.5,
                   period: float = 2.0) -> np.ndarray:
    """
    Kronig–Penney model: periodic array of rectangular barriers.

    Models the periodic potential experienced by electrons in a crystal lattice.
    Demonstrates the formation of energy bands and band gaps — the foundation
    of solid-state physics and semiconductor theory.

    The potential repeats with period `period`:
    V = V0 inside barriers, V = 0 in wells.

    Parameters
    ----------
    x             : np.ndarray — spatial grid
    V0            : float      — barrier height
    barrier_width : float      — width of each barrier (< period)
    period        : float      — spatial period of the lattice

    Returns
    -------
    V : np.ndarray (float64)

    Example
    -------
    >>> x = np.linspace(-10, 10, 1024)
    >>> V = kronig_penney(x, V0=10.0, barrier_width=0.5, period=2.0)
    """
    V = np.zeros_like(x, dtype=float)
    # Position within each period (0 to period)
    x_mod = x % period
    # Barrier occupies first barrier_width of each period
    in_barrier = x_mod < barrier_width
    V[in_barrier] = V0
    return V


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def potential_info(V: np.ndarray, x: np.ndarray) -> dict:
    """
    Return basic diagnostic information about a potential.

    Useful for debugging and for displaying metadata in the API response.

    Parameters
    ----------
    V : np.ndarray — potential energy array
    x : np.ndarray — spatial grid

    Returns
    -------
    dict with keys:
        V_min   : float — minimum potential value
        V_max   : float — maximum potential value (excluding wall approximations)
        x_min   : float — grid left boundary
        x_max   : float — grid right boundary
        N       : int   — number of grid points
        dx      : float — grid spacing
    """
    # Exclude numerical infinity approximations (wall_height = 1e6)
    finite_mask = V < 1e5
    V_finite = V[finite_mask] if finite_mask.any() else V

    return {
        "V_min": float(np.min(V_finite)),
        "V_max": float(np.max(V_finite)),
        "x_min": float(x[0]),
        "x_max": float(x[-1]),
        "N":     int(len(x)),
        "dx":    float(x[1] - x[0]),
    }


def combine_potentials(*potentials: np.ndarray) -> np.ndarray:
    """
    Combine multiple potentials by addition.

    V_total(x) = V₁(x) + V₂(x) + ...

    Useful for constructing complex potentials from simpler components,
    for example a harmonic trap with a barrier inside.

    Parameters
    ----------
    *potentials : np.ndarray — any number of potential arrays (same shape)

    Returns
    -------
    V : np.ndarray (float64) — element-wise sum

    Example
    -------
    >>> V = combine_potentials(harmonic_oscillator(x), potential_barrier(x))
    """
    result = np.zeros_like(potentials[0], dtype=float)
    for V in potentials:
        result = result + V
    return result