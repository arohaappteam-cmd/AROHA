"use client";

// Replaces the root layout when it fails, so it cannot rely on globals.css.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#16141d",
          color: "#f4f3f7",
        }}
      >
        <title>Something went wrong · AROHA</title>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            AROHA hit an unexpected error.
            {error.digest && <> Ref: {error.digest}</>}
          </p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #3a3645",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
