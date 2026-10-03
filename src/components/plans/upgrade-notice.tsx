import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** An inline "your plan is full" note that always points somewhere. */
export function UpgradeNotice({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent px-3.5 py-3 text-sm sm:flex-row sm:items-center",
        className,
      )}
    >
      <SparklesIcon className="hidden size-4 shrink-0 text-violet-300 sm:block" aria-hidden />
      <p className="flex-1 text-pretty text-muted-foreground">{message}</p>
      <Link
        href="/plans"
        className="inline-flex shrink-0 items-center gap-1 font-medium text-violet-200 underline-offset-4 hover:underline"
      >
        See plans
        <ArrowRightIcon className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
