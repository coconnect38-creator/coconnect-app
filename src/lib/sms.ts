import "server-only";

/**
 * SMS behind one interface so a local gateway (Notify.lk, Text.lk, Dialog) can
 * replace the provider without touching callers. Stage 1 sends OTP through
 * Supabase Auth's configured provider; this is for future transactional SMS.
 */
export async function sendSms(to: string, body: string): Promise<{ ok: boolean }> {
  console.info(`[sms:dry-run] to=${to.replace(/\d(?=\d{3})/g, "•")} len=${body.length}`);
  return { ok: true };
}
