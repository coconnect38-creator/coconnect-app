"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { deleteThread } from "@/actions/social";

export function DeleteThreadButton({ id }: { id: string }) {
  const t = useTranslations("qa");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await deleteThread(id)))}
      className="min-h-9 text-xs font-semibold text-muted-foreground hover:text-danger"
    >
      {t("delete")}
    </button>
  );
}
