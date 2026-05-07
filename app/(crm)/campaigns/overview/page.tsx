"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Send, Users, Eye, MousePointer, TrendingUp, Clock,
  Sparkles, FileText, Activity, Ban, ChevronRight, Play,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActiveEnrollment {
  id: number;
  sequence_name: string;
  recipient_name: string;
  recipient_email: string;
  current_step: number;
  next_send_at: string | null;
  started_at: string;
}

interface OverviewData {
  stats: {
    emails_sent_30d: number;
    avg_open_rate: number;
    avg_click_rate: number;
    conversions: number;
  };
  queue_count: number;
  suppression_count: number;
  engagement_chart: { date: string; opens: number; clicks: number }[];
  top_campaigns: { name: string; sent: number; opened: number; clicked: number }[];
  segment_performance: {
    segment: string;
    trigger_type: string;
    sent: number;
    open_rate: string;
    click_rate: string;
    conversions: number;
  }[];
  recent_activity: { type: string; message: string; time: string }[];
}

const ACTIVITY_ICON: Record<string, { icon: typeof Send; colour: string }> = {
  sent:  { icon: Send,         colour: "text-green-600"  },
  open:  { icon: Eye,          colour: "text-blue-500"   },
  click: { icon: MousePointer, colour: "text-purple-500" },
  draft: { icon: Clock,        colour: "text-amber-500"  },
};

const FALLBACK: OverviewData = {
  stats: { emails_sent_30d: 0, avg_open_rate: 0, avg_click_rate: 0, conversions: 0 },
  queue_count: 0,
  suppression_count: 0,
  engagement_chart: [],
  top_campaigns: [],
  segment_performance: [],
  recent_activity: [],
};

export default function CampaignOverviewPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["campaign-overview"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/overview");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: enrollData } = useQuery({
    queryKey: ["enrollments-active"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/enrollments?status=Active&page_size=5");
      if (!res.ok) return { total: 0, data: [] };
      return res.json();
    },
    staleTime: 60_000,
  });
  const activeSeqCount = enrollData?.total ?? 0;
  const activeEnrollments: ActiveEnrollment[] = enrollData?.data ?? [];

  const d = data ?? FALLBACK;
  const { stats, queue_count, suppression_count, engagement_chart, top_campaigns, segment_performance, recent_activity } = d;

  return (
    <div className="space-y-5" data-testid="page-campaign-overview">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Campaign Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your campaign health at a glance — all channels, all segments.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-campaigns">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI Campaign
            </Button>
          </Link>
          <Link href="/custom-campaigns">
            <Button size="sm" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Custom Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Emails Sent (30d)", value: isLoading ? "—" : String(stats.emails_sent_30d),  icon: Send,         colour: "text-primary"     },
          { label: "Avg Open Rate",     value: isLoading ? "—" : `${stats.avg_open_rate}%`,       icon: Eye,          colour: "text-blue-500"    },
          { label: "Avg Click Rate",    value: isLoading ? "—" : `${stats.avg_click_rate}%`,      icon: MousePointer, colour: "text-purple-500"  },
          { label: "Conversions",       value: isLoading ? "—" : String(stats.conversions),       icon: TrendingUp,   colour: "text-green-600"   },
        ].map(({ label, value, icon: Icon, colour }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <Icon className={cn("h-5 w-5 mt-0.5", colour)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick status pills */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/campaigns/queue">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-2 text-sm">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-amber-700 dark:text-amber-300">{isLoading ? "…" : queue_count}</span>
            <span className="text-amber-600 dark:text-amber-400">drafts awaiting approval</span>
            <ChevronRight className="h-3.5 w-3.5 text-amber-500 ml-1" />
          </div>
        </Link>
        <Link href="/campaigns/sequences">
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 text-sm">
            <Play className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-700 dark:text-blue-300">{isLoading ? "…" : activeSeqCount}</span>
            <span className="text-blue-600 dark:text-blue-400">active sequences running</span>
            <ChevronRight className="h-3.5 w-3.5 text-blue-500 ml-1" />
          </div>
        </Link>
        <Link href="/campaigns/suppression">
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-full px-4 py-2 text-sm">
            <Ban className="h-4 w-4 text-red-500" />
            <span className="font-semibold text-red-700 dark:text-red-300">{isLoading ? "…" : suppression_count}</span>
            <span className="text-red-600 dark:text-red-400">suppressed addresses</span>
            <ChevronRight className="h-3.5 w-3.5 text-red-500 ml-1" />
          </div>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Engagement line chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Email Engagement (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {engagement_chart.length === 0 && !isLoading ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No email data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={engagement_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="opens"  name="Opens"  stroke="hsl(var(--primary))"  strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top campaigns bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Performing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {top_campaigns.length === 0 && !isLoading ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No sent campaigns yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top_campaigns} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="opened"  name="Opened"  fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="clicked" name="Clicked" fill="#a855f7"             radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Segment Performance + Active Sequences + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Segment Performance — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Segment Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {segment_performance.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">No segment data yet — send a campaign to see performance.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Segment</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Open Rate</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Click Rate</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {segment_performance.map((s) => (
                    <tr key={s.trigger_type} className="hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium text-foreground">{s.segment}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.sent}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-green-600">{s.open_rate}</span></td>
                      <td className="px-4 py-3"><span className="font-semibold text-purple-600">{s.click_rate}</span></td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{s.conversions}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Active Sequences + Recent Activity stacked in 1 col */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Play className="h-4 w-4 text-blue-500" /> Active Sequences</span>
                <Link href="/campaigns/sequences" className="text-xs text-primary hover:underline font-normal">View all</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active sequences</p>
              ) : (
                <div className="divide-y divide-border">
                  {activeEnrollments.map((enr) => (
                    <div key={enr.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {enr.recipient_name || enr.recipient_email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{enr.sequence_name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border",
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
                      </div>
                    </div>
                  ))}
                  {activeSeqCount > activeEnrollments.length && (
                    <div className="px-4 py-2.5">
                      <Link href="/campaigns/sequences" className="text-xs text-primary hover:underline">
                        +{activeSeqCount - activeEnrollments.length} more active
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[0,1,2].map((i) => (
                    <div key={i} className="flex gap-2.5 animate-pulse">
                      <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted rounded w-3/4" />
                        <div className="h-2.5 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recent_activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recent_activity.map((item, i) => {
                  const cfg = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.sent;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", cfg.colour)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground leading-snug">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.time)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
