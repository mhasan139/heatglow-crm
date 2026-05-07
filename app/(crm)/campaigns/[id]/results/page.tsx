"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, Download, Users, Mail, MousePointer, AlertCircle, Send, Loader2,
} from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CampaignDraft, CampaignEmail } from "@/types/index";

type StatusFilter = "All" | "Sent" | "Opened" | "Clicked" | "Failed";
const STATUS_TABS: StatusFilter[] = ["All", "Sent", "Opened", "Clicked", "Failed"];

const STATUS_COLORS: Record<string, string> = {
  Sent:    "bg-[var(--badge-info-bg)]        text-[var(--badge-info-fg)]",
  Opened:  "bg-[var(--badge-success-bg)]     text-[var(--badge-success-fg)]",
  Clicked: "bg-[var(--badge-purple-bg)]      text-[var(--badge-purple-fg)]",
  Failed:  "bg-[var(--badge-destructive-bg)] text-[var(--badge-destructive-fg)]",
  Queued: "bg-muted text-muted-foreground",
};

interface CampaignDetailResponse {
  campaign: CampaignDraft;
  stats: { sent: number; opened: number; clicked: number; total: number };
  emails: CampaignEmail[];
}

export default function CampaignResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

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
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Campaigns
        </Link>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Results not available for this campaign.</p>
        </div>
      </div>
    );
  }

  const { campaign, stats, emails } = data;
  const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
  const clickRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0;

  const metrics = [
    { label: "Sent",    value: stats.sent,    pct: 100,       icon: Mail,         color: "text-primary"    },
    { label: "Opened",  value: stats.opened,  pct: openRate,  icon: Users,        color: "text-green-500"  },
    { label: "Clicked", value: stats.clicked, pct: clickRate, icon: MousePointer, color: "text-purple-500" },
    { label: "Failed",  value: stats.total - stats.sent, pct: stats.total > 0 ? Math.round(((stats.total - stats.sent) / stats.total) * 100) : 0, icon: AlertCircle, color: "text-red-500" },
  ];

  const filteredEmails = emails.filter((e) => {
    const matchStatus =
      statusFilter === "All" ? true :
      statusFilter === "Opened" ? !!e.opened_at :
      statusFilter === "Clicked" ? !!e.clicked_at :
      e.status === statusFilter;
    const matchSearch = !search ||
      e.recipient_email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function downloadCSV() {
    const rows = [
      ["Email", "Status", "Sent", "Opened", "Clicked"],
      ...emails.map((e) => [
        e.recipient_email,
        e.status,
        e.sent_at ? formatDate(e.sent_at) : "",
        e.opened_at ? formatDate(e.opened_at) : "",
        e.clicked_at ? formatDate(e.clicked_at) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `campaign-${id}-results.csv`;
    a.click();
  }

  return (
    <div className="p-6 max-w-5xl" data-testid="page-campaign-results">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Campaigns
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Results: {campaign.name}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
          {campaign.sent_at && <span>Sent {formatDate(campaign.sent_at)}</span>}
          <span>{stats.total} recipients</span>
          {campaign.segment_description && <span>{campaign.segment_description}</span>}
        </div>
        {campaign.subject && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Subject: <span className="text-foreground">{campaign.subject}</span>
          </p>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-4" data-testid={`metric-${m.label.toLowerCase()}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </div>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.pct}%</p>
          </div>
        ))}
      </div>

      {/* Recipient table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6" data-testid="recipient-table">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  statusFilter === tab ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email…"
              className="h-7 text-xs w-40"
            />
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={downloadCSV}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
        </div>

        {filteredEmails.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No results</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Opened</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{e.recipient_email}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      e.opened_at ? STATUS_COLORS.Opened :
                      e.clicked_at ? STATUS_COLORS.Clicked :
                      STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground"
                    )}>
                      {e.clicked_at ? "Clicked" : e.opened_at ? "Opened" : e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {e.opened_at ? timeAgo(e.opened_at) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {e.clicked_at ? timeAgo(e.clicked_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {stats.total > 50 && (
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
            Showing first 50 of {stats.total} recipients.
          </div>
        )}
      </div>

      {/* Follow-up CTA */}
      {stats.sent > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Send follow-up to non-openers</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.sent - stats.opened} recipients received this campaign but didn&apos;t open it
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href={`/campaigns/new?followUp=${id}`}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Create follow-up
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
