// Potential types — "harmonic" removed per spec.
// "wall" is now a first-class potential (infinite/very-high barrier at edges),
// distinct from "barrier" (finite, tunneling-capable, centred barrier).
export type Potential = "free" | "barrier" | "step" | "wall";

export type Speed = 0.1 | 0.5 | 1 | 2 | 5;

// TunnelingMode is kept for backward-compat but is no longer needed
// now that "wall" is its own Potential. Kept so existing imports don't break.
export type TunnelingMode = "tunneling" | "wall";

export interface EvolveRequest {
  x0: number;
  sigma: number;
  k0: number;
  potential: Potential;
  V0: number;
  barrier_left: number;
  barrier_right: number;
  amplitude: number;  // pure vertical scale — applied server-side to psi0
  t_end: number;
  dt: number;
  store_every: number;
  x_min: number;
  x_max: number;
  N: number;
}

export interface Frame {
  real: number[];
  imag: number[];
  prob: number[];
}

export interface EvolveResponse {
  x: number[];
  V: number[];
  times: number[];
  frames: Frame[];
  n_frames: number;
  dt: number;
  t_end: number;
}