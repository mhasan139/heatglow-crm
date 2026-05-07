"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Bold, Italic, List, Link2,
  Send, Trash2, Check, Calendar, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignDraft } from "@/types/index";

const MERGE_TAGS = [
  "{first_name}", "{last_name}", "{last_job_type}",
  "{last_job_date}", "{quote_ref}", "{renewal_date}",
];

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

async function fetchCampaign(id: string): Promise<CampaignDraft> {
  const res = await fetch(`/api/campaigns/${id}`);
  if (!res.ok) throw new Error("Not found");
  const json = await res.json();
  return json.campaign ?? json;
}

async function fetchRecipients(id: string): Promise<RecipientsResponse> {
  const res = await fetch(`/api/campaigns/${id}/recipients`);
  if (!res.ok) return { data: [], date_label: "last_job_date", total: 0 };
  return res.json();
}

export default function QueueDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaign(id),
    staleTime: 30_000,
  });

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ["campaign-recipients", id],
    queryFn: () => fetchRecipients(id),
    enabled: !!campaign,
    staleTime: 60_000,
  });

  const recipients = recipientsData?.data ?? [];
  const dateLabel = recipientsData?.date_label === "renewal_date" ? "Renewal date" : "Last job";

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendOption, setSendOption] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveError, setApproveError] = useState("");

  useEffect(() => {
    if (campaign) {
      setName(campaign.name ?? "");
      setSubject(campaign.subject ?? "");
      setBody(campaign.body ?? "");
    }
  }, [campaign]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-queue"] });
      router.push("/campaigns/queue");
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/test-email", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => setTestSent(true),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      setApproveError("");
      const payload: Record<string, unknown> = { name, subject, body };
      if (sendOption === "later" && scheduleDate) {
        payload.scheduled_at = new Date(scheduleDate).toISOString();
      }
      const res = await fetch(`/api/campaigns/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Approve failed");
      return json;
    },
    onSuccess: () => {
      setApproved(true);
      qc.invalidateQueries({ queryKey: ["campaign-queue"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setTimeout(() => router.push("/campaigns/queue"), 1500);
    },
    onError: (err: Error) => setApproveError(err.message),
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="p-6">
        <Link href="/campaigns/queue" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to Queue
        </Link>
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (approved) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-1">Campaign approved!</h2>
        <p className="text-sm text-muted-foreground">
          {sendOption === "now" ? "Sending to recipients now…" : `Scheduled for ${scheduleDate}`}
        </p>
        <p className="text-xs text-muted-foreground mt-2">Redirecting to queue…</p>
      </div>
    );
  }

  const triggerReason = campaign.segment_description
    ?? (campaign.recipient_count != null ? `${campaign.recipient_count} recipients matched` : "Auto-generated");

  return (
    <div className="p-6 max-w-5xl" data-testid="page-queue-detail">
      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold mb-2">Delete this draft?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This campaign draft will be permanently removed from the queue.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/campaigns/queue"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Queue
      </Link>

      {/* Trigger reason banner */}
      <div className="border border-amber-400/60 bg-amber-500/10 rounded-lg px-4 py-3 mb-6 text-sm text-amber-600 dark:text-amber-400">
        <span className="font-semibold">Generated because: </span>{triggerReason}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column ── */}
        <div className="space-y-5 min-w-0">

          {/* Campaign name */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Campaign name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm"
              data-testid="input-campaign-name"
            />
          </div>

          {/* Segment + count */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-normal">
              {campaign.segment_description ?? "All customers"}
            </Badge>
            {campaign.recipient_count != null && (
              <span className="text-xs text-muted-foreground">
                — {campaign.recipient_count} recipients
              </span>
            )}
          </div>

          {/* Recipients table */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Recipients</p>
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{dateLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {recipientsLoading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-5 text-center text-muted-foreground">
                        Loading recipients…
                      </td>
                    </tr>
                  ) : recipients.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-5 text-center text-muted-foreground">
                        No recipients found for this segment
                      </td>
                    </tr>
                  ) : (
                    recipients.slice(0, 20).map((r) => {
                      const dateVal = dateLabel === "Renewal date"
                        ? (r.renewal_date ?? "—")
                        : (r.last_job_date?.slice(0, 10) ?? "—");
                      return (
                        <tr key={r.client_id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{r.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{r.email}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{dateVal}</td>
                        </tr>
                      );
                    })
                  )}
                  {recipients.length > 20 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-center text-muted-foreground">
                        + {recipients.length - 20} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email editor */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Email content</p>

            {/* Subject */}
            <div className="mb-3">
              <label className="block text-xs text-muted-foreground mb-1.5">Subject line</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm"
                data-testid="input-subject"
              />
            </div>

            {/* Body editor */}
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
                <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <List className="h-3.5 w-3.5" />
                </button>
                <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="ml-auto text-xs font-medium text-primary hover:text-primary/80 px-2 py-1"
                >
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>

              {/* Content */}
              {showPreview ? (
                <div className="px-4 py-3 text-sm text-foreground whitespace-pre-line min-h-[220px] leading-relaxed">
                  {body}
                  <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
                    <p>HeatGlow Heating & Plumbing, Cardiff</p>
                    <p className="text-primary cursor-pointer hover:underline">Unsubscribe</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={11}
                  placeholder="Write your email body here…"
                  className="w-full px-4 py-3 text-sm bg-background text-foreground resize-none focus:outline-none leading-relaxed"
                  data-testid="textarea-body"
                />
              )}
            </div>

            {/* Merge tag pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setBody((b) => b + tag)}
                  className="text-[11px] font-mono bg-muted border border-border rounded px-2 py-0.5 hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Test email */}
            <button
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 bg-background hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {testEmailMutation.isPending
                ? "Sending…"
                : testSent
                ? "Test email sent ✓"
                : "Send test email to myself"}
            </button>
          </div>
        </div>

        {/* ── Right: approve panel ── */}
        <div className="sticky top-6">
          <div className="border border-border rounded-xl bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Approve this campaign</h3>

            <div className="space-y-2 mb-4">
              {/* Send now */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  sendOption === "now"
                    ? "border-primary bg-primary/8"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="mt-0.5 relative flex-shrink-0">
                  <input
                    type="radio"
                    name="send-timing"
                    value="now"
                    checked={sendOption === "now"}
                    onChange={() => setSendOption("now")}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    sendOption === "now" ? "border-primary" : "border-muted-foreground"
                  )}>
                    {sendOption === "now" && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground leading-none mb-0.5">Send now</p>
                  <p className="text-[11px] text-muted-foreground">Sends immediately</p>
                </div>
              </label>

              {/* Schedule for later */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  sendOption === "later"
                    ? "border-primary bg-primary/8"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="mt-0.5 relative flex-shrink-0">
                  <input
                    type="radio"
                    name="send-timing"
                    value="later"
                    checked={sendOption === "later"}
                    onChange={() => setSendOption("later")}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    sendOption === "later" ? "border-primary" : "border-muted-foreground"
                  )}>
                    {sendOption === "later" && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-none mb-0.5">Schedule for later</p>
                  {sendOption === "later" && (
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              </label>
            </div>

            {approveError && (
              <p className="text-xs text-destructive mb-3 bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                {approveError}
              </p>
            )}

            <button
              onClick={() => approveMutation.mutate()}
              disabled={(sendOption === "later" && !scheduleDate) || approveMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2.5 mb-2 transition-colors"
              data-testid="btn-approve-schedule"
            >
              {approveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</>
              ) : (
                <><Calendar className="h-4 w-4" /> Approve & Schedule</>
              )}
            </button>

            <button
              onClick={() => setShowDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-600 py-2 transition-colors"
              data-testid="btn-delete"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete this draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
