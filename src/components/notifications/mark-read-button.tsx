"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { markNotificationsRead } from "@/actions/social";
import { Button } from "@/components/ui/button";

export function MarkReadButton() {
  const t = useTranslations("notificationsPage");
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => void (await markNotificationsRead()))}>
      {t("markAll")}
    </Button>
  );
}
