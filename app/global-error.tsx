"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "40px", fontFamily: "system-ui, sans-serif", background: "#0a0d14", color: "#f0f4f8" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>Application Error</h2>
          <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
            {error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
