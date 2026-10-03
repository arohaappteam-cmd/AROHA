"use client";

import { MenuIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";

import { NavLinks } from "./nav-links";

/** `footer` is rendered under the links, e.g. the sign-out button. */
export function MobileNav({ footer }: { footer?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open navigation" />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar">
        <SheetHeader>
          <SheetTitle className="tracking-[0.2em]">{siteConfig.name}</SheetTitle>
        </SheetHeader>
        <div className="px-3">
          <NavLinks onNavigate={() => setOpen(false)} />
          {footer && <div className="mt-3 border-t pt-3">{footer}</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
