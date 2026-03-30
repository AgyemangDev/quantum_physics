export function TimelineBar({ frame, nFrames, times, onSeek }: {
  frame: number; nFrames: number; times: number[]; onSeek: (f: number) => void;
}) {
  const pct = nFrames > 1 ? (frame / (nFrames - 1)) * 100 : 0;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (nFrames - 1)));
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", minWidth: 46 }}>{(times[frame] ?? 0).toFixed(2)}s</span>
      <div onClick={handleClick} style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 99, cursor: "pointer", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#22d3ee", borderRadius: 99, transition: "width 0.04s linear" }} />
        <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee99", transition: "left 0.04s linear" }} />
      </div>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", minWidth: 46, textAlign: "right" }}>{(times[nFrames - 1] ?? 3).toFixed(2)}s</span>
    </div>
  );
}