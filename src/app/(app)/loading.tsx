import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading today's journey">
      <div className="space-y-6 rounded-3xl border p-5 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="hidden size-[76px] rounded-full sm:block" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-8 w-72 max-w-full" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="size-28 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-9 w-80 max-w-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-12 shrink-0 rounded-full sm:size-14" />
            <Skeleton className="h-44 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
