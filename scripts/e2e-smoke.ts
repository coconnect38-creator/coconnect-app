/**
 * End-to-end smoke test against a running app (default http://localhost:3000).
 * Creates two confirmed users + a moderator through the Auth admin API, signs
 * them in to get real session cookies, then fetches rendered pages over HTTP.
 * The key assertion: a phone number appears in the HTML only after an award.
 * Everything it creates is deleted at the end.
 *
 *   npx tsx scripts/e2e-smoke.ts [baseUrl]
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
const BASE = process.argv[2] ?? "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const tag = Date.now().toString(36);
const created: string[] = [];
let passed = 0;
const failures: string[] = [];

function check(ok: boolean, name: string, detail = "") {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m ${detail}`);
  }
}

type Session = { id: string; cookie: string; client: SupabaseClient };

async function makeUser(key: string, name: string, phone: string): Promise<Session> {
  const email = `e2e-${key}-${tag}@test.coconnect.invalid`;
  const password = `pw-${tag}-${key}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw error;
  created.push(data.user.id);
  await db.query("update profiles set phone = $2, district_id = (select id from districts where slug = 'kurunegala') where id = $1", [data.user.id, phone]);
  // Sign in through @supabase/ssr so we get the exact cookies the app expects.
  const jar = new Map<string, string>();
  const ssr = createServerClient(URL_, ANON, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach((c) => jar.set(c.name, c.value)) },
  });
  const { error: e2 } = await ssr.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), client };
}

async function get(path: string, s?: Session) {
  const res = await fetch(BASE + path, { headers: s ? { cookie: s.cookie } : {}, redirect: "manual" });
  return { status: res.status, html: await res.text(), location: res.headers.get("location") };
}

async function main() {
  await db.connect();
  try {
    await run();
  } finally {
    // Jobs first (cascades bids/awards/reviews/threads), then users.
    await db.query("delete from jobs where publisher_id = any($1)", [created]);
    await db.query("delete from reports where reporter_id = any($1)", [created]);
    for (const id of created) await admin.auth.admin.deleteUser(id);
    await db.end();
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

async function run() {
  console.log("public pages");
  for (const p of ["/en", "/si", "/ta", "/en/jobs", "/si/jobs", "/en/login", "/en/register", "/en/how-it-works", "/si/faq", "/en/terms", "/si/privacy", "/sitemap.xml", "/robots.txt"]) {
    const r = await get(p);
    check(r.status === 200, `GET ${p} → 200`, `got ${r.status}`);
  }
  const root = await get("/");
  check(root.status === 307 || root.status === 308, "GET / redirects to a locale", `got ${root.status}`);
  const gated = await get("/en/dashboard");
  check(gated.status === 307 && (gated.location ?? "").includes("/en/login"), "dashboard redirects anon to login", `${gated.status} ${gated.location}`);
  const adminGate = await get("/en/admin");
  check(adminGate.status === 307, "admin redirects anon", `${adminGate.status}`);
  const si = await get("/si/jobs");
  check(si.html.includes("රැකියා සොයන්න"), "Sinhala strings render");
  const ta = await get("/ta/jobs");
  check(ta.html.includes("வேலை தேடுங்கள்"), "Tamil strings render");

  console.log("\nusers");
  const pub = await makeUser("pub", "E2E Publisher", "+94771230001");
  const wrk = await makeUser("wrk", "E2E Worker", "+94771230002");
  const mod = await makeUser("mod", "E2E Moderator", "+94771230003");
  await db.query("insert into user_roles (user_id, role) values ($1, 'moderator')", [mod.id]);
  check(true, "created publisher, worker, moderator");
  const dash = await get("/en/dashboard", pub);
  check(dash.status === 200 && dash.html.includes("E2E"), "signed-in dashboard renders", `${dash.status}`);
  const nonStaff = await get("/en/admin", pub);
  check(nonStaff.status === 307, "non-staff bounced from /admin", `${nonStaff.status}`);

  console.log("\njob lifecycle");
  const cat = (await db.query("select id from categories where slug = 'coconut-plucking'")).rows[0].id;
  const dist = (await db.query("select id from districts where slug = 'kurunegala'")).rows[0].id;
  const { data: job, error } = await pub.client
    .from("jobs")
    .insert({ publisher_id: pub.id, category_id: cat, district_id: dist, title: `E2E plucking job ${tag}`, description: "End to end test job for plucking 200 trees near the town.", suggested_rate: 3000, rate_unit: "per_worker_per_day", workers_needed: 1, days_needed: 1 })
    .select("id")
    .single();
  check(!error && !!job, "publisher creates draft via RLS", error?.message);
  const jobId = job!.id as string;
  const sub = await pub.client.rpc("submit_job", { p_job_id: jobId });
  check(sub.data === "pending_review", "submit_job → pending_review", JSON.stringify(sub));
  check((await get(`/en/jobs/${jobId}`)).status === 404, "pending job is 404 for anon");
  const queue = await get("/en/admin/moderation", mod);
  check(queue.status === 200 && queue.html.includes(`E2E plucking job ${tag}`), "moderator sees job in queue", `${queue.status}`);
  const appr = await mod.client.rpc("admin_review_job", { p_job_id: jobId, p_approve: true, p_reason: null });
  check(!appr.error, "moderator approves", appr.error?.message);
  const pubPage = await get(`/en/jobs/${jobId}`);
  check(pubPage.status === 200 && pubPage.html.includes(`E2E plucking job ${tag}`), "published job visible to anon");
  const listing = await get(`/en/jobs?district=${dist}&category=${cat}`);
  check(listing.html.includes(`E2E plucking job ${tag}`), "listing finds job by district + category");
  const search = await get(`/en/jobs?q=${encodeURIComponent(`plucking job ${tag}`)}`);
  check(search.html.includes(`E2E plucking job ${tag}`), "text search finds job");

  console.log("\nbid → award → contact reveal");
  const bid = await wrk.client.rpc("place_bid", { p_job_id: jobId, p_rate: 2800, p_rate_unit: "per_worker_per_day", p_workers: 1, p_days: 1, p_message: "Experienced", p_can_start_on: null });
  check(!bid.error, "worker bids", bid.error?.message);
  const before = await get(`/en/jobs/${jobId}`, wrk);
  check(!before.html.includes("+94771230001"), "BEFORE award: publisher phone NOT in worker's HTML");
  const ownerBefore = await get(`/en/dashboard/my-jobs/${jobId}`, pub);
  check(ownerBefore.status === 200 && ownerBefore.html.includes("E2E Worker") && !ownerBefore.html.includes("+94771230002"), "BEFORE award: owner sees bidder name, not phone");
  const award = await pub.client.rpc("award_bid", { p_bid_id: bid.data });
  check(!award.error, "publisher awards", award.error?.message);
  const after = await get(`/en/jobs/${jobId}`, wrk);
  check(after.html.includes("+94771230001"), "AFTER award: worker sees publisher phone");
  const ownerAfter = await get(`/en/dashboard/my-jobs/${jobId}`, pub);
  check(ownerAfter.html.includes("+94771230002"), "AFTER award: publisher sees worker phone");
  const strangerView = await get(`/en/jobs/${jobId}`, mod);
  check(!strangerView.html.includes("+94771230001") && !strangerView.html.includes("+94771230002"), "AFTER award: third party sees no phone");
  const anonView = await get(`/en/jobs/${jobId}`);
  check(!anonView.html.includes("+9477123000"), "AFTER award: anon sees no phone");
  // Public homepage data is cached across visitors: warm it as a signed-in user, then read it anonymously.
  await get("/en", pub);
  await get("/en", wrk);
  const anonHome = await get("/en");
  check(anonHome.status === 200 && !anonHome.html.includes("+9477123000") && !anonHome.html.includes("E2E Publisher") && !anonHome.html.includes("E2E Worker"),
    "shared homepage cache carries no user data");

  console.log("\ncompletion + review");
  const { data: aw } = await pub.client.from("awards").select("id").eq("job_id", jobId).single();
  await wrk.client.rpc("mark_award_complete", { p_award_id: aw!.id });
  const conf = await pub.client.rpc("mark_award_complete", { p_award_id: aw!.id });
  check(conf.data === "completed", "both parties confirm → completed", JSON.stringify(conf));
  const rev = await wrk.client.from("reviews").insert({ job_id: jobId, reviewer_id: wrk.id, reviewee_id: pub.id, rating: 5, comment: "Great" });
  check(!rev.error, "worker reviews publisher", rev.error?.message);
  const prof = await get(`/en/profile/${pub.id}`);
  check(prof.status === 200 && prof.html.includes("Great"), "review shows on public profile");
  const notes = await get("/en/dashboard/notifications", wrk);
  check(notes.html.includes("You got the job"), "worker has award notification");
  for (const p of ["/en/dashboard", "/en/dashboard/my-jobs", "/en/dashboard/my-bids", "/en/dashboard/settings", "/si/dashboard/settings", "/en/jobs/new", `/en/jobs/${jobId}/edit`]) {
    const r = await get(p, pub);
    check(r.status === 200 || r.status === 307, `GET ${p} as publisher → ${r.status}`);
  }

  console.log("\nstorage policies");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const own = await pub.client.storage.from("job-images").upload(`${pub.id}/${jobId}/e2e.png`, png, { contentType: "image/png" });
  check(!own.error, "user can upload to own job-images folder", own.error?.message);
  const foreign = await wrk.client.storage.from("job-images").upload(`${pub.id}/${jobId}/evil.png`, png, { contentType: "image/png" });
  check(!!foreign.error, "user cannot upload into someone else's folder");
  const slip = await pub.client.storage.from("bank-slips").upload(`${pub.id}/${jobId}/slip.png`, png, { contentType: "image/png" });
  check(!slip.error, "user can upload own bank slip", slip.error?.message);
  const peek = await wrk.client.storage.from("bank-slips").download(`${pub.id}/${jobId}/slip.png`);
  check(!!peek.error || !peek.data, "other user cannot download a bank slip");
  const anonSlip = await fetch(`${URL_}/storage/v1/object/public/bank-slips/${pub.id}/${jobId}/slip.png`);
  check(anonSlip.status >= 400, "bank-slips bucket has no public URL", `got ${anonSlip.status}`);
  const pubImg = await fetch(`${URL_}/storage/v1/object/public/job-images/${pub.id}/${jobId}/e2e.png`);
  check(pubImg.status === 200, "job image is publicly readable", `got ${pubImg.status}`);
  await admin.storage.from("job-images").remove([`${pub.id}/${jobId}/e2e.png`]);
  await admin.storage.from("bank-slips").remove([`${pub.id}/${jobId}/slip.png`]);

  console.log("\nadmin pages");
  const adm = await makeUser("adm", "E2E Admin", "+94771230004");
  await db.query("insert into user_roles (user_id, role) values ($1, 'admin'), ($1, 'moderator')", [adm.id]);
  for (const p of ["/en/admin", "/en/admin/moderation", "/en/admin/jobs", "/en/admin/reports", "/en/admin/users", "/en/admin/payments", "/en/admin/categories", "/en/admin/ads", "/en/admin/settings", "/en/admin/audit", "/si/admin/moderation"]) {
    const r = await get(p, adm);
    check(r.status === 200, `GET ${p} as admin → 200`, `got ${r.status}`);
  }
  const modOnly = await get("/en/admin/payments", mod);
  check(modOnly.status === 307, "moderator bounced from admin-only payments", `got ${modOnly.status}`);
  const users = await get(`/en/admin/users?q=${encodeURIComponent("E2E Worker")}`, adm);
  check(users.html.includes("+94771230002"), "admin user search shows phone (admin only)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
