"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, Mail, Users, MousePointer, TrendingUp,
  Send, Calendar, AlertTriangle,
} from "lucide-react";
import { formatDate, timeAgo, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CampaignDraft, CampaignEmail } from "@/types/index";

interface CampaignDetailResponse {
  campaign: CampaignDraft;
  stats: { sent: number; opened: number; clicked: number; total: number };
  emails?: CampaignEmail[];
}

const STATUS_VARIANT: Record<string, string> = {
  Draft: "outline",
  Scheduled: "outline",
  Sending: "outline",
  Sent: "success",
  Cancelled: "slate",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<CampaignDetailResponse>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Failed to load campaign");
      return res.json();
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Loading campaign…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Campaigns
        </Link>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-muted-foreground">Failed to load campaign.</p>
        </div>
      </div>
    );
  }

  const { campaign, stats, emails = [] } = data;
  const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
  const clickRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={(STATUS_VARIANT[campaign.status] ?? "outline") as "outline" | "success" | "slate"}>
              {campaign.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span>Created {timeAgo(campaign.created_at)}</span>
            {campaign.sent_at && <span className="flex items-center gap-1"><Send className="h-3 w-3" />Sent {formatDate(campaign.sent_at)}</span>}
            {campaign.scheduled_at && campaign.status === "Scheduled" && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                Scheduled for {formatDate(campaign.scheduled_at)}
              </span>
            )}
          </div>
          {campaign.subject && (
            <p className="text-sm text-muted-foreground mt-1">Subject: <span className="text-foreground">{campaign.subject}</span></p>
          )}
          {campaign.segment_description && (
            <p className="text-sm text-muted-foreground">Segment: {campaign.segment_description}</p>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Sent</span>
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{stats.sent}</p>
          {campaign.recipient_count !== null && (
            <p className="text-xs text-muted-foreground mt-0.5">of {campaign.recipient_count} recipients</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Opened</span>
            <Users className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.opened}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{openRate}% open rate</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Clicked</span>
            <MousePointer className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.clicked}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{clickRate}% click rate</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Attributed Revenue</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {campaign.attributed_revenue > 0 ? formatCurrency(campaign.attributed_revenue) : "—"}
          </p>
          {campaign.attributed_revenue > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">from tracked jobs</p>
          )}
        </div>
      </div>

      {/* Email list */}
      {emails.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Recipients</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Opened</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Clicked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{email.recipient_email}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      email.status === "Sent" ? "bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]" :
                      email.status === "Failed" ? "bg-[var(--badge-destructive-bg)] text-[var(--badge-destructive-fg)]" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {email.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {email.opened_at ? timeAgo(email.opened_at) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {email.clicked_at ? timeAgo(email.clicked_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.total > 50 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              Showing first 50 of {stats.total} recipients.
            </div>
          )}
        </div>
      )}

      {emails.length === 0 && campaign.status !== "Draft" && (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-sm text-muted-foreground">
          No emails have been sent yet.
        </div>
      )}

      {campaign.status === "Draft" && (
        <div className="mt-4">
          <Button asChild>
            <Link href="/campaigns">← Back to approve this campaign</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
