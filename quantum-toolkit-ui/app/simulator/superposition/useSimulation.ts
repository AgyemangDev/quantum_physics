// hooks/useSimulation.ts
import { useState, useEffect, useRef, useCallback } from "react";
import type { SimulationParams, SimulationResult } from "./types";

const API_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SIMULATION_API_URL) ||
  "http://localhost:8000/superposition";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function buildPayload(p: SimulationParams): Record<string, unknown> {
  return {
    coefficients: p.coefficients.map(Number),
    x_left:       Number(p.x_left),
    x_right:      Number(p.x_right),
    t_end:        Number(p.t_end),
    dt:           Number(p.dt),
    store_every:  Math.max(1, Math.round(Number(p.store_every))),
    x_min:        Number(p.x_min),
    x_max:        Number(p.x_max),
    N:            Math.max(64, Math.round(Number(p.N))),
  };
}

export function useSimulation(params: SimulationParams) {
  const [result, setResult]   = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const debouncedParams = useDebounce(params, 700);

  const fetchSimulation = useCallback(async (p: SimulationParams) => {
    // Guard: coefficients must be non-empty and finite
    if (
      p.coefficients.length === 0 ||
      p.coefficients.some((c) => !isFinite(c)) ||
      p.x_left >= p.x_right ||
      p.x_min >= p.x_max ||
      p.t_end <= 0 ||
      p.dt <= 0
    ) {
      return;
    }

    abortRef.current?.abort();
    const controller  = new AbortController();
    abortRef.current  = controller;

    setLoading(true);
    setError(null);

    const payload = buildPayload(p);

    try {
      const res = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        signal:  controller.signal,
      });

      if (!res.ok) {
        // Try to surface FastAPI validation detail
        const body = await res.json().catch(() => null);
        const detail =
          Array.isArray(body?.detail)
            ? body.detail.map((d: { loc: string[]; msg: string }) => `${d.loc.join(".")}: ${d.msg}`).join("; ")
            : body?.detail ?? res.statusText;
        throw new Error(`${res.status} – ${detail}`);
      }

      const data: SimulationResult = await res.json();
      setResult(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimulation(debouncedParams);
  }, [debouncedParams, fetchSimulation]);

  return { result, loading, error };
}

export function usePlayback(frameCount: number, speed: number) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying]       = useState(false);
  const rafRef                      = useRef<number | null>(null);
  const lastTimeRef                 = useRef<number | null>(null);
  const accumRef                    = useRef(0);

  useEffect(() => {
    setFrameIndex(0);
    setPlaying(false);
  }, [frameCount]);

  useEffect(() => {
    if (!playing || frameCount === 0) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
      return;
    }

    // Base interval: 50 ms per frame at 1x
    const interval = 50 / speed;

    const tick = (ts: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const delta = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      accumRef.current += delta;

      if (accumRef.current >= interval) {
        accumRef.current = 0;
        setFrameIndex((prev) => (prev + 1) % frameCount);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [playing, frameCount, speed]);

  return { frameIndex, playing, setPlaying, setFrameIndex };
}