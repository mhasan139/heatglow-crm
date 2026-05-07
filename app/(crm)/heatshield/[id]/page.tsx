"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight, Shield, CheckCircle2, AlertTriangle, Clock,
  Phone, Mail, Loader2, X, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { HeatShieldMember, Job, Client, CancellationReason } from "@/types/index";
import { EmptyState } from "@/components/shared/empty-state";

const CANCELLATION_REASONS: CancellationReason[] = [
  'Price', 'Moving away', 'Switching provider', 'No longer own property',
];

function daysElapsed(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function renewalDate(signUpDate: string): string {
  const d = new Date(signUpDate);
  d.setFullYear(d.getFullYear() + 1);
  return formatDate(d.toISOString().split('T')[0]);
}

interface HeatShieldDetailResponse {
  member: HeatShieldMember & { clients: Client | null };
  jobs: Pick<Job, 'id' | 'job_date' | 'job_type' | 'sm8_status' | 'invoice_amount' | 'invoice_status' | 'job_ref' | 'description'>[];
}

async function fetchMember(id: string): Promise<HeatShieldDetailResponse> {
  const res = await fetch(`/api/heatshield/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to load member');
  }
  return res.json();
}

export default function HeatShieldDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason | ''>('');
  const [servicedToast, setServicedToast] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['heatshield-member', id],
    queryFn: () => fetchMember(id),
    staleTime: 60_000,
  });

  const markServiced = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/heatshield/${id}/mark-serviced`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heatshield-member', id] });
      queryClient.invalidateQueries({ queryKey: ['heatshield'] });
      setServicedToast(true);
      setTimeout(() => setServicedToast(false), 3000);
    },
  });

  const cancelMembership = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/heatshield/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: cancelReason }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (result) => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['heatshield-member', id] });
      if (result.reminder) {
        alert(result.reminder);
      }
      router.push('/heatshield');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading member…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={Shield}
        title="Member not found"
        description={(error as Error)?.message ?? 'This HeatShield member may have been removed.'}
        action={{ label: 'Back to HeatShield', onClick: () => router.push('/heatshield') }}
      />
    );
  }

  const { member, jobs } = data;
  const client = member.clients;
  const days = daysElapsed(member.last_service_date);
  const displayStatus = member.service_due_flag ? 'Service Due' : member.status;
  const isCancelled = member.status === 'Cancelled';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Toast */}
      {servicedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" /> Marked as serviced today
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Cancel Membership</h2>
              <button onClick={() => setShowCancelModal(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel <strong>{member.customer_name}</strong>&apos;s HeatShield membership?
              Remember to also cancel their GoCardless direct debit.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cancellation reason</label>
              <Select value={cancelReason} onValueChange={(v) => setCancelReason(v as CancellationReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>
                Keep Membership
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => cancelMembership.mutate()}
                disabled={cancelMembership.isPending || !cancelReason}
              >
                {cancelMembership.isPending ? 'Cancelling…' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/heatshield" className="hover:text-foreground">HeatShield</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{member.customer_name}</span>
      </nav>

      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{member.customer_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatCurrency(member.monthly_amount_pence / 100)}/month · HeatShield Member
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                member.status === 'Cancelled' ? 'outline'
                : member.service_due_flag ? 'warning'
                : member.status === 'Active' ? 'success'
                : 'destructive'
              }>
                {displayStatus}
              </Badge>
              <Link href={`/heatshield/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />Edit
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Contact */}
          {client && (
            <div className="flex items-center gap-4 flex-wrap">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="h-4 w-4" />{client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" />{client.email}
                </a>
              )}
              <Link href={`/customers/${member.client_id}`} className="ml-auto text-sm text-primary hover:underline">
                View full profile →
              </Link>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Sign-up: </span><span className="font-medium">{formatDate(member.sign_up_date)}</span></div>
            <div><span className="text-muted-foreground">Renewal: </span><span className="font-medium">{renewalDate(member.sign_up_date)}</span></div>
            <div><span className="text-muted-foreground">Last service: </span><span className="font-medium">{formatDate(member.last_service_date)}</span></div>
            <div>
              <span className="text-muted-foreground">Days elapsed: </span>
              <span className={cn('font-semibold', days >= 365 ? 'text-red-600' : days >= 305 ? 'text-amber-600' : 'text-green-600')}>
                {days} days
              </span>
            </div>
            {member.status === 'Cancelled' && member.cancellation_date && (
              <div><span className="text-muted-foreground">Cancelled: </span><span className="font-medium">{formatDate(member.cancellation_date)}</span></div>
            )}
            {member.cancellation_reason && (
              <div><span className="text-muted-foreground">Reason: </span><span className="font-medium">{member.cancellation_reason}</span></div>
            )}
          </div>

          {/* Progress bar */}
          {!isCancelled && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Time since last service</span>
                <span>{days}/365 days</span>
              </div>
              <Progress
                value={Math.min((days / 365) * 100, 100)}
                className="h-2"
                indicatorClassName={days >= 365 ? 'bg-red-500' : days >= 305 ? 'bg-amber-500' : 'bg-green-500'}
              />
            </div>
          )}

          {/* Actions */}
          {!isCancelled && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => markServiced.mutate()}
                disabled={markServiced.isPending}
                data-testid="btn-mark-serviced"
              >
                {markServiced.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 text-green-600" />Mark Serviced Today</>
                )}
              </Button>
              <Button
                variant="outline"
                className="gap-1.5 text-red-600 hover:text-red-700 hover:border-red-300 ml-auto"
                onClick={() => setShowCancelModal(true)}
                data-testid="btn-cancel-membership"
              >
                Cancel Membership
              </Button>
            </div>
          )}

          {markServiced.isError && (
            <p className="text-xs text-red-600">Failed to mark as serviced. Please try again.</p>
          )}

          {/* Notes */}
          {member.notes && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <strong className="text-foreground">Notes:</strong> {member.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {member.service_due_flag && !isCancelled && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            This member&apos;s annual service is due soon. A reminder campaign draft will be created automatically.
          </p>
        </div>
      )}

      {days >= 365 && !isCancelled && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">
            <strong>Overdue:</strong> It&apos;s been {days} days since this member&apos;s last service. This should have been done within 365 days of sign-up.
          </p>
        </div>
      )}

      {/* Service history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold border-b border-border pb-2">Service History ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No jobs recorded in ServiceM8 for this customer yet.
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.job_ref && <span className="font-mono text-xs text-primary">{job.job_ref}</span>}
                    {job.job_type && <Badge variant="outline" className="text-xs">{job.job_type}</Badge>}
                    {job.sm8_status && <Badge variant={job.sm8_status === 'Completed' ? 'success' : 'outline'} className="text-xs">{job.sm8_status}</Badge>}
                    {job.invoice_status && (
                      <Badge variant={job.invoice_status === 'Paid' ? 'success' : job.invoice_status === 'Awaiting Payment' ? 'warning' : 'outline'} className="text-xs">
                        {job.invoice_status}
                      </Badge>
                    )}
                  </div>
                  {job.description && <p className="text-sm text-muted-foreground mt-1.5">{job.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{job.job_date ? formatDate(job.job_date) : 'No date'}</p>
                </div>
                {job.invoice_amount != null && (
                  <p className="text-lg font-bold flex-shrink-0">{formatCurrency(job.invoice_amount)}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
