// types.ts
export interface SimulationParams {
  coefficients: number[];
  x_left: number;
  x_right: number;
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

export interface SimulationResult {
  x: number[];
  V: number[];
  times: number[];
  frames: Frame[];
  n_frames: number;
  energies: number[];
  coefficients: number[];
  t_end: number;
  well_width: number;
}

export type PlaybackSpeed = 0.1 | 0.5 | 1 | 2 | 5;