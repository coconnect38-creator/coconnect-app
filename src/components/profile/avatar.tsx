import Image from "next/image";
import { storageUrl } from "@/lib/utils";

export function Avatar({ name, path, size = 40 }: { name: string; path: string | null | undefined; size?: number }) {
  const url = storageUrl("avatars", path);
  if (url) {
    return <Image src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-sand font-bold text-primary"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
