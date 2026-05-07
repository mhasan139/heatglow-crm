"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Check, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubFilter = "3m" | "6m" | "12m";

const SEGMENTS = [
  {
    id: "lapsed-quotes",
    name: "Lapsed Quotes",
    description: "Customers who received a quote but it was marked unsuccessful",
    hasSubFilter: true,
  },
  {
    id: "inactive-customers",
    name: "Inactive Customers (12+ months)",
    description: "Customers who had a job completed but nothing booked in the last 12 months",
    hasSubFilter: false,
  },
  {
    id: "one-time-customers",
    name: "One-time Customers",
    description: "Customers with exactly one completed job who have never returned",
    hasSubFilter: false,
  },
  {
    id: "heatshield-renewals",
    name: "HeatShield Renewals Due",
    description: "Members whose renewal is within the next 30 days",
    hasSubFilter: false,
  },
  {
    id: "heatshield-lapsed",
    name: "Lapsed HeatShield Members",
    description: "Members whose renewal date has passed and haven't renewed",
    hasSubFilter: false,
  },
  {
    id: "qualified-no-quote",
    name: "Qualified but No Quote",
    description: "Enquiries qualified in vetting but never became a quote in ServiceM8",
    hasSubFilter: false,
  },
];

// Calls the segment-preview API and returns { count, filters }
async function fetchSegmentPreview(segmentId: string, subFilter?: string) {
  const res = await fetch("/api/campaigns/segment-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segment_id: segmentId, sub_filter: subFilter }),
  });
  if (!res.ok) return { count: 0, filters: [] };
  return res.json() as Promise<{ count: number; filters: unknown[] }>;
}

export default function CreateCampaignStep1() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<SubFilter>("3m");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  // Store resolved filters so step 3 can create the campaign with real segment_filters
  const [segmentFilters, setSegmentFilters] = useState<Record<string, unknown[]>>({});
  const lapsedDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load counts for non-subfilter segments on mount
  useEffect(() => {
    const staticIds = ["inactive-customers", "one-time-customers", "heatshield-renewals", "heatshield-lapsed", "qualified-no-quote"];
    Promise.allSettled(staticIds.map((id) => fetchSegmentPreview(id))).then((results) => {
      const newCounts: Record<string, number> = {};
      const newFilters: Record<string, unknown[]> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          newCounts[staticIds[i]] = r.value.count;
          newFilters[staticIds[i]] = r.value.filters;
        }
      });
      setCounts((prev) => ({ ...prev, ...newCounts }));
      setSegmentFilters((prev) => ({ ...prev, ...newFilters }));
      setCountsLoading(false);
    });
  }, []);

  // Reload lapsed-quotes count when sub-filter changes
  useEffect(() => {
    if (lapsedDebounce.current) clearTimeout(lapsedDebounce.current);
    lapsedDebounce.current = setTimeout(() => {
      fetchSegmentPreview("lapsed-quotes", subFilter).then(({ count, filters }) => {
        setCounts((prev) => ({ ...prev, "lapsed-quotes": count }));
        setSegmentFilters((prev) => ({ ...prev, "lapsed-quotes": filters }));
      });
    }, 200);
    return () => { if (lapsedDebounce.current) clearTimeout(lapsedDebounce.current); };
  }, [subFilter]);

  const selectedSegment = SEGMENTS.find((s) => s.id === selected);
  const selectedCount = selected ? (counts[selected] ?? 0) : 0;
  const selectedFilters = selected ? (segmentFilters[selected] ?? []) : [];

  return (
    <div className="p-6 max-w-3xl" data-testid="page-cm2">
      {/* Back */}
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Back to Campaign Manager
      </Link>

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step === 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
                {step}
              </div>
              {step < 3 && <div className={cn("h-0.5 w-12", step < 1 ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>
        <div className="flex gap-14 text-xs mt-1 text-muted-foreground">
          <span className="text-foreground font-medium">Audience</span>
          <span>Email</span>
          <span>Schedule</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">Create Campaign — Step 1 of 3</h1>
      <p className="text-sm text-muted-foreground mb-6">Choose your audience</p>

      {/* Segments */}
      <div className="space-y-3 mb-6">
        {SEGMENTS.map((seg) => {
          const isSelected = selected === seg.id;
          const count = counts[seg.id];
          const loading = countsLoading || (seg.id === "lapsed-quotes" && count === undefined);
          return (
            <button
              key={seg.id}
              onClick={() => setSelected(seg.id)}
              data-testid={`segment-${seg.id}`}
              className={cn(
                "w-full text-left bg-card border rounded-lg p-4 transition-all",
                isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{seg.name}</p>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{seg.description}</p>
                  {seg.hasSubFilter && isSelected && (
                    <div className="flex items-center gap-1 mb-2">
                      {(["3m", "6m", "12m"] as SubFilter[]).map((f) => (
                        <button
                          key={f}
                          onClick={(e) => { e.stopPropagation(); setSubFilter(f); }}
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium border transition-colors",
                            subFilter === f ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-foreground"
                          )}
                        >
                          {f === "3m" ? "3 months" : f === "6m" ? "6 months" : "12 months"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {loading ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {count ?? 0} customers
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom segment */}
      <div className="border border-dashed border-border rounded-lg p-4 flex items-center justify-between mb-8">
        <div>
          <p className="text-sm font-medium text-foreground">Build a custom segment</p>
          <p className="text-xs text-muted-foreground">Combine filters to create a bespoke audience</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/campaigns/new/custom-segment">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Custom Builder
          </Link>
        </Button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/campaigns">Cancel</Link>
        </Button>
        <Button
          disabled={!selected || selectedCount === 0}
          onClick={() => {
            if (!selected || !selectedSegment) return;
            const sp = new URLSearchParams({
              segment: selectedSegment.name,
              count: String(selectedCount),
              segment_id: selected,
              sub_filter: subFilter,
              filters_json: JSON.stringify(selectedFilters),
            });
            router.push(`/campaigns/new/template?${sp}`);
          }}
          data-testid="btn-next-step"
        >
          Next: Choose Template
        </Button>
      </div>
    </div>
  );
}
