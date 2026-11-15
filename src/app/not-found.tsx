import Link from "next/link";

// Requests outside any locale (rare: the proxy adds one). Kept minimal and static.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", padding: 32, background: "#faf7f0", color: "#1b1b18" }}>
        <h1>404</h1>
        <p>
          <Link href="/en">CoConnect</Link>
        </p>
      </body>
    </html>
  );
}
