import type { ReactNode } from "react";

import { Brand } from "@/components/shell/brand";
import { siteConfig } from "@/config/site";

/** The signed-out frame: brand, one card, the tagline. No navigation. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <Brand />
      <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
      <p className="text-center text-xs text-muted-foreground">{siteConfig.tagline}</p>
    </main>
  );
}
