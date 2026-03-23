export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(180deg, #f7f3ee 0%, #f6f7f8 48%, #f2f5f7 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          borderRadius: "28px",
          border: "1px solid rgba(215, 222, 229, 0.95)",
          backgroundColor: "rgba(255,255,255,0.84)",
          boxShadow: "0 18px 45px rgba(25, 49, 69, 0.08)",
          padding: "32px",
          display: "grid",
          gap: "14px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#8f6b4e",
            fontWeight: 700,
          }}
        >
          404
        </span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", color: "#1d2d39" }}>
          Page not found
        </h1>
        <p style={{ color: "#596d7c", lineHeight: 1.7 }}>
          The page you requested does not exist.
        </p>
      </section>
    </main>
  );
}
