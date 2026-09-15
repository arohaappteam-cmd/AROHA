import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
      <EmptyState
        icon={CompassIcon}
        title="This path doesn't exist yet"
        description="The page you're looking for isn't part of AROHA — or hasn't been built yet."
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to today
          </Link>
        }
        className="w-full"
      />
    </main>
  );
}
