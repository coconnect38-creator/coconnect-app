import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Re-encodes an uploaded image as WebP. sharp drops all metadata by default,
 * which strips EXIF — phone cameras embed the GPS location of the person's home.
 * `.rotate()` first applies the EXIF orientation so photos aren't sideways.
 */
export async function processImage(file: File, maxSide = 1600) {
  if (!ALLOWED.includes(file.type)) throw new Error("imageType");
  if (file.size > MAX_UPLOAD_BYTES * 2) throw new Error("imageSize");
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
}

export function isImageFile(v: FormDataEntryValue | null): v is File {
  return typeof v === "object" && v !== null && "arrayBuffer" in v && (v as File).size > 0;
}
