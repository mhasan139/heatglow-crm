"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight, Phone, Mail, MapPin, CheckCircle, AlertTriangle,
  Clock, Shield, ExternalLink, Brain, Loader2, RotateCcw, ClipboardCheck,
} from "lucide-react";
import { cn, timeAgo, getScoreColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";


function statusVariant(status: string) {
  if (status === "Qualified") return "success";
  if (status === "Rejected") return "destructive";
  if (status === "Expired") return "secondary";
  return "warning";
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  actor: string;
  created_at: string;
}

interface MatchedClient {
  id: number;
  name: string;
  phone: string;
  email: string;
  job_count: number;
  total_spend: number;
  is_heatshield: boolean;
}

interface EnquiryData {
  enquiry: {
    id: number;
    customer_name: string;
    phone: string;
    email: string;
    postcode: string;
    job_type: string;
    urgency: string;
    source: string | null;
    description: string;
    status: string;
    ai_score: number | null;
    ai_recommendation: string | null;
    ai_confidence: number | null;
    ai_reason: string | null;
    ai_flags: string[] | null;
    ai_scored_at: string | null;
    ai_error: boolean;
    sm8_job_uuid: string | null;
    sm8_push_status: string | null;
    recaptcha_score: number | null;
    created_at: string;
  };
  timeline: TimelineEvent[];
  matched_client: MatchedClient | null;
}

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [internalNote, setInternalNote] = useState("");

  const { data, isLoading, error } = useQuery<EnquiryData>({
    queryKey: ["enquiry", id],
    queryFn: async () => {
      const res = await fetch(`/api/enquiries/${id}`);
      if (!res.ok) throw new Error("Failed to load enquiry");
      return res.json();
    },
  });

  const postcode = data?.enquiry?.postcode ?? "";
  const { data: postcodeData } = useQuery({
    queryKey: ["validate-postcode", postcode],
    queryFn: async () => {
      const res = await fetch(`/api/validate-postcode?postcode=${encodeURIComponent(postcode)}`);
      if (!res.ok) return { covered: false };
      return res.json() as Promise<{ covered: boolean }>;
    },
    enabled: !!postcode,
    staleTime: 5 * 60_000,
  });

  const retrySM8Mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/enquiries/${id}/retry-sm8`, { method: "POST" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Retry failed"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enquiry", id] }),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: internalNote }),
      });
      if (!res.ok) throw new Error("Failed to save note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiry", id] });
      setInternalNote("");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Brain}
        title="Enquiry not found"
        description="This enquiry may have been deleted or the link is incorrect."
        action={{ label: "Back to Enquiries", onClick: () => router.back() }}
      />
    );
  }

  const { enquiry, timeline, matched_client } = data;
  const inArea = postcodeData?.covered ?? true;
  const isNew = enquiry.status === "New";

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/enquiries" className="hover:text-foreground">Enquiries</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{enquiry.customer_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">{enquiry.customer_name}</h1>
          <Badge variant={statusVariant(enquiry.status)} className="text-sm">
            {enquiry.status}
          </Badge>
          {enquiry.urgency === "Emergency" && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Emergency
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isNew && (
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              onClick={() => router.push(`/enquiries/${id}/qualify`)}
            >
              <ClipboardCheck className="h-4 w-4" />
              Review &amp; Qualify
            </Button>
          )}
          {enquiry.status === "Qualified" && enquiry.sm8_job_uuid && (
            <Button variant="outline" asChild>
              <a
                href={`https://go.servicem8.com/app#job,${enquiry.sm8_job_uuid}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />View in SM8
              </a>
            </Button>
          )}
          {enquiry.sm8_push_status === "pending" && enquiry.status === "Qualified" && (
            <Button
              variant="outline"
              onClick={() => retrySM8Mutation.mutate()}
              disabled={retrySM8Mutation.isPending}
            >
              {retrySM8Mutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                : <RotateCcw className="h-4 w-4 mr-1" />}
              Retry SM8
            </Button>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {retrySM8Mutation.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {String(retrySM8Mutation.error)}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* ── Left column (2/3) ──────────────────────────────────────────── */}
        <div className="col-span-2 space-y-5">

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${enquiry.phone}`} className="text-sm hover:text-primary">{enquiry.phone}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${enquiry.email}`} className="text-sm hover:text-primary truncate">{enquiry.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono">{enquiry.postcode}</span>
                  {inArea
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500" />
                  }
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Job Type: </span>
                  <span className="font-medium">{enquiry.job_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source: </span>
                  <span className="font-medium">{enquiry.source ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Received: </span>
                  <span className="font-medium">{timeAgo(enquiry.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                {enquiry.description || <span className="text-muted-foreground italic">No description provided.</span>}
              </p>
            </CardContent>
          </Card>

          {/* Gemini AI Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                Gemini AI Assessment
                {enquiry.ai_error && (
                  <Badge variant="destructive" className="text-xs">Scoring failed</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enquiry.ai_score !== null ? (
                <>
                  <div className="flex items-center gap-5">
                    {/* Score ring */}
                    <div className={cn(
                      "relative w-20 h-20 rounded-full border-[5px] flex items-center justify-center shrink-0",
                      (enquiry.ai_score ?? 0) >= 70 ? "border-green-400" :
                      (enquiry.ai_score ?? 0) >= 40 ? "border-amber-400" : "border-red-400"
                    )}>
                      <span className={cn("text-2xl font-black", getScoreColor(enquiry.ai_score ?? 0))}>
                        {enquiry.ai_score}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Badge
                        variant={
                          enquiry.ai_recommendation === "QUALIFY" ? "success" :
                          enquiry.ai_recommendation === "REJECT" ? "destructive" : "warning"
                        }
                        className="text-sm font-semibold px-3 py-1"
                      >
                        {enquiry.ai_recommendation ?? "REVIEW"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Gemini 2.5 Flash-Lite
                        {enquiry.created_at ? ` · ${timeAgo(enquiry.created_at)}` : ""}
                      </p>
                    </div>
                  </div>

                  {enquiry.ai_reason && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm leading-relaxed">{enquiry.ai_reason}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">AI scoring not available.</p>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground pb-3">No activity recorded yet.</p>
              ) : (
                timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-3 relative">
                    {idx < timeline.length - 1 && (
                      <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />
                    )}
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 z-10 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <p className="text-sm">{event.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(event.created_at)} · {event.actor}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* Add note */}
              <div className="pt-3 space-y-2 border-t">
                <Textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add an internal note…"
                  className="min-h-[72px] resize-none text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!internalNote.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? "Saving…" : "Add Note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (1/3) ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Customer Match */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Customer Match</CardTitle>
            </CardHeader>
            <CardContent>
              {matched_client ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Existing customer found</span>
                  </div>
                  <p className="text-sm font-semibold">{matched_client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {matched_client.job_count} jobs · £{matched_client.total_spend.toLocaleString()} total
                  </p>
                  {matched_client.is_heatshield && (
                    <Badge variant="success" className="gap-1 text-xs">
                      <Shield className="h-3 w-3" /> HeatShield Member
                    </Badge>
                  )}
                  <Link href={`/customers/${matched_client.id}`} className="block">
                    <Button size="sm" variant="outline" className="w-full mt-1">View Profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">No match found in SM8.</p>
                  <p className="text-xs text-muted-foreground">This appears to be a new customer.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
                <a href={`tel:${enquiry.phone}`}>
                  <Phone className="h-4 w-4" /> Call {enquiry.phone}
                </a>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
                <a href={`mailto:${enquiry.email}`}>
                  <Mail className="h-4 w-4" /> Email customer
                </a>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
                <a
                  href={
                    enquiry.sm8_job_uuid
                      ? `https://go.servicem8.com/app#job,${enquiry.sm8_job_uuid}`
                      : "https://app.servicem8.com"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" /> View in SM8
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Enquiry Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Enquiry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Urgency</span>
                <Badge variant={
                  enquiry.urgency === "Emergency" ? "destructive" :
                  enquiry.urgency === "Urgent" ? "warning" : "secondary"
                }>
                  {enquiry.urgency}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Job Type</span>
                <span className="font-medium text-right">{enquiry.job_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{enquiry.source ?? "—"}</span>
              </div>
              {enquiry.ai_score !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Score</span>
                  <span className={cn("font-bold", getScoreColor(enquiry.ai_score ?? 0))}>
                    {enquiry.ai_score}/100
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
