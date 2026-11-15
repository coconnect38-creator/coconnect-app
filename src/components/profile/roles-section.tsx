"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setRole } from "@/actions/profile";
import { useErrorText } from "@/components/forms/form-bits";
import { Alert, Badge } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";

const SELF = ["publisher", "worker", "broker"] as const;

export function RolesSection({ roles, brokerVerified }: { roles: string[]; brokerVerified: boolean }) {
  const t = useTranslations("settings");
  const tr = useTranslations("roles");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("rolesExplainer")}</p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {SELF.map((role) => {
          const has = roles.includes(role);
          return (
            <li key={role} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <p className="font-semibold">
                  {tr(role)}{" "}
                  {role === "broker" && has && brokerVerified ? <Badge tone="green">{t("brokerVerified")}</Badge> : null}
                </p>
                <p className="text-sm text-muted-foreground">{tr(`${role}Desc`)}</p>
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="size-6 accent-[var(--primary)]"
                  checked={has}
                  disabled={pending}
                  onChange={(e) =>
                    start(async () => {
                      setError(null);
                      const res = await setRole(role, e.target.checked);
                      if (!res.ok) setError(errorText(res.error));
                      router.refresh();
                    })
                  }
                />
                <span className="sr-only">{tr(role)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {roles.includes("moderator") || roles.includes("admin") ? (
        <p className="text-sm text-muted-foreground">
          {t("staffRoles")}: {roles.filter((r) => r === "moderator" || r === "admin").map((r) => tr(r as "admin" | "moderator")).join(", ")}
        </p>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
