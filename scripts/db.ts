/**
 * Database ops against DATABASE_URL (the hosted Supabase project).
 *   tsx scripts/db.ts push            apply pending supabase/migrations/*.sql
 *   tsx scripts/db.ts seed            run supabase/seed.sql (idempotent)
 *   tsx scripts/db.ts make-admin <email>
 *
 * Applied migrations are recorded in supabase_migrations.schema_migrations, the
 * same table the Supabase CLI uses, so `supabase db push` stays compatible.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

const root = join(__dirname, "..", "supabase");

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env.local");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

async function push(db: Client) {
  await db.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key, statements text[], name text
    );`);
  const applied = new Set(
    (await db.query<{ version: string }>("select version from supabase_migrations.schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );
  const files = readdirSync(join(root, "migrations"))
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  let count = 0;
  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    if (applied.has(version)) continue;
    const sql = readFileSync(join(root, "migrations", file), "utf8");
    process.stdout.write(`applying ${file} … `);
    try {
      await db.query("begin");
      await db.query(sql);
      await db.query("insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)", [
        version,
        rest.join("_"),
        [sql],
      ]);
      await db.query("commit");
      console.log("ok");
      count++;
    } catch (e) {
      await db.query("rollback");
      console.log("FAILED");
      throw e;
    }
  }
  console.log(count ? `${count} migration(s) applied` : "up to date");
}

async function seed(db: Client) {
  await db.query(readFileSync(join(root, "seed.sql"), "utf8"));
  const { rows } = await db.query(
    "select (select count(*) from districts) d, (select count(*) from cities) c, (select count(*) from categories) cat",
  );
  console.log(`seeded: ${rows[0].d} districts, ${rows[0].c} cities, ${rows[0].cat} categories`);
}

// Admins are only ever created here, by someone holding the database password.
async function makeAdmin(db: Client, email?: string) {
  if (!email) throw new Error("usage: npm run db:make-admin -- someone@example.com");
  const { rows } = await db.query("select id from auth.users where lower(email) = lower($1)", [email]);
  if (!rows.length) throw new Error(`no auth user with email ${email} — sign up first`);
  await db.query(
    "insert into public.user_roles (user_id, role) values ($1, 'admin'), ($1, 'moderator') on conflict do nothing",
    [rows[0].id],
  );
  await db.query(
    "insert into public.admin_actions (actor_id, action, target_type, target_id, meta) values (null, 'role.grant', 'profile', $1, $2)",
    [rows[0].id, { role: "admin", via: "scripts/db.ts" }],
  );
  console.log(`${email} is now admin + moderator`);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const db = await connect();
  try {
    if (cmd === "push") await push(db);
    else if (cmd === "seed") await seed(db);
    else if (cmd === "make-admin") await makeAdmin(db, arg);
    else throw new Error(`unknown command: ${cmd}`);
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  if (e && typeof e === "object" && "position" in e) console.error("at position", (e as { position: string }).position);
  process.exit(1);
});
