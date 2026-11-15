import type { routing } from "@/i18n/routing";
import type messages from "@/i18n/messages/en.json";

// Type-checks every translation key at compile time (npm run typecheck).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
