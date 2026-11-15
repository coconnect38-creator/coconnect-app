import Script from "next/script";

/**
 * Sentry's Loader Script (~1 KB): it buffers errors and fetches the full
 * browser SDK only when one happens. The loader URL is keyed by the DSN's
 * public key; SDK options (no tracing/replay) are set in the Sentry project's
 * "Loader Script" settings. Renders nothing without NEXT_PUBLIC_SENTRY_DSN.
 */
export function SentryLoader() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  let key: string;
  try {
    key = new URL(dsn).username;
  } catch {
    return null;
  }
  if (!/^[a-f0-9]+$/i.test(key)) return null;
  return <Script src={`https://js.sentry-cdn.com/${key}.min.js`} crossOrigin="anonymous" strategy="afterInteractive" />;
}
