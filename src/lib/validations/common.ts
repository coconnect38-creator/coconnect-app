import { z } from "zod";

/**
 * Zod messages are i18n keys under `validation.*` so the UI can translate them.
 * Schemas are shared by client forms and server actions.
 */
export const v = {
  required: "required",
  tooShort: "tooShort",
  tooLong: "tooLong",
  invalid: "invalid",
  email: "email",
  phone: "phone",
  password: "password",
  positive: "positive",
  passwordMismatch: "passwordMismatch",
} as const;

export const localeSchema = z.enum(["en", "si", "ta"]);

/** Empty strings from FormData become undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, v.tooLong)
    .optional()
    .transform((s) => (s ? s : undefined));

export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (x) => (x === "" || x === null || x === undefined ? undefined : Number(x)),
    z.number().int(v.invalid).min(min, v.positive).max(max, v.invalid).optional(),
  );

export const requiredInt = (min: number, max: number) =>
  z.preprocess((x) => (x === "" || x === null ? undefined : Number(x)), z.number({ error: v.required }).int(v.invalid).min(min, v.positive).max(max, v.invalid));

export const money = z.preprocess(
  (x) => (x === "" || x === null || x === undefined ? undefined : Number(String(x).replace(/[,\s]/g, ""))),
  z.number({ error: v.required }).positive(v.positive).max(10_000_000, v.invalid).multipleOf(0.01, v.invalid),
);

export const optionalDate = z
  .string()
  .optional()
  .transform((s) => (s ? s : undefined))
  .refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s), v.invalid);

export const uuid = z.uuid(v.invalid);

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

export function formToObject(form: FormData) {
  const out: Record<string, FormDataEntryValue> = {};
  for (const [k, val] of form.entries()) if (!(val instanceof File)) out[k] = val;
  return out;
}
