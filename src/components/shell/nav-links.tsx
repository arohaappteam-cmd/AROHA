"use client";

import { LoaderCircleIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, navSections, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Confirms a click instantly while the next page streams in. Fixed size and
 * always rendered, so it never shifts the layout.
 */
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <LoaderCircleIcon
      aria-hidden
      className={cn("size-3.5 shrink-0 animate-spin text-primary transition-opacity", pending ? "opacity-100" : "opacity-0")}
    />
  );
}

function PlanTag({ item }: { item: NavItem }) {
  if (!item.plan) return null;
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase",
        item.plan === "PREMIUM" ? "border-amber-400/40 text-amber-200" : "border-violet-400/40 text-violet-200",
      )}
    >
      {item.available ? (item.plan === "PREMIUM" ? "Premium" : "Pro") : "Soon"}
    </span>
  );
}

const base = "group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-4">
      {navSections.map((section) => (
        <div key={section.label} className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">{section.label}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;

              if (!item.available) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      title={`${item.description} — coming soon`}
                      className={cn(base, "cursor-default text-muted-foreground/60")}
                    >
                      <Icon className="size-4 shrink-0 opacity-60" aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      <PlanTag item={item} />
                    </span>
                  </li>
                );
              }

              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={item.description}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      base,
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--primary)]"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0 transition-opacity", item.tone, !active && "opacity-75 group-hover:opacity-100")} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    <PlanTag item={item} />
                    <PendingHint />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
