import type { ReactNode } from "react";

import { Brand } from "@/components/shell/brand";
import { siteConfig } from "@/config/site";

/** The signed-out frame: brand, one card, the tagline. No navigation. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-aurora min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
        <Brand />
        <div className="rounded-2xl border bg-card/90 p-6 shadow-xl shadow-violet-950/40 backdrop-blur">{children}</div>
        <div className="space-y-1 text-center text-xs text-muted-foreground">
          <p>{siteConfig.tagline}</p>
          <p>Free to play · Pro and Premium coming soon</p>
        </div>
      </main>
    </div>
  );
}
