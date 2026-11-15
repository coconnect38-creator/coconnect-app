import { z } from "zod";
import { money, optionalDate, optionalInt, optionalText, requiredInt, uuid, v } from "./common";

export const rateUnitSchema = z.enum(["per_worker_per_day", "per_day", "per_project"]);

export const jobSchema = z.object({
  job_id: uuid.optional().or(z.literal("").transform(() => undefined)),
  intent: z.enum(["draft", "submit"]),
  category_id: requiredInt(1, 100000),
  district_id: requiredInt(1, 1000),
  city: optionalText(80),
  address_hint: optionalText(120),
  title: z.string().trim().min(10, "titleLength").max(120, "titleLength"),
  description: z.string().trim().min(30, "descriptionLength").max(5000, v.tooLong),
  workers_needed: optionalInt(1, 1000),
  days_needed: optionalInt(1, 365),
  suggested_rate: money,
  rate_unit: rateUnitSchema,
  start_date: optionalDate,
  is_date_flexible: z.preprocess((x) => x === "on" || x === "true", z.boolean()),
  lat: z.preprocess((x) => (x === "" || x == null ? undefined : Number(x)), z.number().min(5).max(10.5).optional()),
  lng: z.preprocess((x) => (x === "" || x == null ? undefined : Number(x)), z.number().min(79).max(82.5).optional()),
});

export type JobInput = z.infer<typeof jobSchema>;
