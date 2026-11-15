import { NextResponse, type NextRequest } from "next/server";
import { dispatchPendingEmails } from "@/lib/notify";

/**
 * Sends emails for notifications created by pg_cron jobs (expiry, auto-confirm)
 * that no user request has flushed yet. Called by Vercel Cron with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sent = await dispatchPendingEmails(200);
  return NextResponse.json({ sent });
}
