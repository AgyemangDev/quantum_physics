"""
test_infinite_well_visual.py
----------------------------
Script de test visuel pour le puits infini (TISE).
Vérifie solve_tise() et compare avec les solutions analytiques.

Usage:
    cd quantum_toolkit
    python tests/test_infinite_well_visual.py
"""

import numpy as np
import matplotlib.pyplot as plt
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.potentials import infinite_square_well
from core.evolution import solve_tise, analytical_infinite_well_energies

# ---------------------------------------------------------------------------
# Paramètres
# ---------------------------------------------------------------------------

x_left  = -5.0
x_right =  5.0
L       = x_right - x_left
N       = 512
n_states = 5

x = np.linspace(-10, 10, N)
V = infinite_square_well(x, x_left=x_left, x_right=x_right)

# ---------------------------------------------------------------------------
# Résolution TISE
# ---------------------------------------------------------------------------

print("Résolution TISE — puits infini...")
energies, wavefunctions = solve_tise(x, V, n_states=n_states)
analytical = analytical_infinite_well_energies(n_states, L)

print("\n  n  |  E_num      |  E_ana      |  Erreur relative")
print("  ---+-------------+-------------+-----------------")
for n in range(n_states):
    err = abs(energies[n] - analytical[n]) / analytical[n] * 100
    print(f"  {n+1}  |  {energies[n]:9.5f}  |  {analytical[n]:9.5f}  |  {err:.4f}%")

# ---------------------------------------------------------------------------
# Visualisation
# ---------------------------------------------------------------------------

fig, axes = plt.subplots(1, 3, figsize=(15, 6))
colors = plt.cm.plasma(np.linspace(0.15, 0.85, n_states))

# --- Panel 1 : Niveaux d'énergie ---
ax0 = axes[0]
V_display = np.clip(V, 0, max(analytical) * 1.3)
ax0.plot(x, V_display, 'k-', linewidth=2, label='V(x)', zorder=5)

scale = 0.35 * (analytical[1] - analytical[0])
for n in range(n_states):
    E_n  = energies[n]
    psi_n = wavefunctions[:, n]
    wf_scaled = scale * psi_n / np.max(np.abs(psi_n))

    ax0.axhline(E_n, color=colors[n], linewidth=1, linestyle='--', alpha=0.5)
    ax0.plot(x, E_n + wf_scaled, color=colors[n], linewidth=2, label=f'n={n+1}  E={E_n:.3f}')
    ax0.fill_between(x, E_n, E_n + wf_scaled, alpha=0.1, color=colors[n])

ax0.set_xlim(-7, 7)
ax0.set_ylim(-0.2, max(analytical) * 1.3)
ax0.set_xlabel('x', fontsize=12)
ax0.set_ylabel('Énergie', fontsize=12)
ax0.set_title('Fonctions propres ψₙ(x)\n(offset à leur énergie)', fontsize=12)
ax0.legend(fontsize=9, loc='upper right')
ax0.grid(True, alpha=0.3)

# --- Panel 2 : Densités de probabilité ---
ax1 = axes[1]
for n in range(n_states):
    prob = np.abs(wavefunctions[:, n]) ** 2
    ax1.plot(x, prob + energies[n], color=colors[n], linewidth=2, label=f'n={n+1}')
    ax1.fill_between(x, energies[n], prob + energies[n], alpha=0.15, color=colors[n])
    ax1.axhline(energies[n], color=colors[n], linewidth=0.8, linestyle='--', alpha=0.4)

ax1.set_xlim(-7, 7)
ax1.set_xlabel('x', fontsize=12)
ax1.set_ylabel('Énergie', fontsize=12)
ax1.set_title('Densités de probabilité |ψₙ|²\n(offset à leur énergie)', fontsize=12)
ax1.legend(fontsize=9)
ax1.grid(True, alpha=0.3)

# --- Panel 3 : Comparaison numérique vs analytique ---
ax2 = axes[2]
ns = np.arange(1, n_states + 1)
width = 0.35
ax2.bar(ns - width/2, energies,   width, label='Numérique', color='#2563EB', alpha=0.8)
ax2.bar(ns + width/2, analytical, width, label='Analytique', color='#DC2626', alpha=0.8)

for n in range(n_states):
    err = abs(energies[n] - analytical[n]) / analytical[n] * 100
    ax2.text(n + 1, max(energies[n], analytical[n]) + 0.05,
             f'{err:.3f}%', ha='center', fontsize=8, color='gray')

ax2.set_xlabel('Quantum number n', fontsize=12)
ax2.set_ylabel('Énergie', fontsize=12)
ax2.set_title('Numérique vs Analytique\n(erreur relative au-dessus)', fontsize=12)
ax2.legend(fontsize=10)
ax2.grid(True, alpha=0.3, axis='y')
ax2.set_xticks(ns)

fig.suptitle(f'Puits infini — L = {L} — {n_states} états propres', fontsize=14)
plt.tight_layout()
plt.show()