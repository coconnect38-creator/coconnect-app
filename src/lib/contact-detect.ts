/**
 * Client-side mirror of the database's detect_contact_info(): used to warn a
 * user BEFORE they post contact details. The database version is authoritative.
 */
const PHONE = /(?:\+|00)?[0-9][0-9 ().-]{7,}[0-9]/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MESSENGER = /(whats\s*app|wa\.me|viber|telegram|t\.me\/|\bimo\b|signal)/gi;

export function detectContactInfo(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.match(PHONE) ?? []) {
    const d = m.replace(/[^0-9]/g, "");
    if (d.length >= 9 && d.length <= 13) out.add(`phone:${m.replace(/[^0-9+]/g, "")}`);
  }
  for (const m of text.match(EMAIL) ?? []) out.add(`email:${m.toLowerCase()}`);
  for (const m of text.match(MESSENGER) ?? []) out.add(`messenger:${m.toLowerCase()}`);
  return [...out];
}
