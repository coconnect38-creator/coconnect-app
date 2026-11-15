/**
 * RLS + invariant test suite. Runs entirely inside ONE transaction against
 * DATABASE_URL and rolls it back at the end, so it leaves no data behind.
 *
 * Each step impersonates a user exactly the way PostgREST does:
 *   set local role authenticated; request.jwt.claims = {"sub": <uid>}
 *
 *   npm run db:test
 */
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { Client, type QueryResult } from "pg";

config({ path: ".env.local", quiet: true });

type Who = string | "anon";
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const uid: Record<string, string> = {};
let passed = 0;
const failures: string[] = [];

async function run(who: Who | null, sql: string, params: unknown[] = []): Promise<QueryResult> {
  // uid values are server-generated UUIDs, so inlining them is safe; it saves round trips.
  const claims = who === "anon" ? '{"role":"anon"}' : who ? JSON.stringify({ sub: uid[who], role: "authenticated" }) : "";
  const enter = who
    ? `savepoint step; set local role ${who === "anon" ? "anon" : "authenticated"}; select set_config('request.jwt.claims', '${claims}', true);`
    : "savepoint step;";
  const leave = "reset role; select set_config('request.jwt.claims', '', true);";
  await db.query(enter);
  try {
    const res = await db.query(sql, params);
    await db.query(`${leave} release savepoint step;`);
    return res;
  } catch (e) {
    await db.query(`rollback to savepoint step; ${leave} release savepoint step;`);
    throw e;
  }
}

function record(ok: boolean, name: string, detail = "") {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m ${detail}`);
  }
}

async function ok(name: string, who: Who | null, sql: string, params: unknown[] = [], check?: (r: QueryResult) => boolean) {
  try {
    const r = await run(who, sql, params);
    const good = check ? check(r) : true;
    record(good, name, good ? "" : `→ got ${JSON.stringify(r.rows).slice(0, 300)}`);
    return r;
  } catch (e) {
    record(false, name, `→ threw: ${(e as Error).message}`);
    return null;
  }
}

// Run an action as `who`, then verify the resulting state as the superuser.
async function okThen(name: string, who: Who, action: string, params: unknown[], checkSql: string, checkParams: unknown[],
                      check: (r: QueryResult) => boolean) {
  try {
    await run(who, action, params);
  } catch (e) {
    record(false, name, `→ threw: ${(e as Error).message}`);
    return;
  }
  await ok(name, null, checkSql, checkParams, check);
}

async function fails(name: string, who: Who | null, sql: string, params: unknown[], pattern: RegExp) {
  try {
    const r = await run(who, sql, params);
    record(false, name, `→ expected error ${pattern}, succeeded with ${JSON.stringify(r.rows).slice(0, 200)}`);
  } catch (e) {
    const msg = (e as Error).message;
    record(pattern.test(msg), name, `→ wrong error: ${msg}`);
  }
}

const one = (r: QueryResult) => r.rows[0];
const count = (n: number) => (r: QueryResult) => r.rowCount === n;

async function createUser(key: string, name: string, phone?: string) {
  const id = randomUUID();
  uid[key] = id;
  await db.query(
    `insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data,
                             created_at, updated_at, email_confirmed_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, '{}', now(), now(), now())`,
    [id, `${key}-${id.slice(0, 8)}@test.coconnect.invalid`, { full_name: name }],
  );
  if (phone) await db.query("update profiles set phone = $2 where id = $1", [id, phone]);
}

async function main() {
  await db.connect();
  await db.query("begin");
  try {
    await suite();
  } finally {
    await db.query("rollback");
    await db.end();
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

async function suite() {
  console.log("setup");
  await createUser("pub", "Publisher Perera", "+94771111111");
  await createUser("w1", "Worker One", "+94772222222");
  await createUser("w2", "Worker Two", "+94773333333");
  await createUser("brk", "Broker Bandara", "+94774444444");
  await createUser("x", "Stranger Silva", "+94775555555");
  await createUser("mod", "Moderator Mendis", "+94776666666");
  await createUser("adm", "Admin Abeysekara", "+94777777777");
  await createUser("nophone", "No Phone Nimal");
  await db.query("insert into user_roles (user_id, role) values ($1,'moderator'), ($2,'admin'), ($2,'moderator')", [
    uid.mod,
    uid.adm,
  ]);
  const cat = (await db.query("select id from categories where slug = 'coconut-plucking'")).rows[0].id;
  const dist = (await db.query("select id from districts where slug = 'kurunegala'")).rows[0].id;

  console.log("\nsignup trigger + roles");
  await ok("new user gets profile + publisher/worker roles", null,
    "select array_agg(role order by role)::text r from user_roles where user_id = $1", [uid.w1],
    (r) => one(r).r === "{publisher,worker}");
  await fails("user cannot insert own role row directly", "w1",
    "insert into user_roles (user_id, role) values ($1, 'moderator')", [uid.w1], /permission denied/);
  await fails("add_my_role refuses moderator", "w1", "select add_my_role('moderator')", [], /role_not_self_service/);
  await ok("add_my_role broker sets is_broker", "brk",
    "select add_my_role('broker'); select is_broker from profiles where id = auth.uid()", [],
    (r) => (r as unknown as QueryResult[])[1].rows[0].is_broker === true);
  await fails("admin_set_role cannot grant admin", "adm",
    "select admin_set_role($1, 'admin', true)", [uid.x], /forbidden/);
  await fails("non-admin cannot grant roles", "mod",
    "select admin_set_role($1, 'moderator', true)", [uid.x], /forbidden/);

  console.log("\nphone protection (layers 1-2)");
  await fails("anon cannot read profiles", "anon", "select * from profiles", [], /permission denied/);
  await ok("user reads only own profile row", "w1", "select id, phone from profiles", [],
    (r) => r.rowCount === 1 && one(r).id === uid.w1);
  await ok("public_profiles readable by anon", "anon", "select * from public_profiles where id = $1", [uid.pub], count(1));
  await ok("public_profiles has no phone column", "anon",
    "select * from public_profiles limit 1", [], (r) => !r.fields.some((f) => f.name === "phone"));
  await fails("user cannot raise own rating", "w1",
    "update profiles set rating_avg = 5 where id = auth.uid()", [], /permission denied/);
  await fails("user cannot unsuspend self / set phone_verified", "w1",
    "update profiles set phone_verified = true where id = auth.uid()", [], /permission denied/);
  await ok("changing phone resets phone_verified", null,
    "update profiles set phone_verified = true where id = $1", [uid.x]);
  await ok("…user edits phone → unverified", "x",
    "update profiles set phone = '+94775555556' where id = auth.uid() returning phone_verified", [],
    (r) => one(r).phone_verified === false);
  await ok("user cannot update someone else's profile (0 rows)", "w1",
    "update profiles set full_name = 'Hacked' where id = $1", [uid.pub], count(0));

  console.log("\njob posting + moderation");
  const jobSql = `insert into jobs (publisher_id, category_id, title, description, district_id, workers_needed, days_needed, suggested_rate, rate_unit, lat, lng)
                  values (auth.uid(), $1, 'Coconut plucking, 400 trees', 'Need experienced pluckers for a 400 tree estate near Kuliyapitiya town.', $2, 4, 2, 3000, 'per_worker_per_day', 7.4718391, 80.0412345)
                  returning id, lat, contact_flags`;
  const jr = await ok("publisher inserts a draft job", "pub", jobSql, [cat, dist], count(1));
  const job = jr?.rows[0].id as string;
  record(jr?.rows[0].lat === 7.47, "lat/lng coarsened to 2 decimals", `got ${jr?.rows[0].lat}`);
  await fails("cannot insert a job straight into published", "pub",
    `insert into jobs (publisher_id, category_id, title, description, district_id, suggested_rate, status)
     values (auth.uid(), $1, 'Sneaky published job', 'This should never be allowed to skip moderation at all.', $2, 1000, 'published')`,
    [cat, dist], /permission denied/);
  await fails("cannot insert a job for someone else", "x",
    `insert into jobs (publisher_id, category_id, title, description, district_id, suggested_rate)
     values ($3, $1, 'Impersonated job post', 'Posting on behalf of another user should be blocked.', $2, 1000)`,
    [cat, dist, uid.pub], /row-level security/);
  await fails("publisher cannot set status directly", "pub",
    "update jobs set status = 'published' where id = $1", [job], /permission denied/);
  await ok("auto-flag catches phone/WhatsApp in description", "pub",
    "update jobs set description = description || ' Call 077 123 4567 or WhatsApp me' where id = $1 returning contact_flags",
    [job], (r) => one(r).contact_flags.some((f: string) => f.startsWith("phone:")) && one(r).contact_flags.some((f: string) => f.startsWith("messenger:")));
  await ok("…flags clear when text is fixed", "pub",
    "update jobs set description = 'Need experienced pluckers for a 400 tree estate near Kuliyapitiya town.' where id = $1 returning contact_flags",
    [job], (r) => one(r).contact_flags.length === 0);
  await fails("user without a phone cannot submit", "nophone",
    `with j as (insert into jobs (publisher_id, category_id, title, description, district_id, suggested_rate)
       values (auth.uid(), $1, 'No phone job title', 'A job from a user who has no phone number on file.', $2, 1000) returning id)
     select submit_job(id) from j`, [cat, dist], /phone_required/);
  await ok("submit_job (fees off) → pending_review", "pub", "select submit_job($1) s", [job],
    (r) => one(r).s === "pending_review");
  await ok("anon cannot see pending job", "anon", "select id from jobs where id = $1", [job], count(0));
  await ok("stranger cannot see pending job", "x", "select id from jobs where id = $1", [job], count(0));
  await ok("moderator sees pending job", "mod", "select id from jobs where id = $1", [job], count(1));
  await fails("ordinary user cannot approve", "x", "select admin_review_job($1, true)", [job], /forbidden/);
  await fails("reject requires a reason", "mod", "select admin_review_job($1, false, '')", [job], /reason_required/);
  await okThen("moderator approves → published, expires in 30 days", "mod", "select admin_review_job($1, true)", [job],
    "select status, expires_at > now() + interval '29 days' as exp from jobs where id = $1", [job],
    (r) => one(r).status === "published" && one(r).exp === true);
  await ok("approval written to admin_actions", null,
    "select 1 from admin_actions where action = 'job.approve' and target_id = $1 and actor_id = $2", [job, uid.mod], count(1));
  await ok("anon sees published job", "anon", "select id from jobs where id = $1", [job], count(1));
  await ok("publisher cannot edit a published job (0 rows)", "pub",
    "update jobs set suggested_rate = 1 where id = $1 returning id", [job], count(0));
  // Moderator's own job is a conflict of interest.
  const mj = await run("mod",
    `insert into jobs (publisher_id, category_id, title, description, district_id, suggested_rate)
     values (auth.uid(), $1, 'Moderator own job post', 'Moderators must not approve their own job postings.', $2, 1000) returning id`,
    [cat, dist]);
  await run("mod", "select submit_job($1)", [mj.rows[0].id]);
  await fails("moderator cannot approve own job", "mod", "select admin_review_job($1, true)", [mj.rows[0].id], /own_job/);

  console.log("\nbidding");
  await fails("publisher cannot bid on own job", "pub",
    "select place_bid($1, 2800, 'per_worker_per_day', 1, 2)", [job], /self_bid/);
  await fails("direct insert into bids is not granted", "w1",
    "insert into bids (job_id, bidder_id, rate, rate_unit) values ($1, auth.uid(), 1, 'per_day')", [job], /permission denied/);
  await fails("worker cannot bid a crew without broker role", "w1",
    "select place_bid($1, 2800, 'per_worker_per_day', 3, 2)", [job], /broker_required/);
  const b1 = (await ok("w1 bids", "w1", "select place_bid($1, 2900, 'per_worker_per_day', 1, 2, 'Experienced', null) id", [job]))?.rows[0].id;
  const b2 = (await ok("w2 bids", "w2", "select place_bid($1, 3100, 'per_worker_per_day', 1, 2) id", [job]))?.rows[0].id;
  const bb = (await ok("broker bids a crew of 3", "brk", "select place_bid($1, 2700, 'per_worker_per_day', 3, 2) id", [job]))?.rows[0].id;
  await ok("total_amount computed by Postgres (2700 × 3 × 2)", null,
    "select total_amount from bids where id = $1", [bb], (r) => Number(one(r).total_amount) === 16200);
  await ok("w1 edits own pending bid (same row)", "w1",
    "select place_bid($1, 2850, 'per_worker_per_day', 1, 2) id", [job], (r) => one(r).id === b1);
  await ok("w1 sees only own bid", "w1", "select bidder_id from bids where job_id = $1", [job],
    (r) => r.rowCount === 1 && one(r).bidder_id === uid.w1);
  await ok("stranger sees no bids", "x", "select id from bids where job_id = $1", [job], count(0));
  await ok("moderator sees no bids", "mod", "select id from bids where job_id = $1", [job], count(0));
  await fails("anon cannot read bids at all", "anon", "select id from bids", [], /permission denied/);
  await ok("publisher sees all 3 bids", "pub", "select id from bids where job_id = $1", [job], count(3));
  await ok("public bid_count = 3, lowest_rate = 2700", "anon",
    "select bid_count, lowest_rate from jobs where id = $1", [job],
    (r) => one(r).bid_count === 3 && Number(one(r).lowest_rate) === 2700);
  await fails("stranger cannot shortlist", "x", "select set_bid_shortlisted($1, true)", [b2], /not_found/);
  await ok("publisher shortlists w2", "pub", "select set_bid_shortlisted($1, true)", [b2]);
  await fails("bidder cannot edit a shortlisted bid", "w2",
    "select place_bid($1, 1, 'per_worker_per_day', 1, 2)", [job], /bid_locked/);
  await ok("w2 notified of shortlist", null,
    "select 1 from notifications where user_id = $1 and type = 'bid_shortlisted'", [uid.w2], count(1));
  await db.query("update profiles set is_suspended = true where id = $1", [uid.x]);
  await fails("suspended user cannot bid", "x", "select place_bid($1, 100, 'per_day', 1, 1)", [job], /account_suspended/);
  await db.query("update profiles set is_suspended = false where id = $1", [uid.x]);

  console.log("\naward + contact reveal (layer 3, multi-award)");
  await ok("no award yet → get_job_contact returns nothing", "w1", "select * from get_job_contact($1)", [job], count(0));
  await ok("…and the failed lookup is logged", null,
    "select 1 from contact_lookup_failures where user_id = $1 and job_id = $2", [uid.w1, job], count(1));
  await fails("stranger cannot award", "x", "select award_bid($1)", [b1], /not_found/);
  await fails("bidder cannot award self", "w1", "select award_bid($1)", [b1], /not_found/);
  await ok("publisher awards broker crew (3 of 4 needed)", "pub", "select award_bid($1)", [bb]);
  await ok("job stays published while partially filled", "anon", "select status from jobs where id = $1", [job],
    (r) => one(r).status === "published");
  await ok("broker gets publisher's phone", "brk", "select phone, counterpart from get_job_contact($1)", [job],
    (r) => r.rowCount === 1 && one(r).phone === "+94771111111" && one(r).counterpart === "publisher");
  await ok("publisher gets broker's phone", "pub", "select phone from get_job_contact($1)", [job],
    (r) => r.rowCount === 1 && one(r).phone === "+94774444444");
  await ok("unawarded bidder still gets nothing", "w1", "select * from get_job_contact($1)", [job], count(0));
  await ok("stranger gets nothing", "x", "select * from get_job_contact($1)", [job], count(0));
  await ok("awards visible to the two parties only", "w2", "select id from awards where job_id = $1", [job], count(0));
  await okThen("publisher awards w1 → 4/4 filled, hiring closes", "pub", "select award_bid($1)", [b1],
    "select status, hiring_closed_at is not null c from jobs where id = $1", [job],
    (r) => one(r).status === "in_progress" && one(r).c === true);
  await ok("remaining bid auto-rejected", null, "select status, auto_rejected from bids where id = $1", [b2],
    (r) => one(r).status === "rejected" && one(r).auto_rejected === true);
  await fails("late bid after award is rejected by lock trigger", "x",
    "select place_bid($1, 100, 'per_day', 1, 1)", [job], /job_not_open/);
  await ok("publisher now sees 2 contacts", "pub", "select phone from get_job_contact($1) order by phone", [job], count(2));
  await ok("w1 sees job after it left published (bidder policy)", "w1", "select id from jobs where id = $1", [job], count(1));
  await ok("anon no longer sees in-progress job", "anon", "select id from jobs where id = $1", [job], count(0));

  console.log("\ncancel award → job reopens");
  const aw1 = (await db.query("select id from awards where bid_id = $1", [b1])).rows[0].id;
  const awb = (await db.query("select id from awards where bid_id = $1", [bb])).rows[0].id;
  await fails("stranger cannot cancel an award", "x", "select cancel_award($1, 'nope')", [aw1], /not_found/);
  await ok("w1 cancels own award", "w1", "select cancel_award($1, 'Fell sick')", [aw1]);
  await ok("job back to published, auto-rejected bid restored", null,
    "select (select status from jobs where id = $1) js, (select status from bids where id = $2) bs", [job, b2],
    (r) => one(r).js === "published" && one(r).bs === "pending");
  await ok("w1 lost contact access", "w1", "select * from get_job_contact($1)", [job], count(0));
  await okThen("publisher closes hiring with broker only", "pub", "select close_hiring($1)", [job],
    "select status from jobs where id = $1", [job], (r) => one(r).status === "in_progress");

  console.log("\ncompletion + reviews");
  await fails("cannot review before completion", "brk",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ($1, auth.uid(), $2, 5)", [job, uid.pub],
    /row-level security/);
  await ok("broker marks complete → requested", "brk", "select mark_award_complete($1) s", [awb],
    (r) => one(r).s === "requested");
  await ok("same party again → still requested", "brk", "select mark_award_complete($1) s", [awb],
    (r) => one(r).s === "requested");
  await okThen("publisher confirms → completed; job completed", "pub", "select mark_award_complete($1)", [awb],
    "select status from jobs where id = $1", [job], (r) => one(r).status === "completed");
  await ok("broker jobs_completed incremented", null, "select jobs_completed from profiles where id = $1", [uid.brk],
    (r) => one(r).jobs_completed === 1);
  await ok("broker reviews publisher", "brk",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating, comment) values ($1, auth.uid(), $2, 4, 'Paid on time')",
    [job, uid.pub]);
  await ok("publisher reviews broker", "pub",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ($1, auth.uid(), $2, 5)", [job, uid.brk]);
  await fails("cannot review twice", "pub",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ($1, auth.uid(), $2, 1)", [job, uid.brk],
    /duplicate key/);
  await fails("cannot review cancelled awardee", "pub",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ($1, auth.uid(), $2, 1)", [job, uid.w1],
    /row-level security/);
  await fails("stranger cannot review", "x",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ($1, auth.uid(), $2, 1)", [job, uid.pub],
    /row-level security/);
  await fails("cannot forge reviewer_id", "x",
    "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ($1, $2, $3, 1)", [job, uid.brk, uid.pub],
    /row-level security/);
  await ok("rating recalculated on publisher", "anon", "select rating_avg, rating_count from public_profiles where id = $1",
    [uid.pub], (r) => Number(one(r).rating_avg) === 4 && one(r).rating_count === 1);
  await ok("hidden review drops out of rating", "mod",
    "select admin_set_hidden('review', (select id from reviews where reviewee_id = $1), true)", [uid.pub]);
  await ok("…rating_count back to 0", "anon", "select rating_count from public_profiles where id = $1", [uid.pub],
    (r) => one(r).rating_count === 0);

  console.log("\nQ&A threads + reports");
  const j2 = (await run("pub",
    `insert into jobs (publisher_id, category_id, title, description, district_id, suggested_rate)
     values (auth.uid(), $1, 'Second job for threads', 'A second published job to exercise Q&A and payments flow.', $2, 2500) returning id`,
    [cat, dist])).rows[0].id;
  await run("pub", "select submit_job($1)", [j2]);
  await run("mod", "select admin_review_job($1, true)", [j2]);
  const q = (await ok("stranger asks a question", "x",
    "insert into job_threads (job_id, author_id, kind, body) values ($1, auth.uid(), 'question', 'Is food provided? call me 0771234567') returning id, contact_flags",
    [j2], (r) => one(r).contact_flags.length > 0))?.rows[0].id;
  await ok("publisher notified of question", null,
    "select 1 from notifications where user_id = $1 and type = 'question_received'", [uid.pub], (r) => (r.rowCount ?? 0) >= 1);
  await ok("publisher answers", "pub",
    "insert into job_threads (job_id, parent_id, author_id, kind, body) values ($1, $2, auth.uid(), 'comment', 'Yes, lunch is provided.')",
    [j2, q]);
  await fails("cannot post as someone else", "w1",
    "insert into job_threads (job_id, author_id, kind, body) values ($1, $2, 'question', 'Impersonated')", [j2, uid.pub],
    /row-level security/);
  await ok("author can edit within 15 minutes", "x", "update job_threads set body = 'Is food provided?' where id = $1", [q], count(1));
  await ok("others cannot edit it", "w1", "update job_threads set body = 'hijack' where id = $1", [q], count(0));
  await ok("report a thread", "w1",
    "insert into reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'thread', $1, 'contact_info')", [q]);
  await ok("reporter sees own report; stranger does not", "w2", "select id from reports", [], count(0));
  await ok("moderator sees report", "mod", "select id from reports where target_id = $1", [q], count(1));
  await ok("moderator hides thread", "mod", "select admin_set_hidden('thread', $1, true)", [q]);
  await ok("hidden thread invisible to anon", "anon", "select id from job_threads where id = $1", [q], count(0));
  await ok("…but visible to its author", "x", "select id from job_threads where id = $1", [q], count(1));

  console.log("\npayments (fees_enabled)");
  await db.query("update app_settings set value = 'true' where key = 'fees_enabled'");
  await db.query("update categories set publish_fee_lkr = 750.50 where id = $1", [cat]);
  const j3 = (await run("pub",
    `insert into jobs (publisher_id, category_id, title, description, district_id, suggested_rate)
     values (auth.uid(), $1, 'Paid job posting test', 'With fees enabled this job must wait for a verified payment.', $2, 2500) returning id`,
    [cat, dist])).rows[0].id;
  await ok("submit with fees on → pending_payment + 6-char ref", "pub",
    "select submit_job($1) s, (select payment_ref from jobs where id = $1) ref", [j3],
    (r) => one(r).s === "pending_payment");
  const ref = (await db.query("select payment_ref from jobs where id = $1", [j3])).rows[0].payment_ref;
  record(/^[A-HJ-NP-Z2-9]{6}$/.test(ref), "payment_ref is 6 unambiguous chars", ref);
  await fails("slip path must be in own folder", "pub",
    "select submit_payment_slip($1, $2, 'ABC')", [j3, `${uid.x}/slip.webp`], /invalid_slip/);
  const pay = (await ok("publisher uploads slip; amount from category", "pub",
    "select submit_payment_slip($1, $2, $3) id", [j3, `${uid.pub}/${j3}/slip.webp`, ref]))?.rows[0].id;
  await ok("amount is exact incl. cents", null, "select amount_lkr from payments where id = $1", [pay],
    (r) => one(r).amount_lkr === "750.50");
  await fails("duplicate pending slip refused", "pub",
    "select submit_payment_slip($1, $2, $3)", [j3, `${uid.pub}/${j3}/slip2.webp`, ref], /payment_already_pending/);
  await ok("stranger cannot see payment", "x", "select id from payments where id = $1", [pay], count(0));
  await ok("moderator cannot see payments", "mod", "select id from payments where id = $1", [pay], count(0));
  await fails("moderator cannot verify payments", "mod", "select admin_verify_payment($1)", [pay], /forbidden/);
  await okThen("admin verifies → job to pending_review", "adm", "select admin_verify_payment($1)", [pay],
    "select status from jobs where id = $1", [j3], (r) => one(r).status === "pending_review");
  await fails("second verify is a no-op error (idempotent)", "adm", "select admin_verify_payment($1)", [pay],
    /payment_not_pending/);
  await db.query("update app_settings set value = 'false' where key = 'fees_enabled'");

  console.log("\nadmin-only tables");
  await ok("audit log hidden from moderators", "mod", "select id from admin_actions", [], count(0));
  await ok("audit log visible to admin", "adm", "select id from admin_actions", [], (r) => (r.rowCount ?? 0) > 0);
  await fails("anon cannot write settings", "anon", "update app_settings set value = 'true'", [], /permission denied/);
  await ok("public settings readable by anon", "anon", "select key from app_settings where key = 'fees_enabled'", [], count(1));
  await ok("non-admin category update matches 0 rows", "w1",
    "update categories set publish_fee_lkr = 0 where id = $1 returning id", [cat], count(0));
  await ok("category edits are audited", null,
    "select 1 from admin_actions where target_type = 'categories' and target_id = $1::text", [cat], (r) => (r.rowCount ?? 0) >= 1);
  await ok("notifications are private", "w1", "select id from notifications where user_id = $1", [uid.pub], count(0));
  await fails("admin_search_users is admin-only", "mod", "select * from admin_search_users('')", [], /forbidden/);
  await ok("admin_search_users returns email + phone", "adm", "select email, phone from admin_search_users('Broker')", [],
    (r) => r.rowCount === 1 && one(r).phone === "+94774444444");

  console.log("\nexpiry + auto-confirm");
  await db.query("update jobs set expires_at = now() - interval '1 minute' where id = $1", [j2]);
  await db.query("select expire_jobs()");
  await ok("expire_jobs expires an unawarded job", null, "select status from jobs where id = $1", [j2],
    (r) => one(r).status === "expired");
  await fails("expire_jobs is not callable by clients", "x", "select expire_jobs()", [], /permission denied/);
  await fails("notify() is not callable by clients", "x", "select notify(auth.uid(), 'x')", [], /permission denied/);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
