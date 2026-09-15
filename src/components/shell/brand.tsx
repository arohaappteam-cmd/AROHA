import Link from "next/link";

import { siteConfig } from "@/config/site";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        A
      </span>
      <span className="text-sm font-semibold tracking-[0.2em]">
        {siteConfig.name}
      </span>
    </Link>
  );
}
