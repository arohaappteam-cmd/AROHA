"use client";

import { LayoutGridIcon, SparklesIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isActivePath, mobileTabs, primaryNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { NavLinks } from "./nav-links";

/** A thin bar over the tab that was tapped, until its page arrives. */
function TabPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn("absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary transition-opacity", pending ? "animate-pulse opacity-100" : "opacity-0")}
    />
  );
}

/**
 * Phone navigation: the four daily destinations in a bottom tab bar, one
 * thumb away, and "More" for everything else. `footer` is rendered under
 * the full list, e.g. the sign-out button.
 */
export function MobileNav({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // "More" lights up when the current page isn't one of the tabs.
  const onTab = mobileTabs.some((tab) => isActivePath(pathname, tab.href));
  const elsewhere = !onTab && primaryNav.some((item) => isActivePath(pathname, item.href));

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActivePath(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <TabPending />
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-sidebar-accent")}>
                  <Icon className={cn("size-5", active ? tab.tone : "opacity-80")} aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    elsewhere ? "text-foreground" : "text-muted-foreground",
                  )}
                />
              }
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full", elsewhere && "bg-sidebar-accent")}>
                <LayoutGridIcon className={cn("size-5", elsewhere ? "text-violet-300" : "opacity-80")} aria-hidden />
              </span>
              More
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar">
              <SheetHeader>
                <SheetTitle className="tracking-[0.2em]">{siteConfig.name}</SheetTitle>
              </SheetHeader>
              <div className="px-3 pb-6">
                <NavLinks onNavigate={() => setOpen(false)} />
                <div className="mt-4 space-y-1 border-t pt-3">
                  <Link
                    href="/plans"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
                  >
                    <SparklesIcon className="size-4 shrink-0 text-amber-300" aria-hidden />
                    Plans
                  </Link>
                  {footer}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
