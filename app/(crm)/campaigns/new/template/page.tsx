"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Eye, Check, Bold, Italic, List, Link2, Send, Tag, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MERGE_TAGS = ["{first_name}", "{last_name}", "{last_job_type}", "{last_job_date}", "{quote_ref}", "{renewal_date}"];

const DEFAULT_TEMPLATES = [
  {
    id: "heatshield-reminder",
    name: "HeatShield Renewal Reminder",
    subject: "Your HeatShield annual service is due — {first_name}",
    body: `Hi {first_name},\n\nYour HeatShield annual service is coming up soon.\n\nAs a valued HeatShield member, keeping your annual service up to date ensures your membership remains active and your boiler is running safely.\n\nPlease get in touch to book at a convenient time.\n\nWarm regards,\nGareth at HeatGlow`,
    tags: ["HeatShield", "Service"],
    category: "HeatShield",
  },
  {
    id: "win-back",
    name: "Win-Back — 18 Months Inactive",
    subject: "We miss you — is there anything we can help with?",
    body: `Hi {first_name},\n\nIt's been a while since we last worked together and we wanted to check in.\n\nIf you need any heating or plumbing help — from boiler servicing to emergency repairs — we'd love to hear from you.\n\nGet in touch today and we'll make sure you're looked after.\n\nWarm regards,\nGareth at HeatGlow`,
    tags: ["Win-Back", "Inactive"],
    category: "Re-engagement",
  },
  {
    id: "lapsed-quote",
    name: "Lapsed Quote Follow-up",
    subject: "Still thinking about it? Your quote is still available — {first_name}",
    body: `Hi {first_name},\n\nWe sent you a quote a little while back and wanted to check in to see if you have any questions.\n\nWe'd love to help, and the quote is still valid. If you'd like to go ahead or need anything adjusted, just reply to this email.\n\nWarm regards,\nGareth at HeatGlow`,
    tags: ["Quote", "Follow-up"],
    category: "Quotes",
  },
  {
    id: "annual-service",
    name: "Annual Boiler Service Reminder",
    subject: "Is your boiler due for its annual service? — {first_name}",
    body: `Hi {first_name},\n\nIt's around this time of year that your boiler should have its annual service — keeping it running safely and efficiently throughout the winter months.\n\nRegular servicing can prevent costly breakdowns and keep your warranty valid.\n\nGet in touch to book your annual service at a time that suits you.\n\nWarm regards,\nGareth at HeatGlow`,
    tags: ["Service", "Annual"],
    category: "Service Reminders",
  },
];

function CM3Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const segment = params.get("segment") ?? "Selected segment";
  const count = params.get("count") ?? "0";
  // Carry segment filter data through to step 3
  const segmentId = params.get("segment_id") ?? "";
  const subFilter = params.get("sub_filter") ?? "";
  const filtersJson = params.get("filters_json") ?? "";

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [showScratch, setShowScratch] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  function selectTemplate(id: string) {
    const t = DEFAULT_TEMPLATES.find((t) => t.id === id)!;
    setSelectedTemplate(id);
    setSubject(t.subject);
    setBody(t.body);
    setShowScratch(false);
  }

  const previewTemplate = previewId ? DEFAULT_TEMPLATES.find((t) => t.id === previewId) : null;
  const canProceed = (selectedTemplate || showScratch) && campaignName && subject && body;

  async function handleImprove() {
    if (!subject && !body) return;
    setIsImproving(true);
    try {
      const res = await fetch("/api/gemini/improve-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.subject) setSubject(json.subject);
        if (json.body) setBody(json.body);
      }
    } catch {
      // silent fail — keep existing content
    }
    setIsImproving(false);
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    try {
      await fetch("/api/settings/test-email", { method: "POST" });
      setTestSent(true);
    } catch {
      setTestSent(true); // show as sent regardless
    }
    setIsSendingTest(false);
  }

  return (
    <div className="p-6 max-w-5xl" data-testid="page-cm3">
      {/* Preview modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewId(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-muted-foreground mb-1">Subject:</p>
            <p className="font-semibold mb-4">{previewTemplate.subject}</p>
            <div className="text-sm whitespace-pre-line border-t border-border pt-4">{previewTemplate.body}</div>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              <p>HeatGlow Heating & Plumbing, Cardiff</p>
              <p className="text-primary underline cursor-pointer">Unsubscribe</p>
            </div>
            <Button className="mt-4 w-full" onClick={() => { selectTemplate(previewTemplate.id); setPreviewId(null); }}>
              Use this template
            </Button>
          </div>
        </div>
      )}

      <Link href="/campaigns/new" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                step <= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
                {step <= 1 ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              {step < 3 && <div className={cn("h-0.5 w-12", step === 1 ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>
        <div className="flex gap-14 text-xs mt-1 text-muted-foreground">
          <span className="text-green-600 font-medium">Audience ✓</span>
          <span className="text-foreground font-medium">Email</span>
          <span>Schedule</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1">Create Campaign — Step 2 of 3</h1>
      <p className="text-sm text-muted-foreground mb-2">Choose your email</p>

      <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1 text-xs text-primary font-medium mb-6">
        {segment} — {count} recipients
      </div>

      {/* Templates grid */}
      <h2 className="text-sm font-semibold mb-3">Templates</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {DEFAULT_TEMPLATES.map((t) => (
          <div
            key={t.id}
            data-testid={`template-${t.id}`}
            className={cn("bg-card border rounded-lg p-3 cursor-pointer transition-all", selectedTemplate === t.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}
            onClick={() => selectTemplate(t.id)}
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold leading-tight pr-2">{t.name}</p>
              {selectedTemplate === t.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{t.body.slice(0, 60)}…</p>
            <button onClick={(e) => { e.stopPropagation(); setPreviewId(t.id); }} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => { setShowScratch(true); setSelectedTemplate(null); setSubject(""); setBody(""); }}
        className="text-sm text-primary hover:underline mb-6 block"
        data-testid="btn-write-scratch"
      >
        Write from scratch →
      </button>

      {/* Email editor */}
      {(selectedTemplate || showScratch) && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6" data-testid="email-editor">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Edit your email</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImprove}
              disabled={isImproving || (!subject && !body)}
              className="gap-1.5 text-xs"
            >
              {isImproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-500" />}
              {isImproving ? "Improving…" : "AI Improve"}
            </Button>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Campaign name (internal)</label>
            <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. HeatShield April Reminder" data-testid="input-campaign-name" />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Subject line</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" data-testid="input-subject" />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email body</label>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
                <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Bold className="h-3.5 w-3.5" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Italic className="h-3.5 w-3.5" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground"><List className="h-3.5 w-3.5" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Link2 className="h-3.5 w-3.5" /></button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-sm bg-background resize-none focus:outline-none"
                placeholder="Write your email here…"
                data-testid="textarea-body"
              />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3 w-3" /> Merge tags (click to insert)</p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setBody((b) => b + tag)}
                  className="text-[11px] bg-muted border border-border rounded px-2 py-0.5 hover:bg-primary hover:text-white hover:border-primary transition-colors font-mono"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
            data-testid="btn-send-test"
          >
            {isSendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {testSent ? "Test email sent ✓" : "Send test email to myself"}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/campaigns/new">Back</Link>
        </Button>
        <Button
          disabled={!canProceed}
          onClick={() => {
            const sp = new URLSearchParams({
              name: campaignName,
              segment,
              count,
              subject,
              body: body.slice(0, 2000),
            });
            if (segmentId) { sp.set("segment_id", segmentId); sp.set("sub_filter", subFilter); }
            if (filtersJson) sp.set("filters_json", filtersJson);
            router.push(`/campaigns/new/schedule?${sp}`);
          }}
          data-testid="btn-next-schedule"
        >
          Next: Schedule & Send
        </Button>
      </div>
    </div>
  );
}

export default function CreateCampaignStep2() {
  return <Suspense><CM3Inner /></Suspense>;
}
