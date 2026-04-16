"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { EvolveResponse, Potential, Speed } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Fetch hook ───────────────────────────────────────────────────────────────

export function useEvolve() {
  const [data,    setData]    = useState<EvolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const compute = useCallback(async (params: {
    x0:           number;
    sigma:        number;
    k0:           number;
    potential:    Potential;
    V0:           number;
    barrier_width: number;
    amplitude:    number;   // vertical scale — passed straight to backend
    tEnd:         number;
  }) => {
    setLoading(true);
    setError(null);

    const halfW = params.barrier_width / 2;

    // Boundary condition selection:
    //   free  → periodic (wave circulates, zero reflections)
    //   wall  → dirichlet with high V0 at edges (hard wall reflection)
    //   others → dirichlet (Crank-Nicolson in a box)
    const boundary =
      params.potential === "free" ? "periodic" : "dirichlet";

    // For "wall" potential, use a very large V0 to approximate an infinite wall
    // (hard-coded here so the user-facing V0 slider still controls barrier height
    //  for the barrier/step cases — wall always means hard wall).
    const V0 =
  params.potential === "wall" ? 0 : params.V0;

    // Barrier edges: for step potential the "left edge" is 0 (step starts at centre)
    const barrier_left  = params.potential === "step" ? 0.0 : -halfW;
    const barrier_right = params.potential === "step" ? 0.1 :  halfW; // thin step edge

    try {
      const res = await fetch(`${API}/evolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x0:            params.x0,
          sigma:         params.sigma,   // ← width only, NOT scaled by amplitude
          k0:            params.k0,
          potential:     params.potential,
          V0,
          barrier_left,
          barrier_right,
          amplitude:     params.amplitude, // backend applies this to psi0 peak
          t_end:         params.tEnd,
          dt:            0.005,
          store_every:   10,
          x_min:        -10,
          x_max:         10,
          N:             512,
          boundary,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(detail || `API error ${res.status}`);
      }
      setData(await res.json());
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, compute };
}

// ─── Animation hook ───────────────────────────────────────────────────────────

export function useAnimation(data: EvolveResponse | null) {
  const [frame,   setFrame]   = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed,   setSpeed]   = useState<Speed>(1);

  const rafRef     = useRef<number | null>(null);
  // lastTsRef = previous RAF timestamp (ms); 0 means "not yet started"
  const lastTsRef  = useRef<number>(0);
  // simTimeRef = accumulated simulation time (s)
  const simTimeRef = useRef<number>(0);
  // frameRef = mutable mirror of frame state so tick() can read it without stale closure
  const frameRef   = useRef<number>(0);

  // Keep frameRef in sync with state
  useEffect(() => { frameRef.current = frame; }, [frame]);

  // Reset when new data arrives
  useEffect(() => {
    setFrame(0);
    setPlaying(false);
    simTimeRef.current = 0;
    lastTsRef.current  = 0;
    frameRef.current   = 0;
  }, [data]);

  // RAF loop — advances simTime by real-time × speed, finds nearest frame
  useEffect(() => {
    if (!playing || !data) return;

    const tick = (ts: number) => {
      if (lastTsRef.current === 0) {
        // First tick after play — initialise clock to current sim position
        // so seeking before play then playing resumes from the right spot.
        lastTsRef.current = ts;
        simTimeRef.current = data.times[frameRef.current] ?? 0;
      }

      const wallDt = (ts - lastTsRef.current) / 1000; // real seconds
      lastTsRef.current = ts;
      simTimeRef.current += wallDt * speed;

      const t = simTimeRef.current;

      // Find first frame whose time is ≥ accumulated sim time
      const next = data.times.findIndex(time => time >= t);

      if (next === -1 || next >= data.n_frames) {
        // Past the end
        setFrame(data.n_frames - 1);
        setPlaying(false);
        lastTsRef.current = 0;
        return;
      }

      setFrame(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, data, speed]);

  const togglePlay = useCallback(() => {
    setPlaying(p => {
      if (!p) {
        // Reset clock so next tick initialises from current frame position
        lastTsRef.current = 0;
      }
      return !p;
    });
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setFrame(0);
    simTimeRef.current = 0;
    lastTsRef.current  = 0;
  }, []);

  const seek = useCallback((f: number) => {
    setPlaying(false);
    setFrame(f);
    simTimeRef.current = 0;
    lastTsRef.current  = 0;
  }, []);

  return { frame, playing, speed, setSpeed, togglePlay, reset, seek };
}

// ─── T / R metrics — only valid for barrier / step potentials ─────────────────

export function computeTR(data: EvolveResponse) {
  const x    = data.x;
  const last = data.frames[data.n_frames - 1];
  const dx   = x[1] - x[0];
  // Transmission: probability to the RIGHT of the barrier centre (x > 0.5)
  const T    = last.prob.reduce((acc, p, i) => x[i] >  0.5 ? acc + p * dx : acc, 0);
  // Reflection: probability to the LEFT of the barrier centre (x < -0.5)
  const R    = last.prob.reduce((acc, p, i) => x[i] < -0.5 ? acc + p * dx : acc, 0);
  return { T, R };
}