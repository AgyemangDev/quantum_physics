export default function EqBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(0,229,255,0.04)",
      border: "1px solid var(--border)",
      borderRadius: 6, padding: "8px 12px",
      marginBottom: 10, fontSize: 13,
    }}>
      {children}
    </div>
  );
}
