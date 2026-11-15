import type { Locale } from "@/i18n/routing";

const intlLocale: Record<Locale, string> = { en: "en-LK", si: "si-LK", ta: "ta-LK" };

const money = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** LKR is always shown as `Rs. 3,500` (Latin digits in every locale). */
export function formatLKR(value: number | string | null | undefined, opts: { exact?: boolean } = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  return `Rs. ${(opts.exact ? moneyExact : money).format(n)}`;
}

export function formatDate(value: string | Date | null | undefined, locale: Locale, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  // Intl rejects dateStyle combined with explicit fields (month, year, …).
  const explicit = opts && ["year", "month", "day", "weekday", "hour", "minute"].some((k) => k in opts);
  return new Intl.DateTimeFormat(intlLocale[locale], {
    ...(explicit ? {} : { dateStyle: "medium" }),
    timeZone: "Asia/Colombo",
    ...opts,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale) {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(value: string | Date, locale: Locale, now = Date.now()) {
  const diff = (new Date(value).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(value, locale);
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}

/** Pick the localised column from a row with name_en/name_si/name_ta. */
export function localName(row: { name_en: string; name_si?: string | null; name_ta?: string | null } | null | undefined, locale: Locale) {
  if (!row) return "";
  return (locale === "si" ? row.name_si : locale === "ta" ? row.name_ta : row.name_en) || row.name_en;
}

/** Normalise a Sri Lankan mobile number to E.164 (+94XXXXXXXXX). Returns null if invalid. */
export function normalizeLkPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let local: string | null = null;
  if (/^\+94\d{9}$/.test(digits)) local = digits.slice(3);
  else if (/^0094\d{9}$/.test(digits)) local = digits.slice(4);
  else if (/^94\d{9}$/.test(digits)) local = digits.slice(2);
  else if (/^0\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^7\d{8}$/.test(digits)) local = digits;
  if (!local || !/^7\d{8}$/.test(local)) return null;
  return `+94${local}`;
}

export function maskPhone(e164: string) {
  return e164.replace(/^(\+94)(\d{2})\d{4}(\d{3})$/, "$1 $2 •••• $3");
}

/** Request-time clock for Server Components (kept out of render bodies for the purity lint). */
export const nowMs = () => Date.now();
