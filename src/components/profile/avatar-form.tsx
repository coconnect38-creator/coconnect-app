"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef } from "react";
import { uploadAvatar } from "@/actions/profile";
import { FormError, useFieldError } from "@/components/forms/form-bits";
import { compressImage } from "@/lib/compress-image";
import { Avatar } from "./avatar";

export function AvatarForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState(uploadAvatar, null);
  const err = useFieldError(state);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        const file = fd.get("avatar");
        if (file instanceof File && file.size) fd.set("avatar", await compressImage(file, 512));
        return action(fd);
      }}
      className="flex items-center gap-4"
    >
      <Avatar name={name} path={avatarUrl} size={72} />
      <div className="space-y-1">
        <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted">
          {pending ? t("uploading") : t("changePhoto")}
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
        {err("avatar") ? <p className="text-sm text-danger">{err("avatar")}</p> : null}
        <FormError state={state} />
      </div>
    </form>
  );
}
