import { Suspense, type ReactNode } from "react";

import { isAuthEnabled } from "@/server/auth/current-user";

import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { SidebarIdentity, SidebarIdentitySkeleton } from "./sidebar-identity";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ children }: { children: ReactNode }) {
  const signOut = isAuthEnabled() ? <SignOutButton /> : null;

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar py-5 md:flex">
        <div className="px-6 pb-5">
          <Brand />
        </div>
        {/* Only the links scroll, so identity and sign-out stay in reach. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
          <NavLinks />
        </div>
        <div className="border-t px-3 pt-3">
          <Suspense fallback={<SidebarIdentitySkeleton />}>
            <SidebarIdentity />
          </Suspense>
          {signOut}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:hidden">
          <Brand />
        </header>
        {/* Bottom padding clears the phone tab bar. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:py-10">{children}</main>
      </div>

      <MobileNav footer={signOut} />
    </div>
  );
}
