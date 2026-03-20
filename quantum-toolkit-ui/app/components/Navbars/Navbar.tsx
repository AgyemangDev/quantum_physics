import Link from "next/link";

const links = [
  { href: "/",                      label: "Overview"    },
  { href: "/simulator/wave-packet", label: "Wave Packet" },
  { href: "/simulator/tunneling",   label: "Tunneling"   },
  { href: "/simulator/bound-states",label: "Bound States"},
  { href: "/theory",                label: "Theory"      },
];

export default function Navbar() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(5,7,15,0.92)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      padding: "0 24px", height: "52px",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginRight: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          border: "2px solid var(--cyan)",
          boxShadow: "0 0 10px var(--cyan)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cyan)" }} />
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: "0.05em", color: "var(--text-primary)" }}>
          QUANTUM<span style={{ color: "var(--cyan)" }}>_</span>TOOLKIT
        </span>
      </Link>

      {/* Nav links — no active state, purely static */}
      <div style={{ display: "flex", gap: 2 }}>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} style={{
            textDecoration: "none",
            padding: "5px 14px",
            borderRadius: 4,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            border: "1px solid transparent",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--cyan)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}