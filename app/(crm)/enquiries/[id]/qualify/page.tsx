"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronRight, CheckCircle, XCircle, AlertTriangle, Phone, Mail,
  MapPin, Brain, Zap, Loader2,
} from "lucide-react";
import { cn, timeAgo, getScoreColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ACCEPTED_JOB_TYPES = new Set([
  "Boiler Service","Boiler Repair","Boiler Installation","Annual Service",
  "Central Heating","Radiator","Gas Safety Check","Plumbing","Emergency",
  "Heating","Hot Water","Landlord Certificate",
]);

const REJECTION_REASONS = [
  "Outside service area",
  "Job type not offered",
  "Already booked with another engineer",
  "Customer not responsive",
  "Budget mismatch",
  "Emergency only — referred elsewhere",
  "Duplicate enquiry",
  "Other",
];


interface VetCheckProps {
  label: string;
  detail: string;
  status: "pass" | "fail" | "warn";
}

function VetCheck({ label, detail, status }: VetCheckProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 shrink-0">
        {status === "pass" && <CheckCircle className="h-5 w-5 text-green-500" />}
        {status === "fail" && <XCircle className="h-5 w-5 text-red-500" />}
        {status === "warn" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export default function QualifyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rejectionReason, setRejectionReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [actionError, setActionError] = useState("");

  const { data, isLoading } = useQuery({
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

  const approveMutation = useMutation({
    mutationFn: async ({ pushToSM8 }: { pushToSM8: boolean }) => {
      setActionError("");
      const res = await fetch(`/api/enquiries/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          push_to_sm8: pushToSM8,
          override_note: overrideNote || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to qualify");
      return { ...json, requestedPush: pushToSM8 };
    },
    onSuccess: (data) => {
      if (data.requestedPush && !data.sm8_pushed) {
        // Enquiry approved but SM8 push failed — stay on page, show error with retry option
        setActionError(
          `Enquiry approved, but ServiceM8 push failed: ${data.sm8_error ?? "unknown error"}. Use the Retry SM8 button to try again.`
        );
      } else {
        router.push("/enquiries");
      }
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ sendEmail }: { sendEmail: boolean }) => {
      setActionError("");
      if (!rejectionReason) throw new Error("Please select a rejection reason first.");
      const res = await fetch(`/api/enquiries/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason, send_email: sendEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reject");
      return json;
    },
    onSuccess: () => router.push("/enquiries"),
    onError: (e: Error) => setActionError(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.enquiry) return null;

  const enquiry = data.enquiry;
  const inArea = postcodeData?.covered ?? false;
  const jobTypeOk = [...ACCEPTED_JOB_TYPES].some(
    (t) => enquiry.job_type?.toLowerCase().includes(t.toLowerCase())
  );
  const score = enquiry.ai_score ?? 0;
  const descLength = (enquiry.description ?? "").length;
  const isOverridingAI = enquiry.ai_recommendation !== "QUALIFY";
  const alreadyActioned = enquiry.status !== "New";
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const checks: VetCheckProps[] = [
    {
      label: "In service area",
      detail: inArea
        ? `${enquiry.postcode} — confirmed in coverage zone`
        : `${enquiry.postcode} is outside the main service area`,
      status: inArea ? "pass" : "fail",
    },
    {
      label: "Acceptable job type",
      detail: jobTypeOk
        ? `${enquiry.job_type} — within offered services`
        : `${enquiry.job_type} — may be outside offered services`,
      status: jobTypeOk ? "pass" : "warn",
    },
    {
      label: "Customer appears committed",
      detail: score >= 60
        ? "Customer provided specific details and a genuine need"
        : "Customer description is vague — consider a follow-up call",
      status: score >= 60 ? "pass" : "warn",
    },
    {
      label: "Job well described",
      detail: descLength >= 80
        ? `${descLength} characters — good level of detail`
        : "Description is short — consider calling to gather more info",
      status: descLength >= 80 ? "pass" : "warn",
    },
    {
      label: "Budget expectations realistic",
      detail: "No indication of unrealistic budget expectations",
      status: "pass",
    },
  ];

  const passed = checks.filter((c) => c.status === "pass").length;
  const hasCriticalFail = checks.some((c) => c.status === "fail");
  const confidence = enquiry.ai_confidence;
  const confidenceLabel =
    (confidence ?? score / 100) >= 0.7 ? "High confidence"
    : (confidence ?? score / 100) >= 0.4 ? "Moderate confidence"
    : "Low confidence";

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href="/enquiries" className="hover:text-foreground">Enquiries</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/enquiries/${id}`} className="hover:text-foreground">{enquiry.customer_name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Qualify</span>
      </nav>

      {/* Already actioned banner */}
      {alreadyActioned && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm font-medium",
          enquiry.status === "Qualified"
            ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            : "border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
        )}>
          This enquiry has already been <strong>{enquiry.status.toLowerCase()}</strong>. Actions are disabled.
        </div>
      )}

      {/* Customer summary banner */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-bold text-base">{enquiry.customer_name}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />{enquiry.phone}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />{enquiry.email}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {enquiry.postcode}
            {inArea
              ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            }
          </span>
          <Badge variant="outline">{enquiry.job_type}</Badge>
          {enquiry.urgency && enquiry.urgency !== "Normal" && (
            <Badge variant={enquiry.urgency === "Emergency" ? "destructive" : "warning"}>
              {enquiry.urgency}
            </Badge>
          )}
          <span className="text-muted-foreground text-xs ml-auto">{timeAgo(enquiry.created_at)}</span>
        </div>
      </div>

      {/* AI Assessment + Vetting Checklist */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: AI Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-blue-500" />
              Gemini AI Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-24 h-24 rounded-full border-[6px] flex items-center justify-center shrink-0",
                score >= 70 ? "border-green-400" : score >= 40 ? "border-amber-400" : "border-red-400"
              )}>
                <span className={cn("text-3xl font-black", getScoreColor(score))}>
                  {score}
                </span>
              </div>
              <div className="space-y-2">
                <Badge
                  variant={
                    enquiry.ai_recommendation === "QUALIFY" ? "success" :
                    enquiry.ai_recommendation === "REJECT" ? "destructive" : "warning"
                  }
                  className="text-sm px-3 py-1"
                >
                  {enquiry.ai_recommendation ?? "REVIEW"}
                </Badge>
                <p className="text-xs text-muted-foreground">{confidenceLabel}</p>
              </div>
            </div>

            {enquiry.ai_reason && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm leading-relaxed">{enquiry.ai_reason}</p>
              </div>
            )}

            {/* Signal flags */}
            {(() => {
              const flags: string[] = [];
              if (inArea) flags.push("In service area");
              if (descLength > 100) flags.push("Detailed description");
              if (enquiry.source === "Referral") flags.push("Referral source");
              if (enquiry.urgency === "Emergency") flags.push("Emergency");
              if (!inArea) flags.push("Outside area");
              if (score < 50) flags.push("Low score");
              if (flags.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signal Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {flags.map((f) => (
                      <Badge
                        key={f}
                        variant={
                          f === "Emergency" || f === "Outside area" || f === "Low score"
                            ? "destructive"
                            : "success"
                        }
                        className="text-xs"
                      >
                        {f === "Outside area" || f === "Low score" ? `✗ ${f}` : `✓ ${f}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Right: Vetting Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Vetting Checklist</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {checks.map((c, i) => <VetCheck key={i} {...c} />)}

            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Checks passed</span>
                <span className="font-semibold">{passed} of 5</span>
              </div>
              <Progress
                value={(passed / 5) * 100}
                indicatorClassName={
                  passed >= 4 ? "bg-green-500" : passed >= 3 ? "bg-amber-500" : "bg-red-500"
                }
              />
            </div>

            {hasCriticalFail && (
              <div className="mt-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 shrink-0" />
                  A critical check has failed. Qualification is not recommended.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Decision panel */}
      <div className="grid grid-cols-2 rounded-xl border border-border overflow-hidden">
        {/* Qualify side */}
        <div className="bg-green-50/50 dark:bg-green-900/10 p-5 border-r border-border">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Qualify this enquiry
          </h3>
          <div className="space-y-2">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => approveMutation.mutate({ pushToSM8: true })}
              disabled={isPending || alreadyActioned}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Qualify → Push to ServiceM8
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400 dark:border-green-700"
              onClick={() => approveMutation.mutate({ pushToSM8: false })}
              disabled={isPending || alreadyActioned}
            >
              Qualify without pushing to SM8
            </Button>
          </div>

          {isOverridingAI && !alreadyActioned && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                You&apos;re overriding the AI recommendation. Please provide a reason:
              </p>
              <Textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Why are you qualifying against the AI recommendation?"
                className="min-h-[72px] text-sm resize-none"
              />
            </div>
          )}
        </div>

        {/* Reject side */}
        <div className="bg-red-50/50 dark:bg-red-900/10 p-5">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Reject this enquiry
          </h3>
          <div className="space-y-2">
            <Select
              value={rejectionReason}
              onValueChange={setRejectionReason}
              disabled={isPending || alreadyActioned}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select rejection reason…" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
              disabled={!rejectionReason || isPending || alreadyActioned}
              onClick={() => rejectMutation.mutate({ sendEmail: true })}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject and send decline email
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={!rejectionReason || isPending || alreadyActioned}
              onClick={() => rejectMutation.mutate({ sendEmail: false })}
            >
              Reject silently
            </Button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Link href={`/enquiries/${id}`}>
            <Button variant="outline" size="sm">Back to detail</Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`tel:${enquiry.phone}`}>
              <Phone className="h-3.5 w-3.5" /> Call customer
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`mailto:${enquiry.email}`}>
              <Mail className="h-3.5 w-3.5" /> Email customer
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Qualifying will automatically push a new job to ServiceM8 under this customer&apos;s account.
        </p>
      </div>
    </div>
  );
}
