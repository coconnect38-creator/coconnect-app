import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createPublicClient, TAGS } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type District = Database["public"]["Tables"]["districts"]["Row"];
export type City = Database["public"]["Tables"]["cities"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type RateUnit = Database["public"]["Enums"]["rate_unit"];
export const RATE_UNITS: RateUnit[] = ["per_worker_per_day", "per_day", "per_project"];

// Reference data is public and rarely changes, so it is read with the anon
// client and shared across requests. A failed read throws (rather than caching
// an empty list for a day).
const DAY = 86_400;

export const getDistricts = cache(
  unstable_cache(
    async (): Promise<District[]> => {
      const { data, error } = await createPublicClient().from("districts").select("*").order("name_en");
      if (error) throw error;
      return data;
    },
    ["districts"],
    { revalidate: DAY, tags: [TAGS.reference] },
  ),
);

export const getCities = cache(
  unstable_cache(
    async (): Promise<City[]> => {
      const { data, error } = await createPublicClient().from("cities").select("*").order("name_en");
      if (error) throw error;
      return data;
    },
    ["cities"],
    { revalidate: DAY, tags: [TAGS.reference] },
  ),
);

const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await createPublicClient().from("categories").select("*").eq("is_active", true).order("sort_order").order("name_en");
    if (error) throw error;
    return data;
  },
  ["categories-active"],
  { revalidate: 3600, tags: [TAGS.categories] },
);

/** Active categories; `includeInactive` (admin screens) reads live with the admin's session. */
export const getCategories = cache(async (includeInactive = false): Promise<Category[]> => {
  if (!includeInactive) return getActiveCategories();
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order").order("name_en");
  return data ?? [];
});

export type CategoryTree = { parent: Category; children: Category[] }[];

export function buildCategoryTree(categories: Category[]): CategoryTree {
  const parents = categories.filter((c) => c.parent_id === null);
  return parents.map((parent) => ({ parent, children: categories.filter((c) => c.parent_id === parent.id) }));
}

/** A category id plus its children — used to filter listings by a parent category. */
export function categoryWithChildren(categories: Category[], id: number) {
  return [id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)];
}

export type PublicSettings = {
  fees_enabled: boolean;
  job_expiry_days: number;
  bank_details: { bank: string; account: string; branch: string; name: string };
  maintenance_banner: string;
  require_phone_verification: boolean;
};

export const getPublicSettings = cache(
  unstable_cache(
    async (): Promise<PublicSettings> => {
      const { data, error } = await createPublicClient().from("app_settings").select("key, value").eq("is_public", true);
      if (error) throw error;
      return parseSettings(data);
    },
    ["public-settings"],
    { revalidate: 300, tags: [TAGS.settings] },
  ),
);

function parseSettings(data: { key: string; value: unknown }[]): PublicSettings {
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    fees_enabled: map.fees_enabled === true,
    job_expiry_days: Number(map.job_expiry_days ?? 30),
    bank_details: (map.bank_details as PublicSettings["bank_details"]) ?? { bank: "", account: "", branch: "", name: "" },
    maintenance_banner: typeof map.maintenance_banner === "string" ? map.maintenance_banner : "",
    require_phone_verification: map.require_phone_verification === true,
  };
}
