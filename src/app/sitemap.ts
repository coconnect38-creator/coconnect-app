import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";
import type { Database } from "@/lib/database.types";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["", "/jobs", "/how-it-works", "/faq", "/terms", "/privacy"];
  const entries: MetadataRoute.Sitemap = staticPaths.flatMap((p) =>
    routing.locales.map((l) => ({ url: `${base}/${l}${p}`, changeFrequency: p === "/jobs" || p === "" ? "hourly" : "monthly" })),
  );
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Anonymous client: only published jobs are visible through RLS.
    const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await supabase.from("jobs").select("id, updated_at").eq("status", "published").limit(5000);
    for (const j of data ?? []) {
      for (const l of routing.locales) entries.push({ url: `${base}/${l}/jobs/${j.id}`, lastModified: j.updated_at });
    }
  }
  return entries;
}
