"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
      {error.digest ? <p className="mt-2 font-mono text-xs text-muted-foreground">{error.digest}</p> : null}
      <Button className="mt-6" onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
