"use client";
import { useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Eigenstate {
  n: number;
  energy: number;
  real: number[];
  prob: number[];
}

export interface InfiniteWellResponse {
  x: number[];
  V: number[];
  energies: number[];
  analytical_energies: number[];
  eigenstates: Eigenstate[];
  well_width: number;
  n_states: number;
}

export function useInfiniteWell() {
  const [data,    setData]    = useState<InfiniteWellResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const compute = useCallback(async (params: {
    wellWidth: number;
    nStates: number;
  }) => {
    setLoading(true);
    setError(null);
    const half = params.wellWidth / 2;
    try {
      const res = await fetch(`${API}/infinite-well`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_left:   -half,
          x_right:   half,
          n_states:  params.nStates,
          x_min:    -10,
          x_max:     10,
          N:         512,
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