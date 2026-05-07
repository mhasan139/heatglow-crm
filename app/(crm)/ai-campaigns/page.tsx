"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles, Users, ChevronDown, ChevronUp, RefreshCw,
  Wand2, Eye, Send, CheckCircle2, Edit2, X, AlertCircle, Play, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Segments ────────────────────────────────────────────────────────────────

const SEGMENTS = [
  {
    id: "heatshield-due",
    name: "HeatShield — Service Due",
    description: "Members whose annual service is overdue or due soon",
    icon: "🛡️",
    color: "border-blue-300 dark:border-blue-700",
    accentColor: "text-blue-600",
    triggerType: "heatshield_service_due",
  },
  {
    id: "lapsed-quotes",
    name: "Lapsed Quotes — No Response",
    description: "Customers who received a quote but never responded",
    icon: "📋",
    color: "border-amber-300 dark:border-amber-700",
    accentColor: "text-amber-600",
    triggerType: "quote_lapsed",
  },
  {
    id: "inactive-12m",
    name: "Inactive Customers (12m+)",
    description: "Customers with no activity in over 12 months",
    icon: "💤",
    color: "border-purple-300 dark:border-purple-700",
    accentColor: "text-purple-600",
    triggerType: "win_back",
  },
  {
    id: "one-time",
    name: "One-time Customers",
    description: "Customers with exactly one job who have never returned",
    icon: "👋",
    color: "border-green-300 dark:border-green-700",
    accentColor: "text-green-600",
    triggerType: "win_back",
  },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  "heatshield-due":
    "Write a warm, personal reminder about their HeatShield annual service. Reference how long it's been, mention their plan benefit, and make it easy to book. Tone: friendly, not pushy.",
  "lapsed-quotes":
    "Follow up on their unanswered quote. Keep it light — acknowledge they may be busy, leave the door open, don't pressure them.",
  "inactive-12m":
    "Re-engage a customer who hasn't been back in over a year. Remind them we know their setup, and offer priority booking. Warm and personal.",
  "one-time":
    "Win back a one-time customer. Reference their previous job, position HeatGlow as their local trusted engineer. Conversational tone.",
};

interface SampleRecipient {
  id: number;
  name: string;
  email: string;
}

interface GeneratedCampaign {
  subject: string;
  body: string;
  sample_recipients: SampleRecipient[];
  segment_id: string;
  total_count?: number;
}

interface SegmentCount {
  count: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AICampaignManagerPage() {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [campaignMode, setCampaignMode] = useState<"one-time" | "sequence">("one-time");
  const [prompts, setPrompts] = useState<Record<string, string>>(DEFAULT_PROMPTS);
  const [generated, setGenerated] = useState<Record<string, GeneratedCampaign>>({});
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [previewRecipient, setPreviewRecipient] = useState<SampleRecipient | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [sentSegments, setSentSegments] = useState<string[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);

  // Fetch segment count when selecting a segment
  const countMutation = useMutation({
    mutationFn: async (segmentId: string): Promise<SegmentCount> => {
      const res = await fetch("/api/campaigns/segment-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment_id: segmentId }),
      });
      if (!res.ok) throw new Error("Failed to load segment count");
      return res.json();
    },
    onSuccess: (data, segmentId) => {
      setSegmentCounts((prev) => ({ ...prev, [segmentId]: data.count }));
    },
  });

  // AI email generation mutation
  const generateMutation = useMutation({
    mutationFn: async ({ segmentId, prompt }: { segmentId: string; prompt: string }): Promise<GeneratedCampaign> => {
      const count = segmentCounts[segmentId] ?? 0;
      const res = await fetch("/api/campaigns/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_id: segmentId,
          prompt,
          recipient_count: count,
        }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      return res.json();
    },
    onSuccess: (data, { segmentId }) => {
      setGenerated((prev) => ({ ...prev, [segmentId]: data }));
      setExpandedSegment(segmentId);
    },
  });

  // Approve & Send mutation — creates campaign draft + triggers send
  const sendMutation = useMutation({
    mutationFn: async ({ segmentId }: { segmentId: string }) => {
      const seg = SEGMENTS.find((s) => s.id === segmentId)!;
      const gen = generated[segmentId];
      if (!gen) throw new Error("No generated email to send");

      // 1. Create campaign draft
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `AI Campaign — ${seg.name} (${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`,
          subject: gen.subject,
          body: gen.body,
          trigger_type: seg.triggerType,
          segment_filters: [{ field: "__segment__", operator: "eq", value: segmentId }],
          segment_description: seg.description,
          recipient_count: segmentCounts[segmentId] ?? null,
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create campaign");
      const draft = await createRes.json();

      // 2. Approve + send immediately
      const sendRes = await fetch(`/api/campaigns/${draft.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!sendRes.ok) throw new Error("Failed to approve campaign");

      return { campaignId: draft.id };
    },
    onSuccess: (_, { segmentId }) => {
      setSentSegments((prev) => [...prev, segmentId]);
    },
  });

  function handleSelectSegment(segId: string) {
    if (segId === selectedSegment) {
      setSelectedSegment(null);
      return;
    }
    setSelectedSegment(segId);
    // Fetch count if not already loaded
    if (segmentCounts[segId] === undefined) {
      countMutation.mutate(segId);
    }
  }

  const segment = SEGMENTS.find((s) => s.id === selectedSegment);
  const gen = selectedSegment ? generated[selectedSegment] : null;
  const recipients = gen?.sample_recipients ?? [];
  const recipientCount = selectedSegment ? (segmentCounts[selectedSegment] ?? 0) : 0;

  return (
    <div className="p-6 max-w-5xl" data-testid="page-ai-campaigns">
      {/* Email preview modal */}
      {previewRecipient && gen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewRecipient(null)}
        >
          <div
            className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">{previewRecipient.name}</p>
                <p className="text-xs text-muted-foreground">{previewRecipient.email}</p>
              </div>
              <button onClick={() => setPreviewRecipient(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="text-sm font-medium text-foreground">
                {gen.subject.replace(/\{name\}/g, previewRecipient.name.split(" ")[0])}
              </p>
            </div>
            <div className="px-5 py-4 text-sm text-foreground whitespace-pre-line leading-relaxed">
              {gen.body.replace(/\{name\}/g, previewRecipient.name.split(" ")[0])}
            </div>
            <div className="px-5 py-4 border-t border-border text-xs text-muted-foreground">
              <p>HeatGlow Heating &amp; Plumbing, Cardiff</p>
              <p className="text-primary underline cursor-pointer">Unsubscribe</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Campaign Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate hyper-personalised emails for each customer based on their individual history. Tweak the AI prompt, preview every email before sending.
        </p>
      </div>

      {/* How it works banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <Wand2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> Select a customer segment, refine the AI prompt if needed, then generate. Gemini writes a personalised email for the segment — each customer gets their name filled in automatically.
        </p>
      </div>

      {/* Segment picker */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {SEGMENTS.map((seg) => {
          const count = segmentCounts[seg.id];
          const hasEmails = !!generated[seg.id];
          const isSent = sentSegments.includes(seg.id);
          const isLoadingCount = countMutation.isPending && countMutation.variables === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => handleSelectSegment(seg.id)}
              data-testid={`segment-${seg.id}`}
              className={cn(
                "text-left bg-card border-2 rounded-xl p-4 transition-all",
                selectedSegment === seg.id ? "border-primary" : `${seg.color} hover:border-opacity-80`,
                isSent && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">{seg.icon}</span>
                <div className="flex items-center gap-1">
                  {hasEmails && !isSent && (
                    <Badge variant="outline" className="text-[10px] border-green-400 text-green-600">
                      Ready
                    </Badge>
                  )}
                  {isSent && (
                    <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600">
                      Sent
                    </Badge>
                  )}
                  {isLoadingCount ? (
                    <span className="text-xs text-muted-foreground animate-pulse">…</span>
                  ) : count !== undefined ? (
                    <>
                      <span className={cn("text-sm font-bold", seg.accentColor)}>{count}</span>
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </>
                  ) : (
                    <Users className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{seg.name}</p>
              <p className="text-xs text-muted-foreground">{seg.description}</p>
            </button>
          );
        })}
      </div>

      {/* Selected segment workspace */}
      {selectedSegment && segment && (
        <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="segment-workspace">
          {/* Workspace header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {segment.icon} {segment.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {recipientCount > 0 ? `${recipientCount} recipients` : "Counting recipients…"} · AI-personalised per customer
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                generateMutation.mutate({
                  segmentId: selectedSegment,
                  prompt: prompts[selectedSegment] ?? "",
                })
              }
              disabled={generateMutation.isPending}
              data-testid="btn-generate"
              className="flex items-center gap-1.5"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> {gen ? "Regenerate" : "Generate Email"}
                </>
              )}
            </Button>
          </div>

          {/* AI Prompt editor */}
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> AI Prompt
              </p>
              <button
                onClick={() => setEditingPrompt(editingPrompt === selectedSegment ? null : selectedSegment)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" /> {editingPrompt === selectedSegment ? "Done" : "Tweak"}
              </button>
            </div>
            {editingPrompt === selectedSegment ? (
              <textarea
                value={prompts[selectedSegment] ?? ""}
                onChange={(e) => setPrompts((p) => ({ ...p, [selectedSegment]: e.target.value }))}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="prompt-editor"
              />
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">{prompts[selectedSegment]}</p>
            )}
          </div>

          {/* Generate error */}
          {generateMutation.isError && (
            <div className="px-5 py-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              AI generation failed. Using a built-in template instead — you can regenerate or edit the prompt.
            </div>
          )}

          {/* Generated email */}
          {gen ? (
            <div data-testid="generated-emails">
              {/* Email preview card */}
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Generated email
                </p>
                <div className="rounded-lg border border-border bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm font-medium text-foreground mb-3">{gen.subject}</p>
                  <p className="text-xs text-muted-foreground mb-1">Body preview</p>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed line-clamp-6">
                    {gen.body}
                  </p>
                </div>
              </div>

              {/* Sample recipients */}
              {recipients.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <p className="text-xs font-semibold text-foreground">
                      Sample recipients ({recipients.length} shown
                      {recipientCount > recipients.length ? ` of ${recipientCount} total` : ""})
                    </p>
                    <button
                      onClick={() =>
                        setExpandedSegment(expandedSegment === selectedSegment ? null : selectedSegment)
                      }
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {expandedSegment === selectedSegment ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {expandedSegment === selectedSegment ? "Collapse" : "View all"}
                    </button>
                  </div>

                  {expandedSegment === selectedSegment && (
                    <div className="divide-y divide-border">
                      {recipients.map((r) => (
                        <div
                          key={r.id}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                          data-testid={`email-row-${r.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-white">
                                {r.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-[10px] border-green-400 text-green-600">
                              AI written
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setPreviewRecipient(r)}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Preview
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Campaign mode selector */}
              <div className="px-5 py-4 border-t border-border bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Play className="h-3 w-3" /> Campaign Mode
                </p>
                <div className="flex gap-3">
                  <label
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors",
                      campaignMode === "one-time"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="ai-mode"
                      value="one-time"
                      checked={campaignMode === "one-time"}
                      onChange={() => setCampaignMode("one-time")}
                    />
                    One-time send
                  </label>
                  <label
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors",
                      campaignMode === "sequence"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="ai-mode"
                      value="sequence"
                      checked={campaignMode === "sequence"}
                      onChange={() => setCampaignMode("sequence")}
                    />
                    3-touch sequence <span className="text-primary ml-1">(Day 0 / +1d / +4d)</span>
                  </label>
                </div>
                {campaignMode === "sequence" && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Each recipient gets 3 AI-personalised emails sent over 4 days. Sequences stop if they book, reply, or unsubscribe.
                  </div>
                )}
              </div>

              {/* Send action */}
              {sendMutation.isError && (
                <div className="px-5 py-2 bg-red-50 dark:bg-red-950/40 border-t border-red-200 text-xs text-red-600">
                  Failed to send campaign. Please try again.
                </div>
              )}

              {!sentSegments.includes(selectedSegment) ? (
                <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Preview the email above before approving. This will be sent to {recipientCount > 0 ? recipientCount : "all"} real customers.
                    </span>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white shrink-0 ml-3"
                    size="sm"
                    disabled={sendMutation.isPending}
                    onClick={() => sendMutation.mutate({ segmentId: selectedSegment })}
                    data-testid="btn-approve-send"
                  >
                    {sendMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {campaignMode === "sequence" ? "Approve & Start Sequence" : "Approve & Send All"}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="px-5 py-4 border-t border-border flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    Campaign approved — emails are being sent to {recipientCount} customers
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">
                Click <strong>Generate Email</strong> above to create an AI-personalised campaign for this segment.
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedSegment && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            Select a segment above to start generating AI-personalised emails.
          </p>
        </div>
      )}
    </div>
  );
}
