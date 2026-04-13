"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { EvolveResponse, Potential, Speed, TunnelingMode } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useEvolve() {
  const [data,    setData]    = useState<EvolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const compute = useCallback(async (params: {
    x0: number; sigma: number; k0: number;
    potential: Potential; V0: number;
    barrier_width: number;
    amplitude: number;
    tEnd: number;
    tunnelingMode: TunnelingMode;
  }) => {
    setLoading(true);
    setError(null);

    const halfW  = params.barrier_width / 2;
    const isWall = params.tunnelingMode === "wall";

    const isFreeEvolution =
      params.potential === "free" ||
      (params.potential === "barrier" && isWall);

    try {
      const res = await fetch(`${API}/evolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x0:            params.x0,
          sigma:         params.sigma,        // no longer scaled here
          k0:            params.k0,
          amplitude:     params.amplitude,    // sent separately to backend

          potential:     isFreeEvolution ? "free" : params.potential,
          V0:            isFreeEvolution ? 0 : params.V0,
          barrier_left:  isFreeEvolution ? 0 : -halfW,
          barrier_right: isFreeEvolution ? 0 :  halfW,

          t_end:         params.tEnd,
          dt:            0.005,
          store_every:   10,
          boundary:      isFreeEvolution ? "periodic" : "dirichlet",

          x_min:        -10,
          x_max:         10,
          N:             512,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, compute };
}

export function useAnimation(data: EvolveResponse | null) {
  const [frame,   setFrame]   = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed,   setSpeed]   = useState<Speed>(1);

  const rafRef    = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    setFrame(0);
    setPlaying(false);
  }, [data]);

  const simTimeRef = useRef(0);

  useEffect(() => {
    if (!playing || !data) return;

    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;

      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      simTimeRef.current += dt * speed;

      const t = simTimeRef.current;
      let next = data.times.findIndex(time => time >= t);

      if (next === -1 || next >= data.n_frames) {
        setFrame(data.n_frames - 1);
        setPlaying(false);
        return;
      }

      setFrame(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, data, speed]);

  const togglePlay = useCallback(() => {
    setPlaying(p => {
      if (!p) {
        simTimeRef.current = data?.times[frame] ?? 0;
        lastTsRef.current  = 0;
      }
      return !p;
    });
  }, [data, frame]);

  const reset = useCallback(() => { setPlaying(false); setFrame(0); }, []);
  const seek  = useCallback((f: number) => { setPlaying(false); setFrame(f); }, []);

  return { frame, playing, speed, setSpeed, togglePlay, reset, seek };
}

export function computeTR(data: EvolveResponse) {
  const x    = data.x;
  const last = data.frames[data.n_frames - 1];
  const dx   = x[1] - x[0];
  const T    = last.prob.filter((_, i) => x[i] >  0.5).reduce((a, b) => a + b, 0) * dx;
  const R    = last.prob.filter((_, i) => x[i] < -0.5).reduce((a, b) => a + b, 0) * dx;
  return { T, R };
}