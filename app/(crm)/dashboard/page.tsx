"use client";

import { memo, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, RefreshCw, CheckCircle, Clock,
  AlertTriangle, PoundSterling, Zap, Users, Shield,
  MessageSquare, Wrench, ExternalLink, ArrowUpRight, ArrowDownRight, Trash2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";
import { cn, formatCurrency, timeAgo, getScoreColor, getScoreBg } from "@/lib/utils";
import { DashboardResponse } from "@/types/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/shared/skeleton";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const KPICard = memo(function KPICard({
  title, value, sub, delta, highlight, tint,
}: {
  title: string; value: string; sub?: string; delta: number; highlight?: boolean; tint?: "amber";
}) {
  const positive = delta >= 0;
  return (
    <Card
      className={cn(
        tint === "amber" && delta < 0 && "border-amber-200 dark:border-amber-800"
      )}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {positive ? "+" : ""}{delta}% vs last month
        </div>
      </CardContent>
    </Card>
  );
});

const AlertCard = memo(function AlertCard({
  label, count, value, action, href,
}: {
  label: string; count: number; value?: string; action: string; href: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-r-md px-4 py-3 flex-1 min-w-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          <span className="text-lg font-bold mr-1">{count}</span>{label}
        </p>
        {value && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{value}</p>}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.push(href)}
        className="ml-3 text-amber-700 border-amber-300 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-950/50 flex-shrink-0 text-xs"
      >
        {action}
      </Button>
    </div>
  );
});

const ACTIVITY_ICON_MAP: Record<string, React.ElementType> = {
  enquiry: MessageSquare,
  heatshield: Shield,
  job: Wrench,
  sync: RefreshCw,
};

function getActivityIcon(eventType: string): React.ElementType {
  for (const [key, Icon] of Object.entries(ACTIVITY_ICON_MAP)) {
    if (eventType.includes(key)) return Icon;
  }
  return CheckCircle;
}

function getActivityColor(eventType: string): string {
  if (eventType.includes('reject')) return 'bg-[var(--badge-destructive-bg)] text-[var(--badge-destructive-fg)]';
  if (eventType.includes('qualify') || eventType.includes('completed')) return 'bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]';
  if (eventType.includes('enquiry')) return 'bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]';
  if (eventType.includes('heatshield')) return 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-fg)]';
  if (eventType.includes('sync')) return 'bg-[var(--badge-slate-bg)] text-[var(--badge-slate-fg)]';
  return 'bg-[var(--badge-slate-bg)] text-[var(--badge-slate-fg)]';
}

type QuoteFunnelEntry = { month: string; sent: number; accepted: number; declined: number };
type EnquiryQuality = { qualified: number; rejected: number; pending: number };

const QuoteFunnelChart = memo(function QuoteFunnelChart({ data }: { data: QuoteFunnelEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={12} barGap={2}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <RechartTooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, background: "var(--card)", color: "var(--card-foreground)" }} />
        <Bar dataKey="sent" name="Sent" fill="#94a3b8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="accepted" name="Accepted" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="declined" name="Declined" fill="#ef4444" radius={[3, 3, 0, 0]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--foreground)' }} />
      </BarChart>
    </ResponsiveContainer>
  );
});

const EnquiryQualityChart = memo(function EnquiryQualityChart({ qual }: { qual: EnquiryQuality }) {
  const total = qual.qualified + qual.rejected + qual.pending;
  const pieData = [
    { name: 'Qualified', value: qual.qualified, color: '#22c55e' },
    { name: 'Rejected', value: qual.rejected, color: '#ef4444' },
    { name: 'Pending Review', value: qual.pending, color: '#f59e0b' },
  ].filter(d => d.value > 0);
  const legendItems = [
    { name: 'Pending Review', value: qual.pending, color: '#f59e0b' },
    { name: 'Qualified', value: qual.qualified, color: '#22c55e' },
    { name: 'Rejected', value: qual.rejected, color: '#ef4444' },
  ];
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <RechartTooltip
            contentStyle={{ border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, background: "var(--card)", color: "var(--card-foreground)" }}
            formatter={(v: unknown) => [`${v} (${total ? Math.round(Number(v) / total * 100) : 0}%)`]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 flex-wrap">
        {legendItems.map(({ name, value, color }) => (
          <span key={name} className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            {name}
            <span className="font-semibold">({value})</span>
          </span>
        ))}
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: dashboard, isLoading, isError, error } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const kpis = dashboard?.kpis;
  const alerts = dashboard?.alerts;
  const recentEnquiries = dashboard?.recent_enquiries ?? [];
  const recentActivity = dashboard?.recent_activity ?? [];
  const recentJobs = dashboard?.recent_jobs ?? [];

  const lastSyncAt = dashboard?.last_sync?.synced_at;
  const syncStatus: "green" | "amber" | "red" = dashboard?.last_sync?.status === 'success' ? 'green'
    : dashboard?.last_sync?.status === 'failed' ? 'red' : 'amber';

  const hasSyncErrors = recentActivity.some((e) => e.event_type === 'sync.failed');

  const clearSyncErrors = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/activity?event_type=sync.failed', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch('/api/settings/sm8-sync-now', { method: 'POST' });
      await new Promise((r) => setTimeout(r, 2000));
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  }

  const dateStr = useMemo(
    () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-lg font-semibold text-foreground">Could not load dashboard</p>
        <p className="text-sm text-muted-foreground max-w-md font-mono break-all">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          Check that DJANGO_API_URL in .env points to a running backend, and that you restarted
          <code className="mx-1 px-1 rounded bg-muted">npm run dev</code>
          after changing it.
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, Gareth
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {dashboard && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
              syncStatus === "green" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
              syncStatus === "amber" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
              syncStatus === "red" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
            )}>
              <span className={cn("h-2 w-2 rounded-full animate-pulse",
                syncStatus === "green" ? "bg-green-500" : syncStatus === "amber" ? "bg-amber-500" : "bg-red-500"
              )} />
              {lastSyncAt ? `SM8 synced ${timeAgo(lastSyncAt)}` : 'SM8 not synced'}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} loading={syncing}>
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Alert Strip */}
      <div className="grid grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
          ))
        ) : (
          <>
            <AlertCard
              label="unreviewed enquiries"
              count={alerts?.unreviewed_enquiries ?? 0}
              action="Review"
              href="/enquiries?status=New"
            />
            <AlertCard
              label="quotes gone cold"
              count={alerts?.lapsed_quotes ?? 0}
              action="Follow up"
              href="/customers"
            />
            <AlertCard
              label="overdue invoices"
              count={alerts?.overdue_invoices_count ?? 0}
              value={alerts?.overdue_invoices_total ? `${formatCurrency(alerts.overdue_invoices_total)} outstanding` : undefined}
              action="Chase"
              href="/customers"
            />
            <AlertCard
              label="HeatShield services due"
              count={alerts?.heatshield_due_count ?? 0}
              action="Book"
              href="/heatshield"
            />
          </>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
          ))
        ) : (
          <>
            <KPICard title="Revenue Paid MTD" value={formatCurrency(kpis?.revenue_paid_mtd ?? 0)} delta={kpis?.revenue_paid_mtd_delta ?? 0} highlight />
            <KPICard title="Awaiting Payment" value={formatCurrency(kpis?.awaiting_payment_total ?? 0)} delta={0} tint="amber" />
            <KPICard title="Quotes Sent MTD" value={String(kpis?.quotes_sent_mtd ?? 0)} delta={kpis?.quotes_sent_mtd_delta ?? 0} />
            <KPICard title="Quotes Accepted MTD" value={String(kpis?.quotes_accepted_mtd ?? 0)} delta={kpis?.quotes_accepted_mtd_delta ?? 0} />
            <KPICard title="Quotes Declined MTD" value={String(kpis?.quotes_declined_lapsed_mtd ?? 0)} delta={0} />
            <KPICard title="Jobs Completed MTD" value={String(kpis?.jobs_completed_mtd ?? 0)} delta={kpis?.jobs_completed_mtd_delta ?? 0} />
            <KPICard title="HeatShield Members" value={String(kpis?.heatshield_active_count ?? 0)} delta={kpis?.heatshield_active_delta ?? 0} />
            <KPICard title="New Enquiries MTD" value={String(kpis?.enquiries_received_mtd ?? 0)} delta={kpis?.enquiries_received_mtd_delta ?? 0} />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Quote Pipeline — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="h-[200px] bg-muted/50 rounded animate-pulse" />
            ) : (
              <QuoteFunnelChart data={dashboard?.quote_funnel ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Enquiry Quality — All Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-center">
            {isLoading ? (
              <div className="h-[200px] w-full bg-muted/50 rounded animate-pulse" />
            ) : (
              <EnquiryQualityChart qual={dashboard?.enquiry_quality ?? { qualified: 0, rejected: 0, pending: 0 }} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enquiries + Activity Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Recent Enquiries */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Recent Enquiries</CardTitle>
              <Link href="/enquiries">
                <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-muted rounded w-32 animate-pulse" />
                        <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                      </div>
                      <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  ))
                ) : recentEnquiries.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-center text-muted-foreground">No enquiries yet.</p>
                ) : (
                  recentEnquiries.map((enq) => {
                    const ageHrs = (Date.now() - new Date(enq.created_at).getTime()) / 3600000;
                    const veryStale = enq.status === "New" && ageHrs > 48;
                    const stale = enq.status === "New" && ageHrs > 24;
                    const score = enq.ai_score ?? 0;
                    return (
                      <Link
                        key={enq.id}
                        href={`/enquiries/${enq.id}`}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                          veryStale && "border-l-4 border-amber-500",
                          !veryStale && stale && "border-l-4 border-amber-300"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground hover:text-primary truncate">{enq.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{enq.postcode} · {timeAgo(enq.created_at)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0 text-foreground">{enq.job_type}</Badge>
                        <div className="flex items-center gap-1.5 flex-shrink-0 w-20">
                          <Progress value={score} className="h-1.5 flex-1" indicatorClassName={getScoreBg(score)} />
                          <span className={cn("text-xs font-medium w-6 text-right", getScoreColor(score))}>{score}</span>
                        </div>
                        <Badge
                          variant={enq.status === "Qualified" ? "success" : enq.status === "Rejected" ? "destructive" : "warning"}
                          className="flex-shrink-0 text-xs"
                        >
                          {enq.status}
                        </Badge>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Live Activity</CardTitle>
              {hasSyncErrors && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => clearSyncErrors.mutate()}
                  disabled={clearSyncErrors.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear errors
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-muted rounded w-full animate-pulse" />
                        <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : recentActivity.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-center text-muted-foreground">No recent activity.</p>
                ) : (
                  recentActivity.map((event) => {
                    const Icon = getActivityIcon(event.event_type ?? '');
                    return (
                      <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", getActivityColor(event.event_type ?? ''))}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-snug">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(event.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SM8 Jobs Snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Recent Jobs — Last 15</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => window.open('https://app.servicem8.com', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-3 w-3" />
            Open ServiceM8
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Job Ref</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Engineer</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-3 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : recentJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-sm text-center text-muted-foreground">
                      No jobs yet.
                    </td>
                  </tr>
                ) : (
                  recentJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-primary font-medium">{(job as any).job_ref ?? `JOB-${job.id}`}</td>
                      <td className="px-4 py-2.5">
                        {job.client_id ? (
                          <Link href={`/customers/${job.client_id}`} className="hover:text-primary font-medium text-foreground">
                            {(job as any).client_name ?? `Client #${job.client_id}`}
                          </Link>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{job.job_type ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {job.job_date ? new Date(job.job_date).toLocaleDateString("en-GB") : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{job.engineer_name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={
                          job.sm8_status === "Completed" ? "success"
                          : job.sm8_status === "Quote" ? "warning"
                          : job.sm8_status === "Cancelled" ? "destructive"
                          : "slate"
                        } className="text-xs">
                          {job.sm8_status ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {job.invoice_amount && job.invoice_amount > 0 ? (
                          <span className={cn("text-xs font-medium",
                            job.invoice_status === "Paid" ? "text-green-600 dark:text-green-400"
                            : job.invoice_status === "Awaiting Payment" ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                          )}>
                            {formatCurrency(job.invoice_amount)}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
