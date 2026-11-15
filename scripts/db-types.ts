/** Regenerate src/lib/database.types.ts from the hosted database (no Docker needed). */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const out = execFileSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--db-url", process.env.DATABASE_URL!, "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 32 * 1024 * 1024 },
);
const start = out.indexOf("export type Json");
writeFileSync(join(__dirname, "..", "src", "lib", "database.types.ts"), out.slice(start));
console.log("wrote src/lib/database.types.ts");
