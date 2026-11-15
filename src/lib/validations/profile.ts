import { z } from "zod";
import { normalizeLkPhone } from "@/lib/format";
import { localeSchema, optionalInt, optionalText, v } from "./common";

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, v.tooShort).max(80, v.tooLong),
  district_id: optionalInt(1, 1000),
  city: optionalText(80),
  bio: optionalText(1000),
  preferred_lang: localeSchema,
  crew_size: optionalInt(1, 1000),
});

export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((s, ctx) => {
      const n = normalizeLkPhone(s);
      if (!n) {
        ctx.addIssue({ code: "custom", message: v.phone });
        return z.NEVER;
      }
      return n;
    }),
});

export const selfRoleSchema = z.enum(["publisher", "worker", "broker"]);
