"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, Users, Trash2, Calendar, CheckCircle2, Eye, ChevronDown,
  ChevronUp, RefreshCw, AlertTriangle, Send, Plus,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignDraft } from "@/types/index";

type StatusTab = "All" | "Draft" | "Scheduled" | "Sending" | "Sent" | "Cancelled";
const STATUS_TABS: StatusTab[] = ["All", "Draft", "Scheduled", "Sending", "Sent", "Cancelled"];

const STATUS_VARIANT: Record<string, "outline" | "success" | "slate" | "destructive"> = {
  Draft: "outline",
  Scheduled: "outline",
  Sending: "outline",
  Sent: "success",
  Cancelled: "slate",
};

async function fetchCampaigns(status: string): Promise<{ data: CampaignDraft[]; total: number }> {
  const sp = new URLSearchParams({ page: "1", limit: "50" });
  if (status !== "All") sp.set("status", status);
  const res = await fetch(`/api/campaigns?${sp}`);
  if (!res.ok) throw new Error("Failed to load campaigns");
  return res.json();
}

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [scheduleModal, setScheduleModal] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["campaigns", activeTab],
    queryFn: () => fetchCampaigns(activeTab),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: number; scheduledAt?: string }) => {
      const res = await fetch(`/api/campaigns/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      });
      if (!res.ok) throw new Error("Approve failed");
    },
    onSuccess: () => {
      setScheduleModal(null);
      setScheduleDate("");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const campaigns = data?.data ?? [];

  return (
    <div className="p-6 max-w-4xl" data-testid="page-campaigns">
      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold mb-2">Delete this campaign?</h3>
            <p className="text-sm text-muted-foreground mb-4">This campaign will be permanently removed.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule/approve modal */}
      {scheduleModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold mb-2">Approve & Schedule</h3>
            <p className="text-sm text-muted-foreground mb-3">Choose a send date or send immediately.</p>
            <label className="block text-xs text-muted-foreground mb-1">Schedule date (leave blank to send now)</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setScheduleModal(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => approveMutation.mutate({
                  id: scheduleModal,
                  scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
                })}
                disabled={approveMutation.isPending}
              >
                {scheduleDate ? "Schedule" : "Send Now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${data?.total ?? 0} campaigns total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" asChild>
            <Link href="/campaigns/new"><Plus className="h-3.5 w-3.5 mr-1" /> New Campaign</Link>
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              activeTab === tab ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-muted-foreground">Failed to load campaigns.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-base font-semibold mb-1">No campaigns{activeTab !== "All" ? ` with status "${activeTab}"` : ""}</p>
          <p className="text-sm text-muted-foreground mb-4">Create a new campaign to get started.</p>
          <Button asChild size="sm">
            <Link href="/campaigns/new"><Plus className="h-3.5 w-3.5 mr-1" /> New Campaign</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const isExpanded = expandedId === String(campaign.id);
            return (
              <div key={campaign.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold">{campaign.name}</h3>
                        <Badge variant={STATUS_VARIANT[campaign.status] ?? "outline"} className="text-[10px] shrink-0">
                          {campaign.status}
                        </Badge>
                        {campaign.trigger_type && (
                          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                            {campaign.trigger_type.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {campaign.recipient_count !== null && (
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign.recipient_count} recipients</span>
                        )}
                        <span>Created {timeAgo(campaign.created_at)}</span>
                        {campaign.sent_at && <span className="flex items-center gap-1"><Send className="h-3 w-3" />Sent {timeAgo(campaign.sent_at)}</span>}
                        {campaign.scheduled_at && campaign.status === "Scheduled" && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                            Scheduled for {new Date(campaign.scheduled_at).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : String(campaign.id))}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {campaign.subject && (
                    <div className="mt-3 bg-muted/30 rounded-lg px-3 py-2 border-l-2 border-primary">
                      <p className="text-xs text-muted-foreground">Subject: <span className="text-foreground font-medium">{campaign.subject}</span></p>
                      {campaign.segment_description && (
                        <p className="text-xs text-muted-foreground mt-0.5">Segment: {campaign.segment_description}</p>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && campaign.attributed_revenue > 0 && (
                  <div className="border-t border-border px-4 py-3 bg-green-50 dark:bg-green-950/20">
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Attributed revenue: <strong>£{(campaign.attributed_revenue / 100).toFixed(2)}</strong>
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/10">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                    </Link>
                  </Button>
                  {campaign.status === "Draft" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setScheduleModal(campaign.id)}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5" /> Approve & Send
                    </Button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(campaign.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
