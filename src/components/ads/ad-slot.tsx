import { unstable_cache } from "next/cache";
import Image from "next/image";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { createPublicClient, TAGS } from "@/lib/supabase/public";
import { storageUrl } from "@/lib/utils";

type Slot = "home_hero" | "listing_inline" | "job_sidebar";
const MIN_INVENTORY = 10;

/**
 * Server-rendered ad: no ad-tech JS reaches the client. Selection prefers
 * district+category, then district, then nationwide; shows nothing rather than
 * something irrelevant, and stays dark until the area has real listings.
 */
// Inventory and live ads are public (anon RLS), so they're shared for 60 s.
const getAdCandidates = unstable_cache(
  async (slot: Slot, districtId: number | null) => {
    const supabase = createPublicClient();
    let inventory = supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published");
    if (districtId) inventory = inventory.eq("district_id", districtId);
    const { count } = await inventory;
    if ((count ?? 0) < MIN_INVENTORY) return [];
    const { data } = await supabase.from("ad_placements").select("id, title, image_path, district_id, category_id").eq("slot", slot).limit(50);
    return data ?? [];
  },
  ["ad-candidates"],
  { revalidate: 60, tags: [TAGS.jobs] },
);

export async function AdSlot({ slot, districtId, categoryId }: { slot: Slot; districtId?: number | null; categoryId?: number | null }) {
  const ads = await getAdCandidates(slot, districtId ?? null);
  if (!ads.length) return null;
  const pick =
    (districtId && categoryId && ads.find((a) => a.district_id === districtId && a.category_id === categoryId)) ||
    (districtId && ads.find((a) => a.district_id === districtId && !a.category_id)) ||
    ads.find((a) => !a.district_id && (!a.category_id || a.category_id === categoryId)) ||
    null;
  if (!pick) return null;
  after(async () => {
    await createPublicClient().rpc("record_ad_impressions", { p_ids: [pick.id] });
  });
  const t = await getTranslations("common");
  const src = storageUrl("job-images", pick.image_path) ?? pick.image_path;

  return (
    <aside className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("advertisement")}</p>
      <a href={`/go/${pick.id}`} rel="sponsored noopener" className="block p-3">
        <div className="relative aspect-[3/1] overflow-hidden rounded-lg bg-muted">
          <Image src={src} alt={pick.title} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
        </div>
        <p className="mt-2 text-sm font-semibold">{pick.title}</p>
      </a>
    </aside>
  );
}
