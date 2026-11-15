"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

// Last-resort boundary for errors in the locale layout itself. It replaces the
// whole document, so no i18n provider is available: the copy is trilingual.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fbf8f1", color: "#1d2a22", margin: 0 }}>
        <main style={{ maxWidth: 420, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p lang="si">යමක් වැරදී ඇත</p>
          <p lang="ta">ஏதோ தவறு நடந்துவிட்டது</p>
          {error.digest ? <p style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.7 }}>{error.digest}</p> : null}
          <button type="button" onClick={reset} style={{ marginTop: 24, minHeight: 44, padding: "0 20px", borderRadius: 8, border: 0, background: "#1f5f3a", color: "#fff", fontWeight: 600 }}>
            Try again · නැවත උත්සාහ කරන්න · மீண்டும் முயற்சி செய்
          </button>
        </main>
      </body>
    </html>
  );
}
