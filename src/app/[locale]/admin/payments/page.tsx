import { getTranslations, setRequestLocale } from "next-intl/server";
import { paymentAction } from "@/actions/admin";
import { ActionButton } from "@/components/admin/action-button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/jobs";
import { formatDateTime, formatLKR } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPaymentsPage({ params }: PageProps<"/[locale]/admin/payments">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const supabase = await createClient();
  const [{ data: pending }, { data: recent }, { data: awaiting }] = await Promise.all([
    supabase.from("payments").select("*, jobs(title, payment_ref)").eq("status", "pending").order("created_at"),
    supabase.from("payments").select("*, jobs(title)").neq("status", "pending").order("created_at", { ascending: false }).limit(20),
    supabase.from("jobs").select("id, title, payment_ref, publisher_id, submitted_at").eq("status", "pending_payment").order("submitted_at"),
  ]);
  const t = await getTranslations("admin.payments");
  const users = await getPublicProfiles([...(pending ?? []), ...(recent ?? [])].map((p) => p.user_id).concat((awaiting ?? []).map((j) => j.publisher_id)));

  // Private bucket: short-lived signed URLs, generated only after the admin check above.
  const adminClient = createAdminClient();
  const signed = new Map<string, string>();
  if (adminClient) {
    for (const p of pending ?? []) {
      if (!p.slip_path) continue;
      const { data } = await adminClient.storage.from("bank-slips").createSignedUrl(p.slip_path, 300);
      if (data?.signedUrl) signed.set(p.id, data.signedUrl);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("queue", { count: pending?.length ?? 0 })}</h2>
        {!pending?.length ? <Card className="text-muted-foreground">{t("empty")}</Card> : null}
        {pending?.map((p) => (
          <Card key={p.id} className="grid gap-4 md:grid-cols-[220px_1fr]">
            {signed.get(p.id) ? (
              <a href={signed.get(p.id)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border bg-muted">
                {p.slip_path?.endsWith(".pdf") ? (
                  <span className="flex h-40 items-center justify-center font-semibold">PDF ↗</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URL, expires in 5 minutes
                  <img src={signed.get(p.id)} alt={t("slipAlt")} className="max-h-72 w-full object-contain" />
                )}
              </a>
            ) : (
              <Alert>{t("noSigner")}</Alert>
            )}
            <div className="space-y-2">
              <p className="text-2xl font-bold">{formatLKR(p.amount_lkr, { exact: true })}</p>
              <dl className="grid gap-1 text-sm">
                <div><dt className="inline font-semibold">{t("expectedRef")}: </dt><dd className="inline font-mono">{p.reference}</dd></div>
                <div><dt className="inline font-semibold">{t("claimedRef")}: </dt><dd className="inline font-mono">{p.bank_ref || "—"}</dd></div>
                <div><dt className="inline font-semibold">{t("user")}: </dt><dd className="inline">{users.get(p.user_id)?.full_name ?? p.user_id}</dd></div>
                <div><dt className="inline font-semibold">{t("job")}: </dt><dd className="inline">{p.job_id ? <Link href={`/jobs/${p.job_id}`} className="underline">{p.jobs?.title}</Link> : "—"}</dd></div>
                <div><dt className="inline font-semibold">{t("uploaded")}: </dt><dd className="inline">{formatDateTime(p.created_at, locale)}</dd></div>
              </dl>
              {p.reference && p.bank_ref && p.reference !== p.bank_ref.toUpperCase().trim() ? <Alert>{t("refMismatch")}</Alert> : null}
              <div className="flex flex-wrap items-start gap-2 pt-2">
                <ActionButton action={paymentAction.bind(null, p.id, "verify")} label={t("verify")} variant="primary" confirmText={t("verifyConfirm")} />
                <ActionButton action={paymentAction.bind(null, p.id, "reject")} label={t("reject")} variant="danger" reason={t("rejectReason")} presets={[t("presets.notReceived"), t("presets.wrongAmount"), t("presets.unreadable")]} />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("awaiting", { count: awaiting?.length ?? 0 })}</h2>
        {awaiting?.map((j) => (
          <Card key={j.id} className="flex flex-wrap items-center gap-3 p-4 sm:p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{j.title}</p>
              <p className="text-xs text-muted-foreground">{users.get(j.publisher_id)?.full_name} · <span className="font-mono">{j.payment_ref}</span></p>
            </div>
            <ActionButton action={paymentAction.bind(null, j.id, "waive")} label={t("waive")} reason={t("waiveNote")} />
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t("recent")}</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {recent?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{p.jobs?.title ?? "—"} · {users.get(p.user_id)?.full_name}</span>
              <span>{formatLKR(p.amount_lkr, { exact: true })}</span>
              <Badge tone={p.status === "verified" ? "green" : "danger"}>{t(`status.${p.status as "verified" | "rejected"}`)}</Badge>
              <Badge>{p.method}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
