import { TableSkeleton, Skeleton } from "@/components/shared/skeleton";

export default function HeatShieldLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-40" />
      <div className="rounded-lg border border-border overflow-hidden">
        <TableSkeleton rows={10} cols={7} />
      </div>
    </div>
  );
}
