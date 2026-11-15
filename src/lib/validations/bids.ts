import { z } from "zod";
import { money, optionalDate, optionalInt, optionalText, uuid } from "./common";
import { rateUnitSchema } from "./jobs";

export const bidSchema = z.object({
  job_id: uuid,
  rate: money,
  rate_unit: rateUnitSchema,
  workers_offered: optionalInt(1, 1000).transform((n) => n ?? 1),
  days_offered: optionalInt(1, 365),
  message: optionalText(1000),
  can_start_on: optionalDate,
});

export const reviewSchema = z.object({
  job_id: uuid,
  reviewee_id: uuid,
  rating: z.coerce.number().int().min(1, "required").max(5, "invalid"),
  comment: optionalText(1000),
});

export const threadSchema = z.object({
  job_id: uuid,
  parent_id: uuid.optional().or(z.literal("").transform(() => undefined)),
  kind: z.enum(["question", "comment"]),
  body: z.string().trim().min(2, "tooShort").max(1000, "tooLong"),
});

export const reportSchema = z.object({
  target_type: z.enum(["job", "profile", "thread", "review"]),
  target_id: uuid,
  reason: z.enum(["spam", "scam", "contact_info", "offensive", "wrong_category", "other"]),
  details: optionalText(1000),
});

export const reasonSchema = z.string().trim().min(3, "reason_required").max(500);
