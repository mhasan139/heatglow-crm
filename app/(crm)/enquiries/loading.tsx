import { TableSkeleton } from "@/components/shared/skeleton";
import { Skeleton } from "@/components/shared/skeleton";

export default function EnquiriesLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        <Skeleton className="h-8 flex-1 max-w-xs" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <TableSkeleton rows={10} cols={8} />
      </div>
    </div>
  );
}
