"use client";
import Navbar from "../components/Navbars/Navbar";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {TOPICS} from "../assets/data/topic"


export default function TheoryPage() {
  const router = useRouter();
  const [active, setActive] = useState("schrodinger");
  const topic = TOPICS.find(t => t.id === active)!;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 56px)" }}>

        {/* Sidebar */}
        <aside style={{ borderRight: "1px solid var(--border)", padding: "20px 12px", background: "var(--bg-deep)" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase" as const, padding: "0 4px" }}>
            ◈ Concepts
          </div>
          {TOPICS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)} className="btn" style={{
              display: "block", width: "100%", textAlign: "left" as const, marginBottom: 4,
              background: active === t.id ? "var(--cyan-glow)" : "transparent",
              borderColor: active === t.id ? t.color : "transparent",
              color: active === t.id ? t.color : "var(--text-secondary)",
            }}>
              {t.title}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={{ padding: "32px 40px", maxWidth: 780 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span className="tag" style={{ color: topic.color, borderColor: topic.color, background: `rgba(0,0,0,0)` }}>
              {topic.tag}
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, marginBottom: 24, color: "var(--text-primary)" }}>
            {topic.title}
          </h1>

          {/* Equations */}
          <div className="panel" style={{ padding: "16px 20px", marginBottom: 24, borderColor: topic.color + "44" }}>
            {topic.equations.map((eq, i) => (
              <div key={i} style={{
                fontFamily: "var(--font-mono)", fontSize: 16,
                color: topic.color, padding: "6px 0",
                borderBottom: i < topic.equations.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                {eq}
              </div>
            ))}
          </div>

          {/* Body */}
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 24, whiteSpace: "pre-line" as const }}>
            {topic.body}
          </p>

          {/* Code block */}
          <div className="panel" style={{ padding: 0, overflow: "hidden", borderColor: "var(--border)" }}>
            <div className="panel-header" style={{ background: "var(--bg-raised)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red-accent)" }}/>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)" }}/>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }}/>
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>python</span>
            </div>
<pre
  style={{
    padding: "20px",
    margin: 0,
    fontSize: 13,
    fontFamily: "STIX Two Math, serif",
    lineHeight: 1.8,
    color: "var(--cyan)",
    background: "radial-gradient(circle at top, #0a0f1f, #05070d)",
    overflowX: "auto",
    letterSpacing: "0.03em",
  }}
>
  <code>{topic.code}</code>
</pre>
          </div>

          {/* Link to simulator */}
          <div style={{ marginTop: 24, padding: "14px 20px", background: "var(--cyan-glow)", borderRadius: 8, border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "space-between" as const }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              See this in action — run the live simulator
            </span>
<button
  onClick={() => router.push(topic.route)}
  className="btn btn-primary"
  style={{ fontSize: 11 }}
>
  Open simulator →
</button>
          </div>
        </main>
      </div>
    </div>
  );
}
