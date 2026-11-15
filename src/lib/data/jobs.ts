import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient, TAGS } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/jobs";

export const JOB_CARD_SELECT =
  "id, title, district_id, city, category_id, suggested_rate, rate_unit, workers_needed, days_needed, start_date, is_date_flexible, bid_count, lowest_rate, published_at, expires_at, is_featured, status, job_images(storage_path, sort_order)";

export type JobCardData = {
  id: string;
  title: string;
  district_id: number;
  city: string | null;
  category_id: number;
  suggested_rate: number;
  rate_unit: "per_worker_per_day" | "per_day" | "per_project";
  workers_needed: number | null;
  days_needed: number | null;
  start_date: string | null;
  is_date_flexible: boolean;
  bid_count: number;
  lowest_rate: number | null;
  published_at: string | null;
  expires_at: string | null;
  is_featured: boolean;
  status: string;
  job_images: { storage_path: string; sort_order: number }[];
};

export type JobFilters = {
  q?: string;
  district?: number;
  categoryIds?: number[];
  minRate?: number;
  maxRate?: number;
  startFrom?: string;
  startTo?: string;
  sort?: "newest" | "closing" | "rate";
  page?: number;
};

export const PAGE_SIZE = 20;

export async function searchJobs(f: JobFilters) {
  const supabase = await createClient();
  let q = supabase.from("jobs").select(JOB_CARD_SELECT, { count: "exact" }).eq("status", "published");
  if (f.q) {
    // Trigram-indexed generated column; escape LIKE wildcards in user input.
    const term = f.q.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`).slice(0, 80);
    q = q.ilike("search_text", `%${term}%`);
  }
  if (f.district) q = q.eq("district_id", f.district);
  if (f.categoryIds?.length) q = q.in("category_id", f.categoryIds);
  if (f.minRate) q = q.gte("suggested_rate", f.minRate);
  if (f.maxRate) q = q.lte("suggested_rate", f.maxRate);
  if (f.startFrom) q = q.gte("start_date", f.startFrom);
  if (f.startTo) q = q.lte("start_date", f.startTo);
  q = q.order("is_featured", { ascending: false });
  if (f.sort === "closing") q = q.order("expires_at", { ascending: true });
  else if (f.sort === "rate") q = q.order("suggested_rate", { ascending: false });
  else q = q.order("published_at", { ascending: false });
  const page = Math.max(1, f.page ?? 1);
  q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data, count } = await q;
  return { jobs: (data ?? []) as unknown as JobCardData[], total: count ?? 0, page };
}

/** Newest published jobs (the viewer's district first when it has ≥3). Public data, shared for 60 s. */
export const getRecentJobs = unstable_cache(
  async (limit = 8, districtId?: number | null) => {
    const supabase = createPublicClient();
    const base = () => supabase.from("jobs").select(JOB_CARD_SELECT).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
    if (districtId) {
      const { data } = await base().eq("district_id", districtId);
      if (data && data.length >= 3) return data as unknown as JobCardData[];
    }
    const { data, error } = await base();
    if (error) throw error;
    return data as unknown as JobCardData[];
  },
  ["recent-jobs"],
  { revalidate: 60, tags: [TAGS.jobs] },
);

/** Aggregates for the homepage (no personal data). Shared for 60 s, keyed by district. */
export const getHomeStats = unstable_cache(
  async (districtId: number | null) => {
    const supabase = createPublicClient();
    const [stats, districts, categories] = await Promise.all([
      supabase.rpc("get_home_stats", { p_district_id: districtId ?? undefined }),
      supabase.rpc("get_district_stats"),
      supabase.rpc("get_category_counts"),
    ]);
    const error = stats.error ?? districts.error ?? categories.error;
    if (error) throw error;
    return { stats: stats.data?.[0] ?? null, districts: districts.data ?? [], categories: categories.data ?? [] };
  },
  ["home-stats"],
  { revalidate: 60, tags: [TAGS.jobs] },
);

/** Public, phone-free profiles for a set of user ids. */
export async function getPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("public_profiles").select("*").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id!, p]));
}
