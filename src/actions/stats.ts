"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ category: z.number().int().positive(), district: z.number().int().positive().optional() });

/** Aggregates only — individual bids are never exposed (>= 3 samples enforced in SQL). */
export async function getRateStats(category: number, district?: number) {
  const parsed = input.safeParse({ category, district });
  if (!parsed.success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_rate_stats", { p_category_id: parsed.data.category, p_district_id: parsed.data.district });
  return data?.[0] ?? null;
}
