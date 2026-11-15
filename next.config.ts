import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "qzqdzgvatvguhdgvomkg.supabase.co";

const nextConfig: NextConfig = {
  // cacheComponents is intentionally off: almost every route reads the auth
  // cookie, so classic dynamic rendering is simpler and safer here.
  // See docs/00-decisions.md.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Images are compressed client-side first; this leaves room for 5 photos.
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
