import "server-only";
import { after } from "next/server";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import si from "@/i18n/messages/si.json";
import ta from "@/i18n/messages/ta.json";
import type { Locale } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { formatDate, formatLKR } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/** Notification types that also go out by email (the rest are in-app only). */
export const EMAIL_TYPES = [
  "bid_received", "bid_shortlisted", "bid_awarded", "award_cancelled", "completion_requested",
  "job_approved", "job_rejected", "job_expiring", "job_expired", "job_cancelled_admin",
  "review_received", "payment_verified", "payment_rejected",
] as const;

type Tree = { [k: string]: string | Tree };
const catalog: Record<Locale, Tree> = { en, si: merge(en, si), ta: merge(en, ta) };

function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = typeof v === "object" && typeof out[k] === "object" ? merge(out[k] as Tree, v) : v;
  return out;
}

/** Turn raw notification data into display params (money and dates formatted). */
export function notificationParams(data: Record<string, unknown>, locale: Locale) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v == null) continue;
    if (k === "rate" || k === "amount") out[k] = formatLKR(v as number);
    else if (k.endsWith("_at")) out[k] = formatDate(String(v), locale);
    else out[k] = String(v);
  }
  return out;
}

/** Send any pending notification emails after the response is flushed. */
export function dispatchNotificationsSoon() {
  after(async () => {
    try {
      await dispatchPendingEmails();
    } catch (e) {
      console.error("[notify] dispatch failed", e);
    }
  });
}

export async function dispatchPendingEmails(limit = 50) {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { data, error } = await admin.rpc("claim_email_batch", { p_types: [...EMAIL_TYPES], p_limit: limit });
  if (error || !data) return 0;
  for (const n of data) {
    if (!n.email) continue;
    const locale = (["en", "si", "ta"].includes(n.preferred_lang) ? n.preferred_lang : "en") as Locale;
    const t = createTranslator({ locale, messages: catalog[locale] as typeof en, namespace: "notifications" });
    const params = notificationParams(n.data as Record<string, unknown>, locale);
    const type = n.type as (typeof EMAIL_TYPES)[number];
    const subject = t(`${type}.title`, params);
    const body = t(`${type}.body`, params);
    const url = n.link ? `${siteUrl()}/${locale}${n.link}` : `${siteUrl()}/${locale}/dashboard`;
    const greeting = t("emailGreeting", { name: n.full_name });
    const cta = t("emailCta");
    const footer = t("emailFooter");
    await sendEmail({
      to: n.email,
      subject: `${subject} · CoConnect`,
      text: `${greeting}\n\n${body}\n\n${cta}: ${url}\n\n— ${footer}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;color:#1b1b18">
        <p>${escapeHtml(greeting)}</p><p style="font-size:16px">${escapeHtml(body)}</p>
        <p><a href="${url}" style="display:inline-block;background:#1f5f3a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta)}</a></p>
        <p style="color:#5c5a52;font-size:12px">${escapeHtml(footer)}</p></div>`,
    });
  }
  return data.length;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
