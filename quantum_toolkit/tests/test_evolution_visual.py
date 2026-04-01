"""
test_evolution_visual.py
------------------------
Script de test visuel pour evolution.py + operators.py + potentials.py.
Lance ce script pour voir l'évolution temporelle du paquet d'onde
avant de brancher React.

Usage:
    cd quantum_toolkit
    python tests/test_evolution_visual.py
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.wavefunctions import gaussian_wave_packet
from core.potentials import free_particle, potential_barrier, potential_step, harmonic_oscillator
from core.evolution import evolve, norm, transmission_coefficient, reflection_coefficient

# ---------------------------------------------------------------------------
# Paramètres
# ---------------------------------------------------------------------------

x     = np.linspace(-10, 10, 512)
x0    = -4.0    # paquet part de la gauche
sigma = 0.8
k0    = 4.0     # momentum vers la droite
t_end = 15.0
dt    = 0.005
store_every = 10

# Choix du potentiel — change cette ligne pour tester différents cas
# V = free_particle(x)
# V = potential_step(x, x_step=0.0, V0=5.0)
# V = harmonic_oscillator(x, omega=1.0, x0=0.0)
V = potential_barrier(x, x_left=-0.5, x_right=0.5, V0=8.0)

# ---------------------------------------------------------------------------
# Calcul
# ---------------------------------------------------------------------------

print("Calcul de l'évolution temporelle (Crank-Nicolson)...")
psi0 = gaussian_wave_packet(x, x0=x0, sigma=sigma, k0=k0)
snapshots, times = evolve(psi0, x, V, t_end=t_end, dt=dt, store_every=store_every)
print(f"  {len(snapshots)} frames générées sur {t_end}s")

# Vérification norme sur première et dernière frame
norm_init = norm(snapshots[0], x)
norm_final = norm(snapshots[-1], x)
print(f"  Norme initiale  : {norm_init:.6f}  (doit être ≈ 1.0)")
print(f"  Norme finale    : {norm_final:.6f}  (doit être ≈ 1.0)")

# Coefficients T et R sur la frame finale
T = transmission_coefficient(snapshots[-1], x, x_barrier_right=0.5)
R = reflection_coefficient(snapshots[-1], x, x_barrier_left=-0.5)
print(f"  Transmission T  : {T:.4f}")
print(f"  Réflexion    R  : {R:.4f}")
print(f"  T + R           : {T+R:.4f}  (doit être ≈ 1.0)")

# ---------------------------------------------------------------------------
# Animation matplotlib
# ---------------------------------------------------------------------------

print("\nLancement de l'animation...")

fig, axes = plt.subplots(2, 1, figsize=(10, 7), sharex=True)

# Axe 0 — densité de probabilité
ax0 = axes[0]
V_scaled = V / (np.max(V[V < 1e5]) + 1e-10) * np.max(np.abs(snapshots[0])**2) * 0.8
ax0.fill_between(x, V_scaled, alpha=0.2, color='red', label='V(x)')
line_prob, = ax0.plot(x, np.abs(snapshots[0])**2, color='#00aaff', linewidth=2, label=r'$|\psi(x,t)|^2$')
fill_prob = ax0.fill_between(x, np.abs(snapshots[0])**2, alpha=0.15, color='#00aaff')
ax0.set_ylabel(r'$|\psi(x,t)|^2$', fontsize=12)
ax0.set_ylim(bottom=0)
ax0.legend(loc='upper right', fontsize=10)
ax0.grid(True, alpha=0.3)
title = ax0.set_title(f't = 0.000', fontsize=12)

# Axe 1 — parties réelle et imaginaire
ax1 = axes[1]
line_re, = ax1.plot(x, np.real(snapshots[0]), color='#00cc88', linewidth=1.8, label=r'Re($\psi$)')
line_im, = ax1.plot(x, np.imag(snapshots[0]), color='#ffaa00', linewidth=1.8, linestyle='--', label=r'Im($\psi$)')
ax1.axhline(0, color='gray', linewidth=0.8, alpha=0.5)
ax1.set_ylabel(r'$\psi(x,t)$', fontsize=12)
ax1.set_xlabel('x', fontsize=12)
ax1.legend(loc='upper right', fontsize=10)
ax1.grid(True, alpha=0.3)

fig.suptitle('Évolution temporelle — Crank-Nicolson', fontsize=13)
fig.tight_layout()

def update(frame):
    psi = snapshots[frame]
    prob = np.abs(psi)**2

    line_prob.set_ydata(prob)
    line_re.set_ydata(np.real(psi))
    line_im.set_ydata(np.imag(psi))
    title.set_text(f't = {times[frame]:.3f}')

    # Refresh fill
    global fill_prob
    fill_prob.remove()
    fill_prob = ax0.fill_between(x, prob, alpha=0.15, color='#00aaff')

    return line_prob, line_re, line_im

anim = animation.FuncAnimation(
    fig, update,
    frames=len(snapshots),
    interval=40,
    blit=False,
)

plt.show()