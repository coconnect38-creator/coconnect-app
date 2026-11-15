import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`./messages/${locale}.json`)).default;
  // Safety net: any key missing from si/ta (scripts/check-i18n.ts fails on that) falls back to English.
  if (locale !== "en") {
    const en = (await import("./messages/en.json")).default;
    return { locale, messages: deepMerge(en, messages), timeZone: "Asia/Colombo" };
  }
  return { locale, messages, timeZone: "Asia/Colombo" };
});

type Tree = { [key: string]: string | Tree };
function deepMerge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = typeof v === "object" && typeof b === "object" ? deepMerge(b, v) : v;
  }
  return out;
}
