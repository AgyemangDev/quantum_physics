"use client";
import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function Eq({ tex, display = false }: { tex: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    katex.render(tex, ref.current, { displayMode: display, throwOnError: false });
  }, [tex, display]);
  return <span ref={ref} />;
}