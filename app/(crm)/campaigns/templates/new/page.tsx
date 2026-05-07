"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bold, Italic, List, Underline, Link2, Image, Send, Eye, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Category = "Win-back" | "HeatShield" | "Seasonal" | "Service Reminder" | "Custom";
const CATEGORIES: Category[] = ["Win-back", "HeatShield", "Seasonal", "Service Reminder", "Custom"];
const MERGE_TAGS = ["{first_name}", "{last_name}", "{last_job_type}", "{last_job_date}", "{quote_ref}", "{renewal_date}", "{unsubscribe_link}"];

export default function CreateTemplatePage() {
  return <TemplateEditor mode="create" />;
}

export function TemplateEditor({ mode, id, initialName = "", initialCategory = "Custom" as Category, initialSubject = "", initialBody = "" }: {
  mode: "create" | "edit";
  id?: number;
  initialName?: string;
  initialCategory?: Category;
  initialSubject?: string;
  initialBody?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isPlainText, setIsPlainText] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [saved, setSaved] = useState<"draft" | "published" | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = name && subject && body;

  if (saved) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
          <Tag className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {saved === "draft" ? "Saved as draft" : "Template saved!"}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {saved === "published" ? `"${name}" is now available in your template library.` : "You can come back and publish it anytime."}
        </p>
        <Button onClick={() => router.push("/campaigns/templates")}>Back to Templates</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl" data-testid="page-template-editor">
      <Link href="/campaigns/templates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Back to Templates
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">
        {mode === "create" ? "Create Template" : `Edit Template: ${initialName}`}
      </h1>

      <div className="grid grid-cols-5 gap-6">
        {/* Editor */}
        <div className="col-span-3 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Template name <span className="text-destructive">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HeatShield Renewal Reminder" data-testid="input-template-name" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              data-testid="select-category"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Subject line <span className="text-destructive">*</span></label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." data-testid="input-subject" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Email body <span className="text-destructive">*</span></label>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsPlainText(!isPlainText)} className="text-xs text-primary hover:underline">
                  {isPlainText ? "Rich text" : "Plain text"}
                </button>
                <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  <Eye className="h-3 w-3" /> {showPreview ? "Edit" : "Preview"}
                </button>
              </div>
            </div>
            {showPreview ? (
              <div className="border border-border rounded-lg p-4 min-h-[200px] text-sm text-foreground whitespace-pre-line bg-white dark:bg-zinc-900">
                {body}
                <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
                  <p>HeatGlow Heating & Plumbing, Cardiff</p>
                  <p className="text-primary underline">{"{unsubscribe_link}"}</p>
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-md overflow-hidden">
                {!isPlainText && (
                  <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Bold className="h-3.5 w-3.5" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Italic className="h-3.5 w-3.5" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Underline className="h-3.5 w-3.5" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground"><List className="h-3.5 w-3.5" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Link2 className="h-3.5 w-3.5" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground"><Image className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none"
                  placeholder="Write your email body here..."
                  data-testid="textarea-body"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setTestSent(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
            data-testid="btn-send-test"
          >
            <Send className="h-3.5 w-3.5" />
            {testSent ? "Test email sent to gareth@heatglow.co.uk ✓" : "Send test email to myself"}
          </button>
        </div>

        {/* Merge tags panel */}
        <div className="col-span-2">
          <div className="bg-card border border-border rounded-xl p-4 sticky top-6">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Merge tags
            </h3>
            <p className="text-[11px] text-muted-foreground mb-3">Click a tag to insert it at cursor position in the email body.</p>
            <div className="space-y-1.5">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setBody((b) => b + tag)}
                  className="w-full text-left text-xs bg-muted hover:bg-primary hover:text-white rounded px-3 py-1.5 font-mono transition-colors border border-border hover:border-primary"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <p className="mt-4 text-sm text-destructive">{saveError}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <Button variant="outline" asChild>
          <Link href="/campaigns/templates">Cancel</Link>
        </Button>
        <Button
          disabled={!canSave || isSaving}
          onClick={async () => {
            setIsSaving(true);
            setSaveError(null);
            try {
              const url = id ? `/api/campaigns/templates/${id}` : "/api/campaigns/templates";
              const method = id ? "PATCH" : "POST";
              const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, subject, body }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error ?? "Failed to save");
              setSaved("published");
            } catch (err) {
              setSaveError(err instanceof Error ? err.message : "Something went wrong");
            }
            setIsSaving(false);
          }}
          data-testid="btn-save-template"
        >
          {isSaving ? "Saving…" : id ? "Update template" : "Save template"}
        </Button>
      </div>
    </div>
  );
}
