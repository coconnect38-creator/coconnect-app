import "server-only";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type OwnProfile = Database["public"]["Tables"]["profiles"]["Row"];

export type Viewer = {
  id: string;
  email: string | null;
  profile: OwnProfile;
  roles: AppRole[];
  isStaff: boolean;
  isAdmin: boolean;
};

/**
 * The signed-in user, their own profile row (RLS: own row only) and roles.
 * Cached per request. Returns null when signed out.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (!profile) return null;
  const roles = (roleRows ?? []).map((r) => r.role);
  return {
    id: user.id,
    email: user.email ?? null,
    profile,
    roles,
    isStaff: roles.includes("admin") || roles.includes("moderator"),
    isAdmin: roles.includes("admin"),
  };
});

export async function requireViewer(locale: Locale, next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect({ href: { pathname: "/login", query: next ? { next } : {} }, locale });
    throw new Error("unreachable");
  }
  return viewer;
}

export async function requireStaff(locale: Locale): Promise<Viewer> {
  const viewer = await requireViewer(locale);
  if (!viewer.isStaff) {
    redirect({ href: "/", locale });
  }
  return viewer;
}

export async function requireAdmin(locale: Locale): Promise<Viewer> {
  const viewer = await requireViewer(locale);
  if (!viewer.isAdmin) {
    redirect({ href: "/admin", locale });
  }
  return viewer;
}

/** A profile is "complete" once it has a name, district and phone. */
export function isProfileComplete(p: OwnProfile) {
  return Boolean(p.full_name && p.district_id && p.phone);
}
