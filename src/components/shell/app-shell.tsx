import { Suspense, type ReactNode } from "react";

import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { SidebarIdentity, SidebarIdentitySkeleton } from "./sidebar-identity";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
        <div className="px-3 pb-6">
          <Brand />
        </div>
        <NavLinks />
        <div className="mt-auto border-t pt-3">
          <Suspense fallback={<SidebarIdentitySkeleton />}>
            <SidebarIdentity />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:hidden">
          <MobileNav />
          <Brand />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
