/**
 * Locale parity check: si and ta must have exactly the keys in en, and each
 * string must use the same {placeholders} (plural/select arguments included).
 *   npx tsx scripts/check-i18n.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Tree = { [k: string]: string | Tree };
const dir = join(__dirname, "..", "src", "i18n", "messages");
const load = (l: string) => JSON.parse(readFileSync(join(dir, `${l}.json`), "utf8")) as Tree;
const keys = (t: Tree, prefix = ""): string[] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));

const get = (t: Tree, key: string) => key.split(".").reduce<string | Tree>((n, k) => (n as Tree)[k], t) as string;
// Top-level ICU argument names: "{count, plural, one {# x}}" → count; nested branch text is skipped.
const args = (msg: string) => {
  const out = new Set<string>();
  let depth = 0;
  for (let i = 0; i < msg.length; i++) {
    if (msg[i] === "{") {
      if (depth === 0) out.add(msg.slice(i + 1).match(/^\s*(\w+)/)?.[1] ?? "");
      depth++;
    } else if (msg[i] === "}") depth--;
  }
  return [...out].sort().join(",");
};

const enTree = load("en");
const en = new Set(keys(enTree));
let failed = false;
for (const locale of ["si", "ta"] as const) {
  const tree = load(locale);
  const other = new Set(keys(tree));
  const missing = [...en].filter((k) => !other.has(k));
  const extra = [...other].filter((k) => !en.has(k));
  const mismatched = [...en].filter((k) => other.has(k) && args(get(enTree, k)) !== args(get(tree, k)));
  if (missing.length) console.log(`ERROR: ${locale} missing ${missing.length} key(s):\n  ${missing.join("\n  ")}`);
  if (extra.length) console.log(`ERROR: ${locale} has keys not in en:\n  ${extra.join("\n  ")}`);
  if (mismatched.length) console.log(`ERROR: ${locale} placeholders differ from en:\n  ${mismatched.join("\n  ")}`);
  if (missing.length || extra.length || mismatched.length) failed = true;
}
// Every namespace a client component uses must be shipped to the browser.
import("../src/i18n/client-messages").then(({ CLIENT_NAMESPACES }) => {
  const src = join(__dirname, "..", "src");
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.tsx?$/.test(e.name) ? [join(d, e.name)] : []));
  for (const file of walk(src)) {
    const code = readFileSync(file, "utf8");
    if (!code.startsWith('"use client"')) continue;
    for (const m of code.matchAll(/useTranslations\("([^"]+)"\)/g)) {
      if (!(CLIENT_NAMESPACES as readonly string[]).includes(m[1])) {
        console.log(`ERROR: ${file.replace(src, "src")} uses "${m[1]}" which is not in CLIENT_NAMESPACES`);
        failed = true;
      }
    }
  }
  console.log(failed ? "i18n check failed" : "i18n check passed");
  process.exit(failed ? 1 : 0);
});
