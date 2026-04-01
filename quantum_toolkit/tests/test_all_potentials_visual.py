"""
test_all_potentials_visual.py
-----------------------------
Test visuel pour les 4 potentiels de time evolution :
    1. Free particle   — paquet libre qui s'étale
    2. Barrier         — effet tunnel (barrière rectangulaire)
    3. Step            — réflexion/transmission sur une marche
    4. Harmonic        — oscillateur harmonique

Usage:
    cd quantum_toolkit
    python tests/test_all_potentials_visual.py
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.wavefunctions import gaussian_wave_packet
from core.potentials import (
    free_particle, potential_barrier,
    potential_step, harmonic_oscillator,
)
from core.evolution import (
    evolve, norm,
    transmission_coefficient, reflection_coefficient,
)

# ---------------------------------------------------------------------------
# Paramètres communs
# ---------------------------------------------------------------------------

N           = 512
x           = np.linspace(-10, 10, N)
x0          = -4.0
sigma       = 0.8
k0          = 4.0
t_end       = 3.0
dt          = 0.005
store_every = 10

# ---------------------------------------------------------------------------
# Définition des 4 cas
# ---------------------------------------------------------------------------

cases = [
    {
        "name":    "Free particle",
        "label":   "V(x) = 0 — paquet libre",
        "V":       free_particle(x),
        "color":   "#2563EB",
        "V_color": None,
    },
    {
        "name":    "Rectangular barrier",
        "label":   "Effet tunnel — barrière V₀ = 8",
        "V":       potential_barrier(x, x_left=-0.5, x_right=0.5, V0=8.0),
        "color":   "#7C3AED",
        "V_color": "#DC2626",
        "x_left":  -0.5,
        "x_right":  0.5,
    },
    {
        "name":    "Potential step",
        "label":   "Marche de potentiel V₀ = 5",
        "V":       potential_step(x, x_step=0.0, V0=5.0),
        "color":   "#059669",
        "V_color": "#D97706",
        "x_step":   0.0,
    },
    {
        "name":    "Harmonic oscillator",
        "label":   "Oscillateur harmonique ω = 1",
        "V":       harmonic_oscillator(x, omega=1.0, x0=0.0),
        "color":   "#DB2777",
        "V_color": "#92400E",
        "x0_harm":  0.0,
    },
]

# ---------------------------------------------------------------------------
# Calcul de l'évolution pour chaque cas
# ---------------------------------------------------------------------------

print("Calcul des 4 évolutions temporelles...")
for i, case in enumerate(cases):
    print(f"  [{i+1}/4] {case['name']}...")
    psi0 = gaussian_wave_packet(x, x0=x0, sigma=sigma, k0=k0)
    snapshots, times = evolve(
        psi0, x, case["V"],
        t_end=t_end, dt=dt, store_every=store_every
    )
    case["snapshots"] = snapshots
    case["times"]     = times

    # Diagnostics
    norm_init  = norm(snapshots[0], x)
    norm_final = norm(snapshots[-1], x)
    case["norm_init"]  = norm_init
    case["norm_final"] = norm_final

    # T et R pour barrière et marche
    if case["name"] == "Rectangular barrier":
        T = transmission_coefficient(snapshots[-1], x, x_barrier_right=0.5)
        R = reflection_coefficient(snapshots[-1], x, x_barrier_left=-0.5)
        case["T"] = T
        case["R"] = R
    elif case["name"] == "Potential step":
        T = transmission_coefficient(snapshots[-1], x, x_barrier_right=0.0)
        R = reflection_coefficient(snapshots[-1], x, x_barrier_left=0.0)
        case["T"] = T
        case["R"] = R

print("  Terminé.\n")

# ---------------------------------------------------------------------------
# Résumé terminal
# ---------------------------------------------------------------------------

print("=" * 60)
print("RÉSUMÉ")
print("=" * 60)
for case in cases:
    print(f"\n  {case['name']}")
    print(f"  {case['label']}")
    print(f"  Norme initiale  : {case['norm_init']:.6f}")
    print(f"  Norme finale    : {case['norm_final']:.6f}")
    if "T" in case:
        print(f"  Transmission T  : {case['T']:.4f}")
        print(f"  Réflexion    R  : {case['R']:.4f}")
        print(f"  T + R           : {case['T'] + case['R']:.4f}")
print()

# ---------------------------------------------------------------------------
# Figure statique — état initial + état final pour les 4 cas
# ---------------------------------------------------------------------------

fig, axes = plt.subplots(2, 4, figsize=(18, 8))
fig.suptitle("Time Evolution — 4 potentiels  |  État initial (haut) vs final (bas)", fontsize=14)

for i, case in enumerate(cases):
    psi_init  = case["snapshots"][0]
    psi_final = case["snapshots"][-1]
    V_disp    = np.clip(case["V"], 0, 12)

    # --- Initial state ---
    ax_top = axes[0, i]
    ax_top.plot(x, np.abs(psi_init)**2, color=case["color"], linewidth=2, label="|ψ₀|²")
    ax_top.fill_between(x, np.abs(psi_init)**2, alpha=0.15, color=case["color"])
    if case["V_color"]:
        ax2 = ax_top.twinx()
        ax2.plot(x, V_disp, color=case["V_color"], linewidth=1.5, linestyle="--", alpha=0.7)
        ax2.set_ylim(0, 20)
        ax2.set_yticks([])
    ax_top.set_title(f"{case['name']}\nt = 0.000", fontsize=10)
    ax_top.set_xlim(-10, 10)
    ax_top.set_ylim(bottom=0)
    ax_top.grid(True, alpha=0.3)
    ax_top.set_xlabel("x")
    ax_top.set_ylabel("|ψ|²")

    # --- Final state ---
    ax_bot = axes[1, i]
    ax_bot.plot(x, np.abs(psi_final)**2, color=case["color"], linewidth=2, label="|ψ_f|²")
    ax_bot.fill_between(x, np.abs(psi_final)**2, alpha=0.15, color=case["color"])
    if case["V_color"]:
        ax3 = ax_bot.twinx()
        ax3.plot(x, V_disp, color=case["V_color"], linewidth=1.5, linestyle="--", alpha=0.7)
        ax3.set_ylim(0, 20)
        ax3.set_yticks([])
    t_final = case["times"][-1]
    extra = ""
    if "T" in case:
        extra = f"\nT={case['T']:.3f}  R={case['R']:.3f}  T+R={case['T']+case['R']:.3f}"
    ax_bot.set_title(f"t = {t_final:.3f}{extra}", fontsize=10)
    ax_bot.set_xlim(-10, 10)
    ax_bot.set_ylim(bottom=0)
    ax_bot.grid(True, alpha=0.3)
    ax_bot.set_xlabel("x")
    ax_bot.set_ylabel("|ψ|²")

plt.tight_layout()
plt.show()

# ---------------------------------------------------------------------------
# Animation — les 4 cas en parallèle
# ---------------------------------------------------------------------------

print("Lancement de l'animation (4 panneaux)...")

fig2, axes2 = plt.subplots(1, 4, figsize=(18, 4))
fig2.suptitle("Animation — 4 potentiels simultanément", fontsize=13)

lines  = []
fills  = []
titles = []

for i, case in enumerate(cases):
    ax = axes2[i]
    psi0 = case["snapshots"][0]
    V_disp = np.clip(case["V"], 0, 12)

    if case["V_color"]:
        ax2 = ax.twinx()
        ax2.plot(x, V_disp, color=case["V_color"], linewidth=1.2,
                 linestyle="--", alpha=0.6, label="V(x)")
        ax2.set_ylim(0, 20)
        ax2.set_yticks([])

    line, = ax.plot(x, np.abs(psi0)**2, color=case["color"], linewidth=2)
    fill  = ax.fill_between(x, np.abs(psi0)**2, alpha=0.15, color=case["color"])
    title = ax.set_title(f"{case['name']}\nt = 0.000", fontsize=10)

    ax.set_xlim(-10, 10)
    ax.set_ylim(bottom=0, top=max(np.max(np.abs(s)**2) for s in case["snapshots"]) * 1.2)
    ax.set_xlabel("x")
    ax.grid(True, alpha=0.3)

    lines.append(line)
    fills.append(fill)
    titles.append(title)

n_frames_min = min(len(c["snapshots"]) for c in cases)

def update(frame):
    global fills
    for i, case in enumerate(cases):
        psi = case["snapshots"][frame]
        prob = np.abs(psi)**2
        lines[i].set_ydata(prob)
        fills[i].remove()
        fills[i] = axes2[i].fill_between(x, prob, alpha=0.15, color=case["color"])
        titles[i].set_text(f"{case['name']}\nt = {case['times'][frame]:.3f}")
    return lines

anim = animation.FuncAnimation(
    fig2, update,
    frames=n_frames_min,
    interval=40,
    blit=False,
)

fig2.tight_layout()
plt.show()