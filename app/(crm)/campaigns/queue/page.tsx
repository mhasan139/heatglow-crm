"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, Users, Trash2, Calendar, CheckCircle2,
  AlertTriangle, Eye, ChevronUp, ChevronDown,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CampaignDraft } from "@/types/index";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_CATEGORY: Record<string, string> = {
  heatshield_service_due: "HeatShield Reminders",
  quote_lapsed: "Lapsed Quotes",
  win_back: "Reactivation",
  service_reminder: "Reactivation",
  re_engagement: "Reactivation",
  manual: "Other",
};

const TRIGGER_REASON: Record<string, string> = {
  heatshield_service_due: "HeatShield members have a service due in the next 14 days",
  quote_lapsed: "quotes sent 14+ days ago with no conversion or response",
  win_back: "customers have had no activity in 12+ months",
  service_reminder: "customers may be due their annual boiler service",
  re_engagement: "customers inactive for 24+ months",
  manual: "manual campaign draft",
};

type FilterTab = "All" | "HeatShield Reminders" | "Lapsed Quotes" | "Reactivation" | "Other";
const TABS: FilterTab[] = ["All", "HeatShield Reminders", "Lapsed Quotes", "Reactivation", "Other"];

const TAB_TRIGGERS: Record<FilterTab, string[]> = {
  All: [],
  "HeatShield Reminders": ["heatshield_service_due"],
  "Lapsed Quotes": ["quote_lapsed"],
  Reactivation: ["win_back", "service_reminder", "re_engagement"],
  Other: ["manual"],
};

interface Recipient {
  client_id: number;
  name: string;
  email: string;
  last_job_date?: string | null;
  renewal_date?: string | null;
}

interface RecipientsResponse {
  data: Recipient[];
  date_label: string;
  total: number;
}

// ── Data helpers ──────────────────────────────────────────────────────────────

async function fetchQueue(): Promise<{ data: CampaignDraft[]; total: number }> {
  const sp = new URLSearchParams({ status: "Draft", page: "1", page_size: "50" });
  const res = await fetch(`/api/campaigns?${sp}`);
  if (!res.ok) throw new Error("Failed to load queue");
  return res.json();
}

async function fetchRecipients(id: number): Promise<RecipientsResponse> {
  const res = await fetch(`/api/campaigns/${id}/recipients`);
  if (!res.ok) return { data: [], date_label: "last_job_date", total: 0 };
  return res.json();
}

function categoryLabel(c: CampaignDraft) {
  return TRIGGER_CATEGORY[c.trigger_type ?? "manual"] ?? "Other";
}

function triggerReason(c: CampaignDraft) {
  if (c.segment_description) return c.segment_description;
  const t = c.trigger_type ?? "manual";
  const reason = TRIGGER_REASON[t] ?? "auto-generated";
  return c.recipient_count != null ? `${c.recipient_count} ${reason}` : reason;
}

// ── Sub-component: expanded recipients ───────────────────────────────────────

function RecipientRows({ campaignId }: { campaignId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-recipients", campaignId],
    queryFn: () => fetchRecipients(campaignId),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const dateLabel = data?.date_label === "renewal_date" ? "Renewal date" : "Last job";

  if (isLoading) {
    return (
      <div className="mt-3 pt-3 border-t border-border/60">
        <p className="text-xs text-muted-foreground mb-2">Recipients</p>
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <p className="text-xs text-muted-foreground mb-2">Recipients</p>
      <div className="space-y-0">
        {rows.slice(0, 8).map((r) => {
          const dateVal = dateLabel === "Renewal date"
            ? (r.renewal_date ?? "—")
            : (r.last_job_date?.slice(0, 10) ?? "—");
          return (
            <div key={r.client_id} className="grid grid-cols-[1fr_1fr_auto] gap-4 py-1.5 text-xs">
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="text-muted-foreground">{r.email}</span>
              <span className="text-muted-foreground text-right">{dateVal}</span>
            </div>
          );
        })}
        {rows.length > 8 && (
          <p className="text-xs text-muted-foreground pt-1">+ {rows.length - 8} more</p>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: single campaign card ──────────────────────────────────────

function CampaignCard({
  campaign,
  expanded,
  onToggle,
  onDelete,
  onApprove,
  deleteLoading,
}: {
  campaign: CampaignDraft;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onApprove: () => void;
  deleteLoading: boolean;
}) {
  const category = categoryLabel(campaign);
  const reason = triggerReason(campaign);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Card body */}
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm font-bold text-foreground">{campaign.name}</h3>
            <span className="inline-flex items-center text-[10px] font-semibold border border-amber-500 text-amber-500 rounded px-1.5 py-0.5">
              Auto-generated
            </span>
            <span className="inline-flex items-center text-[10px] font-medium border border-border text-muted-foreground rounded px-1.5 py-0.5">
              {category}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Trigger reason */}
        <p className="text-xs text-muted-foreground mb-1.5">{reason}</p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {campaign.recipient_count != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign.recipient_count} recipients
            </span>
          )}
          <span>Generated {timeAgo(campaign.created_at)}</span>
        </div>

        {/* Email preview box */}
        {campaign.subject && (
          <div className="bg-muted/20 border border-border/60 rounded-lg px-3.5 py-2.5 mb-3">
            <p className="text-xs mb-1">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-semibold text-foreground">{campaign.subject}</span>
            </p>
            {campaign.body && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {campaign.body.slice(0, 160)}…
              </p>
            )}
          </div>
        )}

        {/* Expanded: recipients */}
        {expanded && <RecipientRows campaignId={campaign.id} />}

        {/* Actions */}
        <div className={cn("flex items-center gap-2", expanded ? "mt-4" : "mt-0")}>
          <Link href={`/campaigns/queue/${campaign.id}`}>
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-card border border-border hover:bg-muted rounded-md px-3 py-2 transition-colors">
              <Eye className="h-3.5 w-3.5" /> Review & Edit
            </button>
          </Link>
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md px-3 py-2 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" /> Approve & Schedule
          </button>
          <button
            onClick={onDelete}
            disabled={deleteLoading}
            className="ml-auto text-muted-foreground hover:text-destructive transition-colors p-1.5 disabled:opacity-40"
            title="Delete draft"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignQueuePage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["campaign-queue"],
    queryFn: fetchQueue,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["campaign-queue"] });
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
      setApproveId(null);
      setScheduleDate("");
      qc.invalidateQueries({ queryKey: ["campaign-queue"] });
    },
  });

  const allCampaigns = data?.data ?? [];

  // Filter by tab
  const campaigns = activeTab === "All"
    ? allCampaigns
    : allCampaigns.filter((c) =>
        TAB_TRIGGERS[activeTab].includes(c.trigger_type ?? "manual")
      );

  const displayedCampaigns = campaigns;

  return (
    <div className="p-6 max-w-3xl" data-testid="page-campaign-queue">
      {/* Approve & Schedule modal */}
      {approveId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">Approve &amp; Schedule</h3>
            <p className="text-sm text-muted-foreground mb-5">Choose a send date or send immediately.</p>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Schedule date (leave blank to send now)
            </label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setApproveId(null); setScheduleDate(""); }}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => approveMutation.mutate({
                  id: approveId,
                  scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
                })}
                disabled={approveMutation.isPending}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
              >
                {approveMutation.isPending ? "Sending…" : scheduleDate ? "Schedule" : "Send Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold mb-2">Delete this draft?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This campaign draft will be permanently removed from the queue.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-6 w-6 text-primary flex-shrink-0" />
        <h1 className="text-2xl font-bold text-foreground">Campaign Queue</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Auto-generated campaign drafts waiting for your review.{" "}
        <strong className="text-foreground font-semibold">Nothing sends without your approval.</strong>
      </p>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
              activeTab === tab
                ? "bg-primary border-primary text-white"
                : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
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
          <p className="text-sm text-muted-foreground">Failed to load campaign queue.</p>
          <button
            onClick={() => refetch()}
            className="text-xs border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4 mb-4" />
              <div className="h-16 bg-muted/50 rounded-lg mb-4" />
              <div className="flex gap-2">
                <div className="h-8 bg-muted rounded-md w-28" />
                <div className="h-8 bg-muted rounded-md w-36" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedCampaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-14 text-center" data-testid="queue-empty">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-base font-semibold mb-1">Queue is clear</p>
          <p className="text-sm text-muted-foreground">
            {activeTab === "All"
              ? "When automation creates a draft, it will appear here."
              : `No ${activeTab} drafts in the queue.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              expanded={expandedId === campaign.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === campaign.id ? null : campaign.id))
              }
              onApprove={() => { setApproveId(campaign.id); setScheduleDate(""); }}
              onDelete={() => setDeleteConfirm(campaign.id)}
              deleteLoading={deleteMutation.isPending && deleteConfirm === campaign.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
