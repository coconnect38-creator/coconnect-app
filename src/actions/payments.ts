"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { toErrorCode } from "@/lib/errors";
import { isImageFile, processImage } from "@/lib/images";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validations/common";

/** Upload a bank slip to the PRIVATE bank-slips bucket and record a pending payment. */
export async function uploadSlip(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("not_authenticated");
  const jobId = String(form.get("job_id") ?? "");
  const bankRef = String(form.get("bank_ref") ?? "").trim().slice(0, 60);
  if (!uuid.safeParse(jobId).success) return fail("invalid_input");
  const file = form.get("slip");
  if (!isImageFile(file)) return fail("validation", { slip: ["required"] });

  let body: Buffer;
  let ext = "webp";
  let contentType = "image/webp";
  if (file.type === "application/pdf") {
    if (file.size > 8 * 1024 * 1024) return fail("validation", { slip: ["imageSize"] });
    body = Buffer.from(await file.arrayBuffer());
    ext = "pdf";
    contentType = "application/pdf";
  } else {
    try {
      body = await processImage(file, 2000);
    } catch (e) {
      return fail("validation", { slip: [(e as Error).message === "imageType" ? "imageType" : "imageSize"] });
    }
  }

  const supabase = await createClient();
  const path = `${viewer.id}/${jobId}/${randomUUID()}.${ext}`;
  const up = await supabase.storage.from("bank-slips").upload(path, body, { contentType });
  if (up.error) return fail("upload_failed");
  const { error } = await supabase.rpc("submit_payment_slip", { p_job_id: jobId, p_slip_path: path, p_bank_ref: bankRef });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/dashboard/my-jobs/[id]", "page");
  return ok(null);
}
