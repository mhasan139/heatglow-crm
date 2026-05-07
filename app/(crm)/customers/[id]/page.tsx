"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight, Phone, Mail, MapPin, Shield, ExternalLink, Calendar,
  CheckCircle2, Ban, Send, AlertTriangle, Loader2,
} from "lucide-react";
import { cn, formatDate, formatCurrency, timeAgo } from "@/lib/utils";
import { Client, Job, HeatShieldMember, EmailLog, Enquiry, EnquiryStatus } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";

const JOB_TYPE_COLORS: Record<string, string> = {
  "Boiler Install":         "border-amber-500",
  "Boiler Service":         "border-blue-500",
  "Boiler Repair":          "border-orange-500",
  "Emergency Callout":      "border-red-500",
  "Gas Safety Certificate": "border-green-500",
  "Power Flush":            "border-teal-500",
  "Central Heating":        "border-purple-500",
  "Bathroom":               "border-indigo-500",
  "Other":                  "border-slate-400",
};

interface CustomerDetailResponse {
  client: Client;
  jobs: Job[];
  heatshield: HeatShieldMember | null;
  emails: EmailLog[];
  enquiries: Pick<Enquiry, 'id' | 'created_at' | 'customer_name' | 'job_type' | 'status' | 'ai_score' | 'ai_recommendation' | 'urgency' | 'postcode'>[];
}

async function fetchCustomer(id: string): Promise<CustomerDetailResponse> {
  const res = await fetch(`/api/clients/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to load customer');
  }
  return res.json();
}

function daysElapsed(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [contactedToast, setContactedToast] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomer(id),
    staleTime: 60_000,
  });

  const markServiced = useMutation({
    mutationFn: async () => {
      if (!data?.heatshield) return;
      const res = await fetch(`/api/heatshield/${data.heatshield.id}/mark-serviced`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as serviced');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading customer…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Customer not found"
        description={(error as Error)?.message ?? 'This customer may have been removed from ServiceM8.'}
        action={{ label: 'Back to Customers', onClick: () => window.history.back() }}
      />
    );
  }

  const { client, jobs, heatshield, emails, enquiries } = data;
  const initials = client.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const sm8Url = client.sm8_client_uuid
    ? `https://app.servicem8.com/clients/${client.sm8_client_uuid}`
    : null;

  const hs = heatshield;
  const hsDays = hs?.last_service_date ? daysElapsed(hs.last_service_date) : null;

  return (
    <div className="space-y-5" data-testid="page-customer-profile">
      {/* Toast */}
      {contactedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" /> Marked as contacted
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/customers" className="hover:text-foreground">Customers</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{client.name}</span>
      </nav>

      {/* SM8 banner */}
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5">
        <ExternalLink className="h-4 w-4 text-blue-600" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Synced from ServiceM8 · <span className="font-mono text-xs">{client.sm8_client_uuid}</span>
        </p>
        {sm8Url && (
          <a href={sm8Url} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Button variant="ghost" size="sm" className="text-blue-600 text-xs">View in SM8</Button>
          </a>
        )}
      </div>

      {/* HeatShield banner */}
      {client.is_heatshield && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5">
          <Shield className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">HeatShield Member</p>
          {hs && (
            <Badge variant={
              hs.service_due_flag ? 'warning'
              : hs.status === 'Active' ? 'success'
              : 'destructive'
            }>
              {hs.service_due_flag ? 'Service Due' : hs.status}
            </Badge>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[client.address_line1, client.city, client.postcode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0 text-right">
          {client.customer_since && (
            <div>
              <p className="text-xs text-muted-foreground">Customer since</p>
              <p className="text-sm font-semibold">{formatDate(client.customer_since)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Total spend</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(client.total_spend)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Jobs</p>
            <p className="text-xl font-bold">{client.job_count}</p>
          </div>
        </div>
      </div>

      {/* Contact + actions */}
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
        <div className="ml-auto flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { setContactedToast(true); setTimeout(() => setContactedToast(false), 3000); }}
            data-testid="btn-mark-contacted"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Mark as Contacted
          </Button>
          {sm8Url && (
            <a href={sm8Url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> View in SM8
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Service History ({jobs.length})</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries ({enquiries.length})</TabsTrigger>
          <TabsTrigger value="heatshield">HeatShield</TabsTrigger>
          <TabsTrigger value="comms">Communications ({emails.length})</TabsTrigger>
        </TabsList>

        {/* ── Service History ── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {jobs.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No jobs yet"
              description="Jobs will appear here when synced from ServiceM8."
              action={{ label: 'Open ServiceM8', onClick: () => {} }}
            />
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                data-testid={`card-job-${job.id}`}
                className={cn(
                  'rounded-lg border border-border bg-card p-4 border-l-4',
                  JOB_TYPE_COLORS[job.job_type ?? 'Other'] ?? 'border-slate-400'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.job_ref && <span className="font-mono text-xs text-primary">{job.job_ref}</span>}
                      {job.job_type && <Badge variant="outline" className="text-xs">{job.job_type}</Badge>}
                      {job.sm8_status && (
                        <Badge
                          variant={job.sm8_status === 'Completed' ? 'success' : job.sm8_status === 'Work Order' ? 'info' : 'outline'}
                          className="text-xs"
                        >
                          {job.sm8_status}
                        </Badge>
                      )}
                      {job.invoice_status && (
                        <Badge
                          variant={job.invoice_status === 'Paid' ? 'success' : job.invoice_status === 'Awaiting Payment' ? 'warning' : 'outline'}
                          className="text-xs"
                        >
                          {job.invoice_status}
                        </Badge>
                      )}
                      {job.quote_lapsed && (
                        <Badge variant="destructive" className="text-xs">Quote Lapsed</Badge>
                      )}
                    </div>
                    {job.description && <p className="text-sm mt-1.5 text-muted-foreground">{job.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.job_date ? formatDate(job.job_date) : 'No date'}
                      {job.engineer_name && ` · ${job.engineer_name}`}
                    </p>
                  </div>
                  {job.invoice_amount != null && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold">{formatCurrency(job.invoice_amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* ── Enquiries ── */}
        <TabsContent value="enquiries" className="mt-4 space-y-3">
          {enquiries.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No enquiries"
              description="No enquiries have been matched to this customer."
              action={{ label: 'New Enquiry', onClick: () => {} }}
            />
          ) : (
            enquiries.map((enq) => (
              <Link key={enq.id} href={`/enquiries/${enq.id}`}>
                <div className="rounded-lg border border-border bg-card p-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {enq.job_type && <Badge variant="outline" className="text-xs">{enq.job_type}</Badge>}
                      {enq.urgency === 'Emergency' && <Badge variant="destructive" className="text-xs">Emergency</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(enq.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {enq.ai_score != null && (
                      <span className="text-xs font-semibold text-muted-foreground">AI: {enq.ai_score}</span>
                    )}
                    <Badge
                      variant={
                        enq.status === 'Qualified' ? 'success'
                        : enq.status === 'Rejected' ? 'destructive'
                        : 'warning'
                      }
                      className="text-xs"
                    >
                      {enq.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))
          )}
        </TabsContent>

        {/* ── HeatShield ── */}
        <TabsContent value="heatshield" className="mt-4">
          {!client.is_heatshield || !hs ? (
            <EmptyState
              icon={Shield}
              title="Not a HeatShield member"
              description="This customer isn't currently enrolled in HeatShield."
              action={{ label: 'Enrol in HeatShield', onClick: () => {} }}
            />
          ) : (
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    <Badge variant={
                      hs.service_due_flag ? 'warning'
                      : hs.status === 'Active' ? 'success'
                      : 'destructive'
                    }>
                      {hs.service_due_flag ? 'Service Due' : hs.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly: </span>
                    <span className="font-semibold">
                      {hs.monthly_amount_pence ? formatCurrency(hs.monthly_amount_pence / 100) : '—'}
                      /month
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sign-up: </span>
                    <span className="font-medium">{formatDate(hs.sign_up_date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last service: </span>
                    <span className="font-medium">{formatDate(hs.last_service_date)}</span>
                  </div>
                  {hsDays != null && (
                    <div>
                      <span className="text-muted-foreground">Days elapsed: </span>
                      <span className={cn(
                        'font-semibold',
                        hsDays >= 365 ? 'text-red-600' : hsDays >= 305 ? 'text-amber-600' : 'text-green-600'
                      )}>
                        {hsDays} days
                      </span>
                    </div>
                  )}
                </div>
                {hsDays != null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Time since last service</span>
                      <span>{hsDays}/365 days</span>
                    </div>
                    <Progress
                      value={Math.min((hsDays / 365) * 100, 100)}
                      className="h-2"
                      indicatorClassName={hsDays >= 365 ? 'bg-red-500' : hsDays >= 305 ? 'bg-amber-500' : 'bg-green-500'}
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markServiced.mutate()}
                    disabled={markServiced.isPending}
                  >
                    {markServiced.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Saving…</>
                    ) : 'Mark Serviced Today'}
                  </Button>
                  <Link href={`/heatshield/${hs.id}`}>
                    <Button size="sm" variant="ghost">View HeatShield Record</Button>
                  </Link>
                </div>
                {markServiced.isError && (
                  <p className="text-xs text-red-600">Failed to update. Please try again.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Communications ── */}
        <TabsContent value="comms" className="mt-4 space-y-4">
          {emails.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No emails sent"
              description="Emails sent to this customer will appear here."
              action={{ label: 'Back', onClick: () => {} }}
            />
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                className="rounded-lg border border-border bg-card p-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{email.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To: {email.recipient_email} · {timeAgo(email.created_at)}
                  </p>
                </div>
                <Badge
                  variant={
                    email.status === 'sent' ? 'success'
                    : email.status === 'failed' ? 'destructive'
                    : 'outline'
                  }
                  className="text-xs flex-shrink-0"
                >
                  {email.status}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
