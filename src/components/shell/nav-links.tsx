"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {primaryNav.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{item.label}</span>
            {!item.available && (
              <span className="rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Soon
              </span>
            )}
          </>
        );

        const base =
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

        if (!item.available) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title={`${item.description} — coming in a later phase`}
              className={cn(base, "cursor-default text-muted-foreground/60")}
            >
              {content}
            </span>
          );
        }

        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              base,
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
