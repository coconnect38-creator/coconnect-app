import "server-only";

/** Thin Resend wrapper (HTTP API, no SDK). Logs instead of sending when unconfigured. */
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dry-run] to=${to} subject=${subject}`);
    return { ok: true as const, dryRun: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "CoConnect <onboarding@resend.dev>", to, subject, text, html }),
  });
  if (!res.ok) console.error(`[email] ${res.status} ${await res.text()}`);
  return { ok: res.ok, dryRun: false };
}
