import { z } from "zod";
import { localeSchema, v } from "./common";

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, v.tooShort).max(80, v.tooLong),
    email: z.email(v.email).trim().toLowerCase(),
    password: z.string().min(8, v.password).max(72, v.tooLong),
    confirm: z.string(),
    locale: localeSchema,
  })
  .refine((d) => d.password === d.confirm, { message: v.passwordMismatch, path: ["confirm"] });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, v.required),
  password: z.string().min(1, v.required),
  next: z.string().optional(),
  locale: localeSchema,
});

export const resetSchema = z.object({ email: z.email(v.email).trim().toLowerCase(), locale: localeSchema });

export const newPasswordSchema = z
  .object({ password: z.string().min(8, v.password).max(72, v.tooLong), confirm: z.string(), locale: localeSchema })
  .refine((d) => d.password === d.confirm, { message: v.passwordMismatch, path: ["confirm"] });
