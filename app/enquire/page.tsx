"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, Flame, Brain, Phone, Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Urgency = "Normal" | "Urgent" | "Emergency";
type Outcome = "auto_qualify" | "human_review" | "auto_reject" | null;

const JOB_TYPES = [
  "Boiler Service", "Boiler Repair", "Boiler Install", "Central Heating",
  "Power Flush", "Gas Safety Certificate", "Emergency Callout", "Bathroom", "Other",
];
const SOURCES = ["Google", "Facebook", "Referral", "Friend/Word of mouth", "Checkatrade", "I&apos;ve used HeatGlow before", "Other"];

export default function PublicEnquiryPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [jobType, setJobType] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("Normal");
  const [source, setSource] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [postcodeInArea, setPostcodeInArea] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState("");

  async function checkPostcode(pc: string) {
    if (pc.trim().length < 3) { setPostcodeInArea(null); return; }
    try {
      const res = await fetch(`/api/validate-postcode?postcode=${encodeURIComponent(pc)}`);
      const { covered } = await res.json();
      setPostcodeInArea(covered);
    } catch {
      setPostcodeInArea(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          phone,
          email,
          postcode,
          job_type: jobType,
          urgency,
          source: source || null,
          referral_name: referredBy || null,
          description,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setOutcomeMessage(json.message ?? "Thank you for your enquiry.");
      setOutcome(json.outcome ?? "human_review");
    } catch {
      setSubmitError("Unable to submit. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (outcome) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-6 transition-colors duration-500",
        outcome === "auto_qualify" && "bg-green-50",
        outcome === "human_review" && "bg-white",
        outcome === "auto_reject" && "bg-orange-50"
      )}>
        <div className="max-w-md w-full text-center space-y-5">
          {outcome === "auto_qualify" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-900">We can help with that.</h2>
              <p className="text-green-800 leading-relaxed">{outcomeMessage}</p>
              <p className="text-sm text-green-700 font-medium">— Gareth Jones, HeatGlow</p>
            </>
          )}
          {outcome === "human_review" && (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Thanks for getting in touch.</h2>
              <p className="text-muted-foreground leading-relaxed">{outcomeMessage}</p>
              <p className="text-sm text-muted-foreground">If it&apos;s urgent, call us directly.</p>
            </>
          )}
          {outcome === "auto_reject" && (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Flame className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Thanks for reaching out.</h2>
              <p className="text-muted-foreground leading-relaxed">{outcomeMessage}</p>
              <p className="text-sm text-muted-foreground">
                We&apos;d suggest trying <a href="https://www.checkatrade.com" className="text-primary underline font-medium" target="_blank" rel="noopener noreferrer">Checkatrade.com</a> to find a trusted local engineer.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-12 px-4">
      {/* Header */}
      <div className="max-w-xl mx-auto mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
            HeatGlow
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Get a free quote from Gareth</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          We cover Cardiff and the surrounding areas. Fill in the form and we&apos;ll get back to you the same day.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white rounded-2xl border border-border shadow-xl p-8 space-y-6">
        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" data-testid="input-name" required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxx xxxxxx" className="pl-9" data-testid="input-phone" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="pl-9" data-testid="input-email" />
            </div>
          </div>
        </div>

        {/* Postcode */}
        <div className="space-y-1.5">
          <Label>Postcode <span className="text-red-500">*</span></Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              onBlur={(e) => checkPostcode(e.target.value)}
              placeholder="e.g. CF14 1AB"
              className={cn("pl-9 pr-10", postcodeInArea === true && "border-green-400", postcodeInArea === false && "border-amber-400")}
              data-testid="input-postcode"
              required
            />
            {postcodeInArea === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
            {postcodeInArea === false && <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />}
          </div>
          {postcodeInArea === true && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Great — we cover your area!</p>}
          {postcodeInArea === false && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> This postcode may be outside our main area — we&apos;ll confirm when we review your enquiry.</p>}
        </div>

        {/* Job type */}
        <div className="space-y-1.5">
          <Label>What do you need? <span className="text-red-500">*</span></Label>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger data-testid="input-job-type">
              <SelectValue placeholder="Select job type…" />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Urgency */}
        <div className="space-y-2">
          <Label>How urgent is it?</Label>
          <div className="flex gap-2">
            {(["Normal", "Urgent", "Emergency"] as Urgency[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all",
                  urgency === u && u === "Normal" && "border-primary bg-primary/5 text-primary",
                  urgency === u && u === "Urgent" && "border-amber-500 bg-amber-50 text-amber-700",
                  urgency === u && u === "Emergency" && "border-red-500 bg-red-50 text-red-700",
                  urgency !== u && "border-border text-muted-foreground hover:border-muted-foreground"
                )}
              >
                {u}
              </button>
            ))}
          </div>
          {urgency === "Emergency" && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                <strong>Gas leak?</strong> Do not use this form. Call the National Gas Emergency line immediately on <strong>0800 111 999</strong> and leave the building.
              </p>
            </div>
          )}
        </div>

        {/* How did you find us */}
        <div className="space-y-1.5">
          <Label>How did you find us?</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger data-testid="input-source">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {source === "Referral" && (
            <Input value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder="Who referred you?" data-testid="input-referred-by" className="mt-2" />
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label>Tell us about the job <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us as much as you can. What&apos;s the problem? How long has it been happening? What type of boiler or system do you have? The more detail you give, the quicker we can help."
              className="min-h-[120px] resize-none"
              data-testid="input-description"
              maxLength={1000}
              required
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{description.length}/1000</span>
          </div>
        </div>

        {/* Submit */}
        <div className="space-y-3">
          {submitError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}
          <Button type="submit" className="w-full h-11 text-base font-semibold" loading={submitting} data-testid="button-submit-enquiry">
            {submitting ? (
              <>
                <Brain className="h-5 w-5" />
                Checking your details...
              </>
            ) : (
              "Send my enquiry to Gareth"
            )}
          </Button>

          {submitting && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              We&apos;re reviewing your details to make sure we can help. Won&apos;t take a moment…
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Your information will be used to respond to your enquiry only.{" "}
            <span className="underline cursor-pointer">View our Privacy Policy</span>
          </p>
        </div>
      </form>

      {/* Footer */}
      <div className="text-center mt-6 text-xs text-muted-foreground">
        HeatGlow Heating & Plumbing · Cardiff · Registered in Wales
        <br />
        <span className="text-[10px] opacity-60">Powered by Calon AI Solutions</span>
      </div>
    </div>
  );
}
