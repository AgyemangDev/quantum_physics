"use client";

interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

export default function FeatureCard({ icon, title, desc, color }: FeatureCardProps) {
  return (
    <div
      className="panel"
      style={{ padding: "24px 20px", transition: "border-color 0.25s, transform 0.25s", cursor: "default" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = color;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}15`, border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontFamily: "var(--font-mono)", color,
        marginBottom: 14,
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 8, color: "var(--text-primary)" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
        {desc}
      </div>
    </div>
  );
}