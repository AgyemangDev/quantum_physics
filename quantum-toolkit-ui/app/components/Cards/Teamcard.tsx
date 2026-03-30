"use client";

interface TeamCardProps {
  name: string;
  role: string;
  description: string;
  linkedin?: string;
  github?: string;
  initials: string;
  color: string;
}

export default function TeamCard({ name, role, description, linkedin, github, initials, color }: TeamCardProps) {
  return (
    <div style={{ perspective: "1000px", width: 220, height: 260 }}>
      <div className="team-card-inner">

        {/* Front */}
        <div className="team-card-face team-card-front" style={{ borderColor: `${color}33` }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `${color}18`,
            border: `2px solid ${color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color,
            fontFamily: "var(--font-display)",
            marginBottom: 16,
            boxShadow: `0 0 20px ${color}33`,
          }}>
            {initials}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 6, textAlign: "center" as const }}>
            {name}
          </div>
          <div style={{
            fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const,
            color, padding: "3px 10px", borderRadius: 3,
            border: `1px solid ${color}`,
            background: `${color}12`,
          }}>
            {role}
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: "white", letterSpacing: "0.08em" }}>
            hover to flip →
          </div>
        </div>

        {/* Back */}
        <div className="team-card-face team-card-back" style={{ borderColor: `${color}55` }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, textAlign: "center" as const, marginBottom: 24 }}>
            {description}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
                title="LinkedIn">
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: `${color}15`, border: `1px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", cursor: "pointer",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}30`; (e.currentTarget as HTMLElement).style.borderColor = color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}15`; (e.currentTarget as HTMLElement).style.borderColor = `${color}55`; }}
                >
                  {/* LinkedIn icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect x="2" y="9" width="4" height="12"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </div>
              </a>
            )}
            {github && (
              <a href={github} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
                title="GitHub">
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: `${color}15`, border: `1px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", cursor: "pointer",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}30`; (e.currentTarget as HTMLElement).style.borderColor = color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}15`; (e.currentTarget as HTMLElement).style.borderColor = `${color}55`; }}
                >
                  {/* GitHub icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                  </svg>
                </div>
              </a>
            )}
          </div>
          <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color, fontFamily: "var(--font-display)" }}>
            {name.split(" ")[0]}
          </div>
        </div>
      </div>

      <style>{`
        .team-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .team-card-inner:hover {
          transform: rotateY(180deg);
        }
        .team-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background: var(--bg-panel);
          border: 1px solid;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
        }
        .team-card-back {
          transform: rotateY(180deg);
          background: var(--bg-raised);
          justify-content: flex-start;
          padding-top: 28px;
        }
      `}</style>
    </div>
  );
}