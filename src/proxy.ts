import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const intl = createIntlMiddleware(routing);

const AUTH_REQUIRED = [/^\/dashboard(\/|$)/, /^\/jobs\/new$/, /^\/jobs\/[^/]+\/edit$/, /^\/admin(\/|$)/];
const STAFF_ONLY = /^\/admin(\/|$)/;

/**
 * Locale routing + session refresh + an optimistic gate for signed-in and
 * staff areas. This is a convenience redirect only — every admin page and
 * server action re-checks, and the database enforces it regardless.
 */
export async function proxy(request: NextRequest) {
  const response = intl(request);
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;

  const { supabase, userId } = await updateSession(request, response);

  const [, maybeLocale, ...rest] = request.nextUrl.pathname.split("/");
  const locale = (routing.locales as readonly string[]).includes(maybeLocale) ? maybeLocale : null;
  if (!locale) return response;
  const path = "/" + rest.join("/");

  if (AUTH_REQUIRED.some((re) => re.test(path)) && !userId) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (STAFF_ONLY.test(path) && userId) {
    const { data } = await supabase.from("user_roles").select("role").in("role", ["admin", "moderator"]);
    if (!data?.length) return withCookies(NextResponse.redirect(new URL(`/${locale}`, request.url)), response);
  }

  return response;
}

function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}

export const config = {
  matcher: ["/((?!api|auth|go/|_next|_vercel|.*\\..*).*)"],
};
