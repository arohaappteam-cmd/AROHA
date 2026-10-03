import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your journey">
      <div className="hud-panel space-y-6 p-5 sm:p-8">
        <div className="flex items-center gap-6">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="hud-panel p-5">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-48 w-36 shrink-0 rounded-xl sm:flex-1" />
          ))}
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
