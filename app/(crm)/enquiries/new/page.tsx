"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, CheckCircle, AlertTriangle, ChevronRight, Phone, Mail, MapPin,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const JOB_TYPES = [
  "Boiler Service", "Boiler Repair", "Boiler Install", "Central Heating",
  "Power Flush", "Gas Safety Certificate", "Emergency Callout", "Bathroom", "Other",
];
const DEFAULT_SOURCES = [
  "Phone Call", "Google", "Facebook", "Referral", "Friend/Word of mouth",
  "Checkatrade", "I've used HeatGlow before", "Other",
];
type Urgency = "Normal" | "Urgent" | "Emergency";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function NewEnquiryPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [postcodeInArea, setPostcodeInArea] = useState<boolean | null>(null);
  const [jobType, setJobType] = useState("");
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [source, setSource] = useState("Phone Call");
  const [referredBy, setReferredBy] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("Normal");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load enquiry sources from settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then((data: Record<string, unknown> | null) => {
        if (Array.isArray(data?.enquiry_sources) && (data.enquiry_sources as string[]).length > 0) {
          setSources(data.enquiry_sources as string[]);
          setSource((data.enquiry_sources as string[])[0]);
        }
      })
      .catch(() => {});
  }, []);

  function handlePostcodeChange(val: string) {
    const upper = val.toUpperCase();
    setPostcode(upper);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (upper.length < 3) { setPostcodeInArea(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/validate-postcode?postcode=${encodeURIComponent(upper)}`);
        const { covered } = await res.json();
        setPostcodeInArea(covered);
      } catch {
        setPostcodeInArea(null);
      }
    }, 400);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobType) { setSubmitError("Please select a job type."); return; }
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          phone,
          email: email || undefined,
          postcode,
          job_type: jobType,
          urgency,
          source: source || "",
          referral_name: referredBy || "",
          description,
          internal_notes: notes || "",
          _admin: true,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.message ?? json.error ?? "Submission failed. Please check the details and try again.");
        setSubmitting(false);
        return;
      }

      // Redirect to the enquiry detail page if we have an ID, otherwise list
      if (json.enquiry_id) {
        router.push(`/enquiries/${json.enquiry_id}`);
      } else {
        router.push("/enquiries");
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/enquiries" className="hover:text-foreground transition-colors">Enquiries</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">New Enquiry</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold text-foreground">New Enquiry</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          For phone-in enquiries. Gemini AI will score this automatically on submission.
        </p>
      </div>

      {/* AI banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">AI-powered scoring</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            Gemini AI will score this enquiry (0–100) and recommend whether to qualify, review, or decline. High-scoring enquiries (70+) are auto-pushed to ServiceM8.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Customer */}
        <Section title="1 — Customer Details">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Morgan"
                data-testid="input-full-name"
                required
              />
            </FormField>
            <FormField label="Phone Number" required>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07xxx xxxxxx"
                  className="pl-9"
                  data-testid="input-phone"
                  required
                />
              </div>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="pl-9"
                  data-testid="input-email"
                />
              </div>
            </FormField>
            <FormField label="Postcode" required>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={postcode}
                  onChange={(e) => handlePostcodeChange(e.target.value)}
                  placeholder="CF14 1AB"
                  className={cn(
                    "pl-9 pr-10",
                    postcodeInArea === true && "border-green-400 focus-visible:ring-green-400",
                    postcodeInArea === false && "border-amber-400 focus-visible:ring-amber-400"
                  )}
                  data-testid="input-postcode"
                  required
                />
                {postcodeInArea === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {postcodeInArea === false && (
                  <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                )}
              </div>
              {postcodeInArea === true && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> In service area
                </p>
              )}
              {postcodeInArea === false && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Outside main service area — verify before proceeding
                </p>
              )}
            </FormField>
          </div>
        </Section>

        {/* Section 2: Job Details */}
        <Section title="2 — Job Details">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Job Type" required>
              <Select value={jobType} onValueChange={setJobType} required>
                <SelectTrigger data-testid="input-job-type">
                  <SelectValue placeholder="Select job type…" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="How did they find us?">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger data-testid="input-source">
                  <SelectValue placeholder="Select source…" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          {source === "Referral" && (
            <FormField label="Referred by">
              <Input
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="Who referred them?"
                data-testid="input-referred-by"
              />
            </FormField>
          )}
        </Section>

        {/* Section 3: Urgency */}
        <Section title="3 — Urgency">
          <div className="flex gap-3">
            {(["Normal", "Urgent", "Emergency"] as Urgency[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                data-testid={`button-urgency-${u.toLowerCase()}`}
                className={cn(
                  "flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all",
                  urgency === u && u === "Normal" && "border-primary bg-primary/5 text-primary",
                  urgency === u && u === "Urgent" && "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700",
                  urgency === u && u === "Emergency" && "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700",
                  urgency !== u && "border-border text-muted-foreground hover:border-muted-foreground"
                )}
              >
                {u}
              </button>
            ))}
          </div>
          {urgency === "Emergency" && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Gas emergency?</p>
                <p className="text-xs text-red-700 mt-0.5">
                  If the customer suspects a gas leak, advise them to call the National Gas Emergency line on{" "}
                  <strong>0800 111 999</strong> and leave the property immediately.
                </p>
              </div>
            </div>
          )}
        </Section>

        {/* Section 4: Description & Notes */}
        <Section title="4 — Description &amp; Notes">
          <FormField label="Job Description" required>
            <div className="relative">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the job in detail. What's the problem? How long has it been happening? What boiler/system do they have? The more detail, the better the AI score."
                className="min-h-[120px] resize-none"
                data-testid="input-description"
                maxLength={1000}
                required
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {description.length}/1000
              </span>
            </div>
          </FormField>
          <FormField label="Internal Notes">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">Internal only</Badge>
                <span className="text-xs text-muted-foreground">Not visible to customer</span>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any internal notes about this enquiry…"
                className="min-h-[80px] resize-none"
                data-testid="input-internal-notes"
              />
            </div>
          </FormField>
        </Section>

        {/* Submit */}
        <div className="space-y-3 pt-2 border-t border-border">
          {submitError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Link href="/enquiries">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button
              type="submit"
              loading={submitting}
              className="gap-2"
              data-testid="button-submit-enquiry"
            >
              {submitting ? (
                <>
                  <Brain className="h-4 w-4" />
                  Scoring with AI…
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Submit for AI Qualification
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
