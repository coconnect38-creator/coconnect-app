import { getPublicSettings } from "@/lib/data/reference";

export async function MaintenanceBanner() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const text = (await getPublicSettings()).maintenance_banner.trim();
  if (!text) return null;
  return <div className="bg-clay px-4 py-2 text-center text-sm font-semibold text-white">{text}</div>;
}
