"use client";

import { useState, useEffect } from "react";
import {
  FileText, Users, Check, Eye, X, Send, CheckCircle2,
  ChevronRight, ChevronLeft, Calendar, Play, Info, Loader2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Segments ─────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "all-customers",    name: "All Customers",             description: "Every customer in the CRM" },
  { id: "heatshield-active", name: "HeatShield Members",       description: "All active HeatShield members" },
  { id: "heatshield-due",   name: "HeatShield — Service Due", description: "Members with service overdue" },
  { id: "lapsed-quotes",    name: "Lapsed Quotes (3 months)", description: "Unanswered quotes in last 3 months" },
  { id: "inactive-12m",     name: "Inactive 12+ Months",      description: "No activity in over a year" },
  { id: "one-time",         name: "One-time Customers",       description: "Single job, never returned" },
  { id: "heatshield-lapsed", name: "HeatShield Lapsed",       description: "Cover lapsed, not renewed" },
];

type Step = 1 | 2 | 3;

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
}

async function fetchSegmentCount(segmentId: string): Promise<number> {
  const res = await fetch("/api/campaigns/segment-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segment_id: segmentId, sub_filter: "3m" }),
  });
  if (!res.ok) return 0;
  const json = await res.json();
  return json.count ?? 0;
}

export default function CustomCampaignPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [sendOption, setSendOption] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [sent, setSent] = useState(false);
  const [campaignMode, setCampaignMode] = useState<"one-time" | "sequence">("one-time");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  // Load all segment counts in parallel
  useEffect(() => {
    setCountsLoading(true);
    Promise.all(
      SEGMENTS.map(async (seg) => {
        const count = await fetchSegmentCount(seg.id);
        return [seg.id, count] as [string, number];
      })
    ).then((results) => {
      setCounts(Object.fromEntries(results));
      setCountsLoading(false);
    });
  }, []);

  // Load templates
  const { data: templatesData } = useQuery({
    queryKey: ["campaign-templates"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const json = await res.json();
      return (json.data ?? []) as Template[];
    },
  });
  const templates = templatesData ?? [];

  // Send/create campaign
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSegment || !selectedTemplate) throw new Error("Missing segment or template");

      // Resolve segment filters
      const previewRes = await fetch("/api/campaigns/segment-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment_id: selectedSegment, sub_filter: "3m" }),
      });
      const preview = await previewRes.json();

      const segmentName = SEGMENTS.find((s) => s.id === selectedSegment)?.name ?? selectedSegment;

      // Create campaign draft
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${segmentName} — ${selectedTemplate.name}`,
          subject: selectedTemplate.subject,
          body_html: selectedTemplate.body,
          segment_filters: preview.filters ?? [],
          segment_description: segmentName,
          recipient_count: preview.count ?? 0,
          trigger_type: "manual",
          scheduled_at: sendOption === "later" && scheduleDate ? new Date(scheduleDate).toISOString() : null,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error ?? "Failed to create campaign");
      }

      const campaign = await createRes.json();

      // If sending now, trigger send
      if (sendOption === "now") {
        const sendRes = await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
        if (!sendRes.ok) {
          const sendErr = await sendRes.json();
          throw new Error(sendErr.error ?? "Failed to start campaign send");
        }
      }

      return campaign;
    },
    onSuccess: () => setSent(true),
  });

  const seg = selectedSegment ? SEGMENTS.find((s) => s.id === selectedSegment) : null;
  const segCount = selectedSegment ? (counts[selectedSegment] ?? 0) : 0;

  if (sent) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]" data-testid="sent-success">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {sendOption === "now" ? "Campaign sent!" : "Campaign scheduled!"}
        </h2>
        <p className="text-sm text-muted-foreground mb-1">{selectedTemplate?.name}</p>
        <p className="text-xs text-muted-foreground mb-6">{seg?.name} · {segCount} recipients</p>
        <Button onClick={() => {
          setSent(false); setStep(1); setSelectedSegment(null); setSelectedTemplate(null); setSendOption("now"); setScheduleDate("");
        }}>
          Create another
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl" data-testid="page-custom-campaign">
      {/* Template preview modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">{previewTemplate.name}</p>
                <p className="text-xs text-muted-foreground">{previewTemplate.subject}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-foreground whitespace-pre-line leading-relaxed">{previewTemplate.body}</div>
            <div className="px-5 py-4 border-t border-border text-xs text-muted-foreground">
              <p>HeatGlow Heating & Plumbing, Cardiff</p>
              <p className="text-primary underline cursor-pointer">Unsubscribe</p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewTemplate(null)}>Close</Button>
              <Button className="flex-1" onClick={() => { setSelectedTemplate(previewTemplate); setPreviewTemplate(null); }}>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Use this template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Custom Campaign
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Template-based campaigns — no AI credits used. Pick your audience, choose a template, and send.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => s < step && setStep(s)}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                step === s ? "bg-primary text-white" : s < step ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {s < step ? <Check className="h-3.5 w-3.5" /> : s}
            </button>
            {s < 3 && <div className={cn("h-0.5 w-16", s < step ? "bg-green-500" : "bg-border")} />}
          </div>
        ))}
        <div className="flex gap-12 text-xs text-muted-foreground ml-2">
          <span className={step >= 1 ? "text-foreground font-medium" : ""}>Audience</span>
          <span className={step >= 2 ? "text-foreground font-medium" : ""}>Template</span>
          <span className={step >= 3 ? "text-foreground font-medium" : ""}>Schedule</span>
        </div>
      </div>

      {/* ── Step 1: Audience ── */}
      {step === 1 && (
        <div data-testid="step-1">
          <h2 className="text-base font-semibold text-foreground mb-4">Choose your audience</h2>
          <div className="space-y-2 mb-6">
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSegment(s.id)}
                data-testid={`segment-${s.id}`}
                className={cn(
                  "w-full text-left bg-card border rounded-xl px-4 py-3 flex items-center justify-between transition-all",
                  selectedSegment === s.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  {selectedSegment === s.id
                    ? <Check className="h-4 w-4 text-primary" />
                    : <div className="w-4 h-4 rounded-full border border-border" />
                  }
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-muted-foreground shrink-0">
                  {countsLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <><Users className="h-3.5 w-3.5" /> {counts[s.id] ?? 0}</>
                  }
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button disabled={!selectedSegment} onClick={() => setStep(2)} data-testid="btn-step2">
              Next: Choose Template <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Template ── */}
      {step === 2 && (
        <div data-testid="step-2">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-foreground">Choose a template</h2>
            <Badge variant="outline" className="ml-auto text-xs">{seg?.name} · {segCount} recipients</Badge>
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No templates yet. <a href="/campaigns/templates/new" className="text-primary underline">Create one first</a>.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            {templates.map((t) => (
              <div
                key={t.id}
                data-testid={`template-${t.id}`}
                className={cn(
                  "bg-card border rounded-xl p-4 cursor-pointer transition-all",
                  selectedTemplate?.id === t.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"
                )}
                onClick={() => setSelectedTemplate(t)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.subject}</p>
                  </div>
                  {selectedTemplate?.id === t.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.body?.slice(0, 120)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewTemplate(t); }}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  <Eye className="h-3 w-3" /> Preview full email
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!selectedTemplate} onClick={() => setStep(3)} data-testid="btn-step3">
              Next: Schedule <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule & Send ── */}
      {step === 3 && selectedTemplate && seg && (
        <div data-testid="step-3">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setStep(2)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-foreground">Review & send</h2>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Campaign summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience</span>
                <div className="text-right">
                  <span className="font-medium text-foreground">{seg.name}</span>
                  <button onClick={() => setStep(1)} className="ml-2 text-xs text-primary hover:underline">Edit</button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients</span>
                <span className="font-medium text-foreground">{segCount} customers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <div className="text-right">
                  <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                  <button onClick={() => setStep(2)} className="ml-2 text-xs text-primary hover:underline">Edit</button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject line</span>
                <span className="text-foreground max-w-[60%] text-right">{selectedTemplate.subject}</span>
              </div>
            </div>
          </div>

          {/* Campaign Mode */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> Campaign Mode
            </h3>
            <div className="space-y-2">
              <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", campaignMode === "one-time" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
                <input type="radio" name="mode" value="one-time" checked={campaignMode === "one-time"} onChange={() => setCampaignMode("one-time")} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">One-time send</p>
                  <p className="text-xs text-muted-foreground">Single email to the selected audience</p>
                </div>
              </label>
              <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", campaignMode === "sequence" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
                <input type="radio" name="mode" value="sequence" checked={campaignMode === "sequence"} onChange={() => setCampaignMode("sequence")} className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">3-touch sequence</p>
                  <p className="text-xs text-muted-foreground">3 emails sent over 4 days — stops if customer books or replies</p>
                </div>
              </label>
            </div>

            {campaignMode === "sequence" && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Sequence timeline</p>
                <div className="flex items-start gap-0">
                  {[
                    { label: "Email 1", timing: "Day 0", desc: "Sent immediately on launch" },
                    { label: "Email 2", timing: "+1 day", desc: "If no reply or booking" },
                    { label: "Email 3", timing: "+4 days", desc: "Final follow-up" },
                  ].map((e, i) => (
                    <div key={i} className="flex-1 relative">
                      <div className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                          {i < 2 && <div className="w-full h-0.5 bg-border absolute top-3.5 left-1/2 right-0" />}
                        </div>
                      </div>
                      <div className="mt-2 pr-3">
                        <p className="text-xs font-semibold text-foreground">{e.label}</p>
                        <p className="text-[11px] text-primary font-medium">{e.timing}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{e.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  Sequences stop automatically if the customer books a job, replies to an email, or unsubscribes.
                </div>
              </div>
            )}
          </div>

          {/* Schedule options */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> When to send
            </h3>
            <div className="space-y-2">
              <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors", sendOption === "now" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
                <input type="radio" name="send" value="now" checked={sendOption === "now"} onChange={() => setSendOption("now")} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Send now</p>
                  <p className="text-xs text-muted-foreground">Delivers immediately — no AI credits used</p>
                </div>
              </label>
              <label className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer", sendOption === "later" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
                <input type="radio" name="send" value="later" checked={sendOption === "later"} onChange={() => setSendOption("later")} className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Schedule for later</p>
                  {sendOption === "later" && (
                    <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="mt-2 w-40 text-xs" />
                  )}
                </div>
              </label>
            </div>
          </div>

          {sendMutation.isError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {(sendMutation.error as Error)?.message ?? "Failed to send campaign. Please try again."}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(2)} disabled={sendMutation.isPending}>Back</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={(sendOption === "later" && !scheduleDate) || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              data-testid="btn-send"
            >
              {sendMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…</>
                : <><Send className="h-4 w-4 mr-1.5" /> {sendOption === "now" ? "Send Campaign" : "Schedule Campaign"}</>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
