// components/TopBar.tsx
import React from "react";
import type { PlaybackSpeed } from "./types";

interface TopBarProps {
  playing:        boolean;
  onTogglePlay:   () => void;
  speed:          PlaybackSpeed;
  onSpeedChange:  (s: PlaybackSpeed) => void;
  currentTime:    number;
  totalTime:      number;
  frameIndex:     number;
  frameCount:     number;
  loading:        boolean;
  error:          string | null;
}

const SPEEDS: PlaybackSpeed[] = [0.1, 0.5, 1, 2, 5];

export const TopBar: React.FC<TopBarProps> = ({
  playing,
  onTogglePlay,
  speed,
  onSpeedChange,
  currentTime,
  totalTime,
  frameIndex,
  frameCount,
  loading,
  error,
}) => (
  <div
    style={{
      display:         "flex",
      alignItems:      "center",
      gap:             14,
      padding:         "8px 18px",
      borderBottom:    "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "#0a0a0a",
      flexShrink:      0,
      flexWrap:        "wrap",
      minHeight:       52,
    }}
  >
    {/* Play / Pause */}
    <button
      onClick={onTogglePlay}
      disabled={loading || frameCount === 0}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        width:          36,
        height:         36,
        borderRadius:   8,
        border:         "1px solid rgba(255,255,255,0.18)",
        background:     playing ? "rgba(99,102,241,0.35)" : "transparent",
        color:          "#fff",
        cursor:         loading || frameCount === 0 ? "not-allowed" : "pointer",
        opacity:        loading || frameCount === 0 ? 0.45 : 1,
        fontSize:       16,
        transition:     "background 0.15s",
        flexShrink:     0,
      }}
      title={playing ? "Pause" : "Play"}
    >
      {playing ? "⏸" : "▶"}
    </button>

    {/* Speed buttons */}
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginRight: 4 }}>Speed</span>
      {SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => onSpeedChange(s)}
          style={{
            padding:      "2px 8px",
            borderRadius: 5,
            border:       "1px solid rgba(255,255,255,0.15)",
            background:   speed === s ? "rgba(99,102,241,0.45)" : "transparent",
            color:        speed === s ? "#fff" : "rgba(255,255,255,0.5)",
            fontSize:     11,
            cursor:       "pointer",
            transition:   "background 0.15s",
          }}
        >
          {s}x
        </button>
      ))}
    </div>

    {/* Frame counter */}
    {frameCount > 0 && (
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
        {frameIndex + 1} / {frameCount}
      </span>
    )}

    {/* Right side */}
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
      {loading && (
        <span style={{ fontSize: 12, color: "#a5b4fc", animation: "pulse 1s infinite" }}>
          computing…
        </span>
      )}
      {error && !loading && (
        <span
          style={{
            fontSize:    11,
            color:       "rgba(248,113,113,0.9)",
            maxWidth:    320,
            overflow:    "hidden",
            textOverflow:"ellipsis",
            whiteSpace:  "nowrap",
          }}
          title={error}
        >
          ✕ {error}
        </span>
      )}
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>
        t = {currentTime.toFixed(3)} / {totalTime.toFixed(2)}
      </span>
    </div>
  </div>
);