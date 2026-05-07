"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, AlertTriangle, Flame } from "lucide-react";
import { cn, formatDate, timeAgo, getScoreColor, getScoreBg } from "@/lib/utils";
import { Enquiry, EnquiryStatus } from "@/types/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";

const STATUS_FILTERS: { label: string; value: EnquiryStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "New", value: "New" },
  { label: "Qualified", value: "Qualified" },
  { label: "Rejected", value: "Rejected" },
  { label: "Expired", value: "Expired" },
];

const ITEMS_PER_PAGE = 25;

interface EnquiryListResponse {
  data: Enquiry[];
  total: number;
  page: number;
  limit: number;
}

async function fetchEnquiries(params: {
  page: number;
  status: string;
  search: string;
  source: string;
  lapsed: boolean;
}): Promise<EnquiryListResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: String(ITEMS_PER_PAGE),
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  if (params.status !== 'All') sp.set('status', params.status);
  if (params.search) sp.set('search', params.search);
  if (params.source) sp.set('source', params.source);
  if (params.lapsed) sp.set('lapsed_quotes_only', 'true');

  const res = await fetch(`/api/enquiries?${sp}`);
  if (!res.ok) throw new Error('Failed to fetch enquiries');
  return res.json();
}

export default function EnquiriesPage() {
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [source, setSource] = useState("All sources");
  const [coldOnly, setColdOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounceSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  }, []);

  const { data: settingsData } = useQuery<{ enquiry_sources?: string[] }>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error();
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  const sources: string[] = settingsData?.enquiry_sources ?? [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['enquiries', page, statusFilter, debouncedSearch, source, coldOnly],
    queryFn: () => fetchEnquiries({ page, status: statusFilter, search: debouncedSearch, source: source === 'All sources' ? '' : source, lapsed: coldOnly }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const { data: statusCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['enquiry-counts'],
    queryFn: async () => {
      const res = await fetch('/api/enquiries/counts');
      if (!res.ok) throw new Error();
      return res.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const enquiries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const displayed = enquiries;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${total} total enquiries`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/enquiries/new">
            <Button data-testid="button-new-enquiry">
              <Plus className="h-4 w-4" />
              New Enquiry
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => {
            const count = statusCounts[label];
            return (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setPage(1); }}
                data-testid={`filter-status-${value.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors",
                  statusFilter === value
                    ? "bg-primary text-white border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                )}
              >
                {label}
                {count != null && (
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-full text-xs font-bold min-w-[1.25rem] h-5 px-1",
                    statusFilter === value
                      ? "bg-white/25 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, postcode, job type…"
            value={search}
            onChange={(e) => debounceSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-enquiries"
          />
        </div>

        {/* Source filter */}
        <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
          <SelectTrigger className="w-44" data-testid="filter-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All sources">All sources</SelectItem>
            {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Cold toggle */}
        <button
          onClick={() => { setColdOnly(!coldOnly); setPage(1); }}
          data-testid="button-quotes-cold"
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors",
            coldOnly
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-background text-muted-foreground border-border hover:border-amber-400 hover:text-amber-600"
          )}
        >
          <Flame className={cn("h-3.5 w-3.5", coldOnly ? "text-white" : "text-amber-500")} />
          Quotes Gone Cold
          {coldOnly && total > 0 && (
            <span className="inline-flex items-center justify-center rounded-full text-xs font-bold min-w-[1.25rem] h-5 px-1 bg-white/25 text-white">
              {total}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">Failed to load enquiries.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : isLoading && enquiries.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading enquiries…
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No enquiries found"
            description="Try adjusting your filters or search term."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Postcode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Urgency</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">AI Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map((enq) => {
                  const ageHrs = (Date.now() - new Date(enq.created_at).getTime()) / 3600000;
                  const stale24 = enq.status === "New" && ageHrs > 24;
                  const stale48 = enq.status === "New" && ageHrs > 48;
                  const score = enq.ai_score ?? 0;
                  return (
                    <tr
                      key={enq.id}
                      data-testid={`row-enquiry-${enq.id}`}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        stale48 && "border-l-4 border-amber-500",
                        !stale48 && stale24 && "border-l-4 border-amber-300"
                      )}
                    >
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {timeAgo(enq.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/enquiries/${enq.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {enq.customer_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{enq.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{enq.job_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{enq.postcode}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{enq.source ?? "—"}</td>
                      <td className="px-4 py-3">
                        {enq.urgency === "Emergency" && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Emergency
                          </Badge>
                        )}
                        {enq.urgency === "Urgent" && (
                          <Badge variant="warning" className="text-xs">Urgent</Badge>
                        )}
                        {enq.urgency === "Normal" && (
                          <span className="text-xs text-muted-foreground">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {enq.ai_score != null ? (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={score}
                              className="h-1.5 w-16"
                              indicatorClassName={getScoreBg(score)}
                            />
                            <span className={cn("text-xs font-semibold w-6", getScoreColor(score))}>
                              {score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            enq.status === "Qualified" ? "success"
                            : enq.status === "Rejected" ? "destructive"
                            : enq.status === "Expired" ? "outline"
                            : "warning"
                          }
                          data-testid={`status-enquiry-${enq.id}`}
                        >
                          {enq.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
