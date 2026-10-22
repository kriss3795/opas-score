"use client";

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="fr">
      <body style={{ background: "#0b0d12", color: "#f2f4f8", fontFamily: "system-ui", textAlign: "center", padding: "30vh 24px" }}>
        <div style={{ fontSize: 48 }}>⚽</div>
        <h1>Oups… / Ups…</h1>
        <button
          onClick={() => window.location.reload()}
          style={{ background: "#ff7a1a", color: "#fff", border: 0, borderRadius: 16, padding: "12px 20px", fontWeight: 700 }}
        >
          Recharger / Recargar
        </button>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 24, wordBreak: "break-word" }}>{error.message}</p>
      </body>
    </html>
  );
}
