import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Ad click: count it, then forward. Unknown/inactive ads go to the homepage. */
export async function GET(request: NextRequest, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL("/", request.url));
  const supabase = await createClient();
  const { data } = await supabase.rpc("record_ad_click", { p_id: id });
  const target = typeof data === "string" && /^https?:\/\//.test(data) ? data : new URL("/", request.url).toString();
  return NextResponse.redirect(target, 302);
}
