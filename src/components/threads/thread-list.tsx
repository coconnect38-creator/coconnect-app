import { getLocale, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/profile/avatar";
import { Badge } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { getPublicProfiles } from "@/lib/data/jobs";
import { formatRelative, nowMs } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { DeleteThreadButton } from "./delete-thread-button";
import { ReportButton } from "./report-button";
import { ThreadForm } from "./thread-form";

export async function ThreadList({ jobId, publisherId, viewerId, canPost }: { jobId: string; publisherId: string; viewerId: string | null; canPost: boolean }) {
  const t = await getTranslations("qa");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("job_threads")
    .select("id, parent_id, author_id, kind, body, is_hidden, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })
    .limit(200);
  const threads = rows ?? [];
  const authors = await getPublicProfiles(threads.map((r) => r.author_id));
  const roots = threads.filter((r) => !r.parent_id);
  const now = nowMs();

  const post = (row: (typeof threads)[number]) => {
    const a = authors.get(row.author_id);
    const mine = row.author_id === viewerId;
    const editable = mine && now - new Date(row.created_at).getTime() < 15 * 60 * 1000;
    return (
      <div className="flex gap-3">
        <Avatar name={a?.full_name ?? "?"} path={a?.avatar_url} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{a?.full_name ?? t("deletedUser")}</span>{" "}
            {row.author_id === publisherId ? <Badge tone="green">{t("publisher")}</Badge> : null}{" "}
            <span className="text-muted-foreground">{formatRelative(row.created_at, locale, now)}</span>
          </p>
          {row.is_hidden ? <p className="text-sm text-muted-foreground italic">{t("hidden")}</p> : null}
          <p className="text-sm break-words whitespace-pre-line">{row.body}</p>
          <div className="flex items-center gap-3">
            {viewerId && !mine ? <ReportButton targetType="thread" targetId={row.id} /> : null}
            {editable ? <DeleteThreadButton id={row.id} /> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4" aria-labelledby="qa-title">
      <h2 id="qa-title" className="text-lg font-bold">{t("title", { count: roots.length })}</h2>
      <p className="text-sm text-muted-foreground">{t("rules")}</p>
      {roots.length ? (
        <ul className="space-y-5">
          {roots.map((root) => (
            <li key={root.id} className="space-y-3">
              {post(root)}
              <ul className="ml-10 space-y-3 border-l-2 border-border pl-4">
                {threads
                  .filter((r) => r.parent_id === root.id)
                  .map((reply) => (
                    <li key={reply.id}>
                      {post(reply)}
                    </li>
                  ))}
                {canPost ? (
                  <li>
                    <ThreadForm jobId={jobId} parentId={root.id} compact />
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {canPost ? <ThreadForm jobId={jobId} /> : null}
    </section>
  );
}
