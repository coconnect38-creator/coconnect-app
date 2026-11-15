import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cookieless client with the publishable key: it sees exactly what RLS allows
 * the `anon` role, never a user's own rows. That is what makes its results
 * safe to share between visitors in `unstable_cache` (see lib/data/*).
 * Never use it for anything user-specific.
 */
let client: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicClient() {
  client ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Cache tags for public data, invalidated by the server actions that change it. */
export const TAGS = { reference: "reference", categories: "categories", settings: "settings", jobs: "public-jobs" } as const;
