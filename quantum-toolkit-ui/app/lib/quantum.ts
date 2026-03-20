// ─── Quantum mechanics engine (pure TypeScript) ───────────────────────────
// Mirrors the Python core/ engine so the frontend can run simulations
// client-side without a backend call.

export type ComplexArray = { re: Float64Array; im: Float64Array };

/** Create a grid of N points from a to b */
export function linspace(a: number, b: number, N: number): Float64Array {
  const x = new Float64Array(N);
  const step = (b - a) / (N - 1);
  for (let i = 0; i < N; i++) x[i] = a + i * step;
  return x;
}

/** Gaussian wave packet — returns complex array */
export function gaussianWavepacket(
  x: Float64Array,
  x0: number,
  k0: number,
  sigma: number
): ComplexArray {
  const N = x.length;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let norm = 0;

  for (let i = 0; i < N; i++) {
    const env = Math.exp(-((x[i] - x0) ** 2) / (4 * sigma ** 2));
    re[i] = env * Math.cos(k0 * x[i]);
    im[i] = env * Math.sin(k0 * x[i]);
    norm += re[i] ** 2 + im[i] ** 2;
  }

  const dx = x[1] - x[0];
  norm = Math.sqrt(norm * dx);
  for (let i = 0; i < N; i++) { re[i] /= norm; im[i] /= norm; }
  return { re, im };
}

/** |ψ|² probability density */
export function probDensity(psi: ComplexArray): Float64Array {
  const N = psi.re.length;
  const p = new Float64Array(N);
  for (let i = 0; i < N; i++) p[i] = psi.re[i] ** 2 + psi.im[i] ** 2;
  return p;
}

/** Potential presets */
export function potentialFree(x: Float64Array): Float64Array {
  return new Float64Array(x.length);
}

export function potentialBarrier(
  x: Float64Array,
  xStart: number,
  xEnd: number,
  V0: number
): Float64Array {
  const V = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    if (x[i] >= xStart && x[i] <= xEnd) V[i] = V0;
  }
  return V;
}

export function potentialWell(
  x: Float64Array,
  L: number,
  V0: number
): Float64Array {
  const V = new Float64Array(x.length).fill(V0);
  for (let i = 0; i < x.length; i++) {
    if (x[i] >= 0 && x[i] <= L) V[i] = 0;
  }
  return V;
}

export function potentialStep(
  x: Float64Array,
  xPos: number,
  V0: number
): Float64Array {
  const V = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    if (x[i] >= xPos) V[i] = V0;
  }
  return V;
}

export function potentialHarmonic(
  x: Float64Array,
  x0: number,
  omega: number
): Float64Array {
  const V = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    V[i] = 0.5 * omega ** 2 * (x[i] - x0) ** 2;
  }
  return V;
}

/**
 * Crank-Nicolson time step (tridiagonal solve via Thomas algorithm).
 * Avoids full matrix — O(N) per step, stable for any dt.
 */
export function crankNicolsonStep(
  psi: ComplexArray,
  V: Float64Array,
  dt: number,
  dx: number,
  hbar = 1.0,
  m = 1.0
): ComplexArray {
  const N = psi.re.length;
  const r = hbar * dt / (4 * m * dx * dx);
  const re_out = new Float64Array(N);
  const im_out = new Float64Array(N);

  // Build RHS: b = (I + i·H·dt/2)·psi  (using tridiagonal structure)
  const rhs_re = new Float64Array(N);
  const rhs_im = new Float64Array(N);

  for (let i = 1; i < N - 1; i++) {
    const vdt = V[i] * dt / (2 * hbar);
    // real part of RHS
    rhs_re[i] = psi.re[i] + r * (psi.im[i + 1] - 2 * psi.im[i] + psi.im[i - 1]) - vdt * psi.im[i];
    // imag part of RHS
    rhs_im[i] = psi.im[i] - r * (psi.re[i + 1] - 2 * psi.re[i] + psi.re[i - 1]) + vdt * psi.re[i];
  }

  // Thomas algorithm for tridiagonal system (I - i·H·dt/2)·psi_next = rhs
  // Diagonal: 1 + 2r (real), off-diagonal: -r (real), coupling via i
  // Solve as complex tridiagonal
  const c_re = new Float64Array(N);
  const c_im = new Float64Array(N);
  const d_re = new Float64Array(N);
  const d_im = new Float64Array(N);

  // Forward sweep
  const diag_re0 = 1 + 2 * r;
  const diag_im0 = V[1] * dt / (2 * hbar);
  let denom = diag_re0 * diag_re0 + diag_im0 * diag_im0;
  c_re[1] = (-r * diag_re0) / denom;
  c_im[1] = (r * diag_im0) / denom;
  d_re[1] = (rhs_re[1] * diag_re0 + rhs_im[1] * diag_im0) / denom;
  d_im[1] = (rhs_im[1] * diag_re0 - rhs_re[1] * diag_im0) / denom;

  for (let i = 2; i < N - 1; i++) {
    const vdt_i = V[i] * dt / (2 * hbar);
    // w = diag - (-r)*c[i-1] ... simplified
    const w_re = (1 + 2 * r) - (-r) * c_re[i - 1];
    const w_im = vdt_i - (-r) * c_im[i - 1];
    denom = w_re * w_re + w_im * w_im;
    if (denom < 1e-30) continue;
    c_re[i] = (-r * w_re) / denom;
    c_im[i] = (r * w_im) / denom;
    const rr = rhs_re[i] - (-r) * d_re[i - 1];
    const ri = rhs_im[i] - (-r) * d_im[i - 1];
    d_re[i] = (rr * w_re + ri * w_im) / denom;
    d_im[i] = (ri * w_re - rr * w_im) / denom;
  }

  // Back substitution
  re_out[N - 1] = 0; im_out[N - 1] = 0;
  re_out[0] = 0; im_out[0] = 0;
  for (let i = N - 2; i >= 1; i--) {
    re_out[i] = d_re[i] - c_re[i] * re_out[i + 1] + c_im[i] * im_out[i + 1];
    im_out[i] = d_im[i] - c_re[i] * im_out[i + 1] - c_im[i] * re_out[i + 1];
  }

  // Renormalize
  let norm = 0;
  for (let i = 0; i < N; i++) norm += re_out[i] ** 2 + im_out[i] ** 2;
  norm = Math.sqrt(norm * dx);
  if (norm < 1e-12) norm = 1;
  for (let i = 0; i < N; i++) { re_out[i] /= norm; im_out[i] /= norm; }

  return { re: re_out, im: im_out };
}

/** Compute norm ∫|ψ|²dx */
export function computeNorm(psi: ComplexArray, dx: number): number {
  let s = 0;
  for (let i = 0; i < psi.re.length; i++) s += psi.re[i] ** 2 + psi.im[i] ** 2;
  return Math.sqrt(s * dx);
}

/** Analytical energy levels for infinite square well */
export function infiniteWellEnergies(L: number, nMax: number, hbar = 1.0, m = 1.0): number[] {
  return Array.from({ length: nMax }, (_, i) => {
    const n = i + 1;
    return (n * n * Math.PI * Math.PI * hbar * hbar) / (2 * m * L * L);
  });
}

/** Simple finite-difference eigenvalues (power iteration approximation for display) */
export function approximateEigenvalues(
  V: Float64Array,
  dx: number,
  nStates: number,
  hbar = 1.0,
  m = 1.0
): number[] {
  // Return diagonal of H as energy estimate (rough, for display only)
  const t = hbar ** 2 / (2 * m * dx * dx);
  const diag = Array.from(V).map(v => 2 * t + v);
  diag.sort((a, b) => a - b);
  return diag.slice(0, nStates);
}

/** Transmission coefficient estimate from prob density at right edge */
export function transmissionCoeff(psi: ComplexArray, splitIdx: number): number {
  let totalRight = 0, total = 0;
  for (let i = 0; i < psi.re.length; i++) {
    const p = psi.re[i] ** 2 + psi.im[i] ** 2;
    total += p;
    if (i > splitIdx) totalRight += p;
  }
  return total < 1e-12 ? 0 : totalRight / total;
}
