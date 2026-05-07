"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, StopCircle, Search, ChevronDown, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMAIL_LABELS = ["", "Day 0", "+1 day", "+4 days"];

type SequenceStatus = "Active" | "Paused" | "Completed" | "Stopped";

interface Enrollment {
  id: number;
  sequence_id: number;
  sequence_name: string;
  client_id: number | null;
  recipient_email: string;
  recipient_name: string;
  status: SequenceStatus;
  current_step: number;
  next_send_at: string | null;
  started_at: string;
  stopped_at: string | null;
}

interface EnrollmentsResponse {
  data: Enrollment[];
  total: number;
  status_counts: Record<string, number>;
  sequences: { id: number; name: string }[];
}

async function fetchEnrollments(params: URLSearchParams): Promise<EnrollmentsResponse> {
  const res = await fetch(`/api/campaigns/enrollments?${params}`);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

export default function ActiveSequencesPage() {
  const [search, setSearch] = useState("");
  const [sequenceId, setSequenceId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<SequenceStatus | "All">("All");
  const [stopConfirm, setStopConfirm] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const qc = useQueryClient();

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFilter !== "All") p.set("status", statusFilter);
    if (sequenceId !== null) p.set("sequence_id", String(sequenceId));
    return p;
  }, [search, statusFilter, sequenceId]);

  const { data, isLoading } = useQuery<EnrollmentsResponse>({
    queryKey: ["enrollments", queryParams.toString()],
    queryFn: () => fetchEnrollments(queryParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const stopMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/enrollments/${id}/stop`, { method: "POST" });
      if (!res.ok) throw new Error("Stop failed");
    },
    onSuccess: () => {
      setStopConfirm(null);
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });

  const filtered = data?.data ?? [];
  const statusCounts = data?.status_counts ?? {};
  const sequences = data?.sequences ?? [];
  const selectedSequence = sequences.find((s) => s.id === sequenceId);

  return (
    <div className="p-6 max-w-5xl" data-testid="page-sequences">
      {/* Stop confirm dialog */}
      {stopConfirm !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-foreground mb-2">Stop this sequence?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The customer will receive no further emails in this sequence. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStopConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={stopMutation.isPending}
                onClick={() => stopMutation.mutate(stopConfirm)}
              >
                {stopMutation.isPending ? "Stopping…" : "Stop Sequence"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Play className="h-6 w-6 text-blue-500" /> Active Sequences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          3-touch email sequences in progress. Each customer gets personalised emails on Day 0, Day 1, and Day 4.
        </p>
      </div>

      {/* Stat pills */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: "Active",    colour: "bg-[var(--badge-success-bg)]  text-[var(--badge-success-fg)]  border-transparent" },
          { label: "Paused",   colour: "bg-[var(--badge-warning-bg)]  text-[var(--badge-warning-fg)]  border-transparent" },
          { label: "Completed",colour: "bg-[var(--badge-info-bg)]     text-[var(--badge-info-fg)]     border-transparent" },
          { label: "Stopped",  colour: "bg-muted text-muted-foreground border-border" },
        ].map(({ label, colour }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(statusFilter === label as SequenceStatus ? "All" : label as SequenceStatus)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
              colour,
              statusFilter === label && "ring-2 ring-primary ring-offset-1"
            )}
          >
            {label} <span className="opacity-70">{statusCounts[label] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer or sequence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:border-primary"
          >
            {selectedSequence?.name ?? "All sequences"}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-background border border-border rounded-lg shadow-xl py-1 text-sm">
              <button
                onClick={() => { setSequenceId(null); setFilterOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 hover:bg-muted", sequenceId === null && "font-semibold text-primary")}
              >
                All
              </button>
              {sequences.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSequenceId(s.id); setFilterOpen(false); }}
                  className={cn("w-full text-left px-3 py-1.5 hover:bg-muted", sequenceId === s.id && "font-semibold text-primary")}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-4 animate-pulse flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
                <div className="h-3.5 bg-muted rounded w-1/4" />
                <div className="h-3.5 bg-muted rounded w-1/5" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">No sequences found</p>
          <p className="text-sm text-muted-foreground">
            {data?.total === 0 ? "No enrollments yet. Sequences are created automatically by automations." : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Sequence</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Next Send</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((enr) => (
                <tr key={enr.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    {enr.client_id ? (
                      <Link href={`/customers/${enr.client_id}`} className="font-medium text-foreground hover:text-primary">
                        {enr.recipient_name || enr.recipient_email}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{enr.recipient_name || enr.recipient_email}</span>
                    )}
                    <p className="text-xs text-muted-foreground">{enr.recipient_email}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{enr.sequence_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                            n < enr.current_step
                              ? "bg-green-500 border-green-500 text-white"
                              : n === enr.current_step
                              ? "bg-primary border-primary text-white"
                              : "bg-muted border-border text-muted-foreground"
                          )}
                        >
                          {n < enr.current_step ? "✓" : n}
                        </div>
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{EMAIL_LABELS[enr.current_step] ?? ""}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Started {formatDate(enr.started_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {enr.status === "Stopped" || enr.status === "Completed" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : enr.next_send_at ? (
                      <span className="text-sm font-medium">{formatDate(enr.next_send_at)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        enr.status === "Active" ? "success"
                        : enr.status === "Paused" ? "warning"
                        : enr.status === "Completed" ? "info"
                        : "slate"
                      }
                    >
                      {enr.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {enr.status === "Active" || enr.status === "Paused" ? (
                      <button
                        onClick={() => setStopConfirm(enr.id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        <StopCircle className="h-3.5 w-3.5" /> Stop
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sequence info footer */}
      <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <strong>How sequences work:</strong> Email 1 is sent on Day 0 (immediately). Email 2 is sent +1 day later if the customer hasn't replied or clicked. Email 3 is sent +4 days from Day 0 under the same conditions. Sequences stop automatically if the customer books, replies, or unsubscribes.
      </div>
    </div>
  );
}
