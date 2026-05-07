import { CardSkeleton, Skeleton } from "@/components/shared/skeleton";

export default function CampaignsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}
