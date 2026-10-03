import { Skeleton } from "@/components/ui/skeleton";

/**
 * A generic page placeholder: header, a toolbar row and a grid of cards.
 * Gives a route an instant loading state, so tapping its nav link responds
 * immediately while the page streams in.
 */
export function PageSkeleton({ label, cards = 4 }: { label: string; cards?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
