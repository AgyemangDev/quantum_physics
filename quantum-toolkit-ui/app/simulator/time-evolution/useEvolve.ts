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
    amplitude:    number;
    tEnd:         number;
  }) => {
    setLoading(true);
    setError(null);

    const halfW = params.barrier_width / 2;

    // ── Boundary condition ────────────────────────────────────────────────────
    // wall     → dirichlet  (ψ = 0 at edges, hard wall reflections)
    // barrier  → absorbing  (CAP at edges: wave smoothly disappears, no wrap-around)
    // step     → absorbing  (CAP at edges: wave smoothly disappears, no wrap-around)
    // free     → periodic   (ring domain; wave circulates, no edges)
    const boundary: "periodic" | "absorbing" | "dirichlet" =
      params.potential === "wall"    ? "dirichlet" :
      params.potential === "free"    ? "periodic"  :
      "absorbing";

    // ── Domain width ──────────────────────────────────────────────────────────
    // free:           ±20 — wide so the packet disperses off-screen before wrapping
    // barrier / step: ±15 — wider than ±10 so the 20% CAP layer (±3 on each side)
    //                       sits well outside the region of interest (±7), giving
    //                       the reflected wave room to be absorbed cleanly
    // wall:           ±10 — standard; hard walls are at the edges anyway
    const x_min = params.potential === "free" ? -20 : params.potential === "wall" ? -10 : -15;
    const x_max = params.potential === "free" ?  20 : params.potential === "wall" ?  10 :  15;

    const V0 = params.V0;

    // Barrier edges: for step potential the left edge is 0 (step starts at centre)
    const barrier_left  = params.potential === "step" ? 0.0 : -halfW;
    const barrier_right = params.potential === "step" ? 0.1 :  halfW;

    try {
      const res = await fetch(`${API}/evolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x0:            params.x0,
          sigma:         params.sigma,
          k0:            params.k0,
          potential:     params.potential,
          V0,
          barrier_left,
          barrier_right,
          amplitude:     params.amplitude,
          t_end:         params.tEnd,
          dt:            0.005,
          store_every:   10,
          x_min,
          x_max,
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
  const lastTsRef  = useRef<number>(0);
  const simTimeRef = useRef<number>(0);
  const frameRef   = useRef<number>(0);

  useEffect(() => { frameRef.current = frame; }, [frame]);

  useEffect(() => {
    setFrame(0);
    setPlaying(false);
    simTimeRef.current = 0;
    lastTsRef.current  = 0;
    frameRef.current   = 0;
  }, [data]);

  useEffect(() => {
    if (!playing || !data) return;

    const tick = (ts: number) => {
      if (lastTsRef.current === 0) {
        lastTsRef.current = ts;
        simTimeRef.current = data.times[frameRef.current] ?? 0;
      }

      const wallDt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      simTimeRef.current += wallDt * speed;

      const t    = simTimeRef.current;
      const next = data.times.findIndex(time => time >= t);

      if (next === -1 || next >= data.n_frames) {
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
      if (!p) lastTsRef.current = 0;
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
  const T    = last.prob.reduce((acc, p, i) => x[i] >  0.5 ? acc + p * dx : acc, 0);
  const R    = last.prob.reduce((acc, p, i) => x[i] < -0.5 ? acc + p * dx : acc, 0);
  return { T, R };
}