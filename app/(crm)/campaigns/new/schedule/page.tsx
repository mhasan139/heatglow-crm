"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Check, Users, Edit2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function CM4Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const campaignName = params.get("name") ?? "My Campaign";
  const segment = params.get("segment") ?? "Selected segment";
  const count = parseInt(params.get("count") ?? "0");
  const subject = params.get("subject") ?? "Email subject";
  const bodyParam = params.get("body") ?? "";
  // Segment filter data — either a predefined segment_id or pre-built filters_json
  const segmentId = params.get("segment_id") ?? "";
  const subFilter = params.get("sub_filter") ?? "3m";
  const filtersJson = params.get("filters_json") ?? "";

  const [sendOption, setSendOption] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suppressedCount = 0;
  const eligible = Math.max(0, count - suppressedCount);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Resolve segment filters (predefined segment_id → real filters via API, or use pre-built filters_json)
      let resolvedFilters: unknown[] = [];

      if (segmentId) {
        // Predefined segment — resolve now to get the actual filters
        try {
          const previewRes = await fetch("/api/campaigns/segment-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ segment_id: segmentId, sub_filter: subFilter }),
          });
          if (previewRes.ok) {
            const { filters } = await previewRes.json();
            resolvedFilters = filters ?? [];
          }
        } catch {
          // Fall through with empty filters — campaign will still be created
        }
      } else if (filtersJson) {
        try {
          resolvedFilters = JSON.parse(filtersJson);
        } catch {
          // ignore parse error
        }
      }

      // 2. Create the campaign draft
      const scheduledAt = sendOption === "later" && scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
        : null;

      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          subject,
          body_html: bodyParam,
          segment_description: segment,
          segment_filters: resolvedFilters.length > 0 ? resolvedFilters : undefined,
          recipient_count: eligible,
          scheduled_at: scheduledAt,
        }),
      });

      if (!createRes.ok) {
        const json = await createRes.json();
        throw new Error(json.error ?? "Failed to create campaign");
      }

      const campaign = await createRes.json();

      // 3. Approve it immediately (will trigger send or scheduling)
      const approveRes = await fetch(`/api/campaigns/${campaign.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      });

      if (!approveRes.ok) {
        const json = await approveRes.json();
        throw new Error(json.error ?? "Failed to approve campaign");
      }

      setConfirmed(true);
      setTimeout(() => router.push("/campaigns"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]" data-testid="confirm-success">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-1">
          {sendOption === "now" ? "Campaign sent!" : "Campaign scheduled!"}
        </h2>
        <p className="text-sm text-muted-foreground">Redirecting to Campaign Manager…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl" data-testid="page-cm4">
      <Link href="/campaigns/new/template" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step <= 3 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
                {step < 3 ? <Check className="h-3.5 w-3.5" /> : 3}
              </div>
              {step < 3 && <div className="h-0.5 w-12 bg-primary" />}
            </div>
          ))}
        </div>
        <div className="flex gap-14 text-xs mt-1 text-muted-foreground">
          <span className="text-green-600 font-medium">Audience ✓</span>
          <span className="text-green-600 font-medium">Email ✓</span>
          <span className="text-foreground font-medium">Schedule</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1">Create Campaign — Step 3 of 3</h1>
      <p className="text-sm text-muted-foreground mb-6">Review & schedule</p>

      {/* Summary card */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6" data-testid="summary-card">
        <h2 className="text-sm font-semibold mb-4">Campaign Summary</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground w-28 shrink-0">Campaign name</span>
            <span className="font-medium">{campaignName}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground w-28 shrink-0">Audience</span>
            <div className="text-right">
              <span className="font-medium">{segment} — {eligible} recipients</span>
              <Link href="/campaigns/new" className="ml-2 text-xs text-primary hover:underline">
                <Edit2 className="h-3 w-3 inline" /> Edit
              </Link>
            </div>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground w-28 shrink-0">Subject</span>
            <div className="text-right flex items-center gap-1">
              <span className="font-medium truncate max-w-[280px]">{subject}</span>
              <Link href="/campaigns/new/template" className="text-xs text-primary hover:underline">
                <Edit2 className="h-3 w-3 inline" /> Edit
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0" />
          Suppressed addresses will be automatically excluded before sending.
        </div>
      </div>

      {/* Schedule options */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6" data-testid="schedule-options">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> When to send
        </h2>
        <div className="space-y-3">
          <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", sendOption === "now" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
            <input type="radio" name="send" value="now" checked={sendOption === "now"} onChange={() => setSendOption("now")} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium">Send now</p>
              <p className="text-xs text-muted-foreground">Sends immediately on confirmation — estimated delivery within 5 minutes</p>
            </div>
          </label>
          <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", sendOption === "later" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
            <input type="radio" name="send" value="later" checked={sendOption === "later"} onChange={() => setSendOption("later")} className="mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Schedule for later</p>
              {sendOption === "later" && (
                <div className="flex items-center gap-2 mt-2">
                  <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-40 text-xs" />
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-28 text-xs" />
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/campaigns">Cancel</Link>
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting || (sendOption === "later" && !scheduleDate)}
          data-testid="btn-confirm-send"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSubmitting ? "Submitting…" : sendOption === "now" ? "Send Now" : "Schedule Campaign"}
        </Button>
      </div>
    </div>
  );
}

export default function CreateCampaignStep3() {
  return <Suspense><CM4Inner /></Suspense>;
}
