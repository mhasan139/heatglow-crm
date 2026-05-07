import { TableSkeleton, Skeleton } from "@/components/shared/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <TableSkeleton rows={12} cols={6} />
      </div>
    </div>
  );
}
