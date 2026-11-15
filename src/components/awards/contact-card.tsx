import { MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export type Contact = { user_id: string; full_name: string; phone: string | null; counterpart: string; award_id: string; workers_count: number };

/** Rendered only from get_job_contact() results — the single phone path. */
export async function ContactCard({ contact }: { contact: Contact }) {
  const t = await getTranslations("award");
  const wa = contact.phone ? `https://wa.me/${contact.phone.replace(/^\+/, "")}` : null;
  return (
    <div className="rounded-lg border border-primary/30 bg-success-bg p-4">
      <p className="text-xs font-semibold text-success-fg uppercase">{t(contact.counterpart === "worker" ? "yourWorker" : "yourPublisher")}</p>
      <Link href={`/profile/${contact.user_id}`} className="text-lg font-bold hover:underline">{contact.full_name}</Link>
      {contact.counterpart === "worker" && contact.workers_count > 1 ? (
        <p className="text-sm">{t("crewOf", { count: contact.workers_count })}</p>
      ) : null}
      {contact.phone ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:${contact.phone}`} className={buttonVariants({ size: "sm" })}>
            <Phone className="size-4" aria-hidden /> {contact.phone}
          </a>
          <a href={wa!} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        </div>
      ) : (
        <p className="mt-2 text-sm">{t("noPhone")}</p>
      )}
    </div>
  );
}
