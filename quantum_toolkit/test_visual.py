import numpy as np
import matplotlib.pyplot as plt
from core.wavefunctions import gaussian_wave_packet, probability_density, fourier_transform, uncertainty_position, uncertainty_momentum

# Grille spatiale
x = np.linspace(-10, 10, 512)

# Construire un paquet d'onde
psi = gaussian_wave_packet(x, x0=0.0, sigma=1.0, k0=3.0)

# Transformée de Fourier
k, psi_k = fourier_transform(psi, x)

# Incertitudes
sx = uncertainty_position(psi, x)
sk = uncertainty_momentum(psi, x)
print(f"σ_x = {sx:.4f}")
print(f"σ_k = {sk:.4f}")
print(f"σ_x · σ_k = {sx * sk:.4f}  (doit être ≥ 0.5)")

# Affichage
fig, axes = plt.subplots(2, 2, figsize=(12, 8))

axes[0,0].plot(x, np.real(psi), color='green', label='Re(ψ)')
axes[0,0].plot(x, np.imag(psi), color='orange', linestyle='--', label='Im(ψ)')
axes[0,0].set_title('Re(ψ) et Im(ψ)')
axes[0,0].legend()
axes[0,0].grid(True, alpha=0.3)

axes[0,1].plot(x, probability_density(psi), color='blue')
axes[0,1].fill_between(x, probability_density(psi), alpha=0.2, color='blue')
axes[0,1].set_title('Densité de probabilité |ψ|²')
axes[0,1].grid(True, alpha=0.3)

axes[1,0].plot(k, np.abs(psi_k)**2, color='purple')
axes[1,0].fill_between(k, np.abs(psi_k)**2, alpha=0.2, color='purple')
axes[1,0].set_title('Espace des moments |ψ̃(k)|²')
axes[1,0].set_xlim(-10, 10)
axes[1,0].grid(True, alpha=0.3)

axes[1,1].plot(x, np.real(psi), color='green', alpha=0.5)
axes[1,1].plot(x, np.abs(psi), color='black', linestyle='--', label='|ψ| (enveloppe)')
axes[1,1].set_title('Enveloppe gaussienne')
axes[1,1].legend()
axes[1,1].grid(True, alpha=0.3)

plt.suptitle(f'Paquet d\'onde gaussien  —  σ_x·σ_k = {sx*sk:.3f} ≥ 0.5', fontsize=13)
plt.tight_layout()
plt.show()