"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, RefreshCw, Mail, Trash2, Plus, Key,
  MapPin, HelpCircle, DollarSign, GripVertical, X, ChevronDown,
  Calendar, Clock, Bell, Sliders, ToggleLeft, Tag, Send,
  CalendarDays, Globe, Loader2, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "text" | "dropdown" | "yes/no" | "number";
interface Question { id: string; text: string; type: QuestionType; required: boolean; }
interface DayHours { enabled: boolean; start: string; end: string; }
interface Holiday { id: string; name: string; date: string; }

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SOURCES = ["Website", "Google", "Facebook", "Checkatrade", "Referral", "Phone", "Friend/Word of mouth", "Returning Customer", "Other"];
const DEFAULT_POSTCODES = ["CF3", "CF5", "CF10", "CF11", "CF14", "CF15", "CF23", "CF24", "CF38", "CF62", "CF63", "CF64", "CF83"];
const DEFAULT_HOURS: Record<string, DayHours> = {
  Monday:    { enabled: true,  start: "08:00", end: "17:00" },
  Tuesday:   { enabled: true,  start: "08:00", end: "17:00" },
  Wednesday: { enabled: true,  start: "08:00", end: "17:00" },
  Thursday:  { enabled: true,  start: "08:00", end: "17:00" },
  Friday:    { enabled: true,  start: "08:00", end: "16:00" },
  Saturday:  { enabled: false, start: "09:00", end: "13:00" },
  Sunday:    { enabled: false, start: "09:00", end: "13:00" },
};
const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: "h1", name: "Christmas Day",  date: "2025-12-25" },
  { id: "h2", name: "Boxing Day",     date: "2025-12-26" },
  { id: "h3", name: "New Year's Day", date: "2026-01-01" },
];
const DEFAULT_QUESTIONS: Record<string, Question[]> = {
  service: [
    { id: "qs1", text: "When was the boiler last serviced?", type: "dropdown", required: true },
    { id: "qs2", text: "Make and model of boiler",           type: "text",     required: false },
    { id: "qs3", text: "Any error codes or faults?",         type: "yes/no",   required: true },
  ],
  repair: [
    { id: "qr1", text: "Describe the fault",                     type: "text",   required: true },
    { id: "qr2", text: "Is there hot water available?",           type: "yes/no", required: true },
    { id: "qr3", text: "How long has the fault been present? (days)", type: "number", required: false },
  ],
  install: [
    { id: "qi1", text: "Current boiler make and model",  type: "text",   required: false },
    { id: "qi2", text: "Number of bedrooms",             type: "number", required: true },
    { id: "qi3", text: "Preferred install date",         type: "text",   required: false },
    { id: "qi4", text: "Is the property a new build?",   type: "yes/no", required: false },
  ],
};
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Text", dropdown: "Dropdown", "yes/no": "Yes / No", number: "Number",
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function SettingSection({ title, description, children, icon }: {
  title: string; description?: string; children: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">{icon}{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function AutomationRow({ label, description, value, onChange, unit, type = "switch" }: {
  label: string; description: string; value: number | boolean; onChange: (v: number | boolean) => void; unit?: string; type?: "switch" | "number";
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {type === "switch" && <Switch checked={value as boolean} onCheckedChange={onChange} />}
      {type === "number" && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} className="w-16 h-8 text-center text-sm" />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      )}
    </div>
  );
}

function ThresholdRow({ label, value, onChange, description }: { label: string; value: number; onChange: (v: number) => void; description: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-28 accent-primary" />
          <span className="text-sm font-bold w-8 text-right">{value}</span>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ questions, onChange }: { questions: Question[]; onChange: (q: Question[]) => void }) {
  const [typeOpen, setTypeOpen] = useState<string | null>(null);
  function updateQ(id: string, patch: Partial<Question>) { onChange(questions.map((q) => q.id === id ? { ...q, ...patch } : q)); }
  function removeQ(id: string) { onChange(questions.filter((q) => q.id !== id)); }
  function addQ() { onChange([...questions, { id: `q${Date.now()}`, text: "", type: "text", required: false }]); }
  return (
    <div className="space-y-2">
      {questions.map((q) => (
        <div key={q.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
          <Input value={q.text} onChange={(e) => updateQ(q.id, { text: e.target.value })} placeholder="Question text…" className="flex-1 h-8 text-sm" />
          <div className="relative">
            <button onClick={() => setTypeOpen(typeOpen === q.id ? null : q.id)} className="flex items-center gap-1 text-xs font-medium bg-background border border-border rounded-md px-2.5 py-1.5 hover:border-primary whitespace-nowrap">
              {QUESTION_TYPE_LABELS[q.type]} <ChevronDown className="h-3 w-3" />
            </button>
            {typeOpen === q.id && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-xl py-1 w-28 text-xs">
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                  <button key={t} onClick={() => { updateQ(q.id, { type: t }); setTypeOpen(null); }} className={cn("w-full text-left px-3 py-1.5 hover:bg-muted", q.type === t && "font-semibold text-primary")}>
                    {QUESTION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Switch checked={q.required} onCheckedChange={(v) => updateQ(q.id, { required: v })} className="scale-75" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Required</span>
          </div>
          <button onClick={() => removeQ(q.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1.5 w-full text-xs" onClick={addQ}><Plus className="h-3.5 w-3.5" /> Add Question</Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const loadedRef = useRef(false);
  // Track which section is currently saving (null = none)
  const [savingSection, setSavingSection] = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── General ───────────────────────────────────────────────────────────────
  const [fromName,  setFromName]  = useState("Gareth at HeatGlow");
  const [fromEmail, setFromEmail] = useState("info@heatglow.co.uk");
  const [replyTo,   setReplyTo]   = useState("gareth@heatglow.co.uk");
  const [sources,   setSources]   = useState<string[]>(DEFAULT_SOURCES);
  const [newSource, setNewSource] = useState("");
  const [notifEmail,          setNotifEmail]          = useState("gareth@heatglow.co.uk");
  const [notifNewEnquiry,     setNotifNewEnquiry]     = useState(true);
  const [notifAutoQualified,  setNotifAutoQualified]  = useState(true);
  const [notifAutoRejected,   setNotifAutoRejected]   = useState(false);
  const [notifCampaignDraft,  setNotifCampaignDraft]  = useState(true);
  const [notifHeatShieldDue,  setNotifHeatShieldDue]  = useState(true);
  const [notifInvoiceOverdue, setNotifInvoiceOverdue] = useState(true);
  const [notifNewBooking,     setNotifNewBooking]     = useState(true);
  const [postcodes,    setPostcodes]   = useState<string[]>(DEFAULT_POSTCODES);
  const [newPostcode,  setNewPostcode] = useState("");

  // ── Calendar ──────────────────────────────────────────────────────────────
  const [calendarProvider,  setCalendarProvider]  = useState<"sm8" | "google" | "none">("sm8");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [maxJobsPerDay,     setMaxJobsPerDay]     = useState(5);
  const [slotDuration,      setSlotDuration]      = useState(90);
  const [leadTimeDays,      setLeadTimeDays]      = useState(1);
  const [hours,             setHours]             = useState<Record<string, DayHours>>(DEFAULT_HOURS);
  const [holidays,          setHolidays]          = useState<Holiday[]>(DEFAULT_HOLIDAYS);
  const [newHolidayName,    setNewHolidayName]    = useState("");
  const [newHolidayDate,    setNewHolidayDate]    = useState("");
  function updateHours(day: string, patch: Partial<DayHours>) { setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } })); }

  // ── AI & Qualification ────────────────────────────────────────────────────
  const [aiServiceQualify, setAiServiceQualify] = useState(65);
  const [aiServiceReject,  setAiServiceReject]  = useState(30);
  const [aiRepairQualify,  setAiRepairQualify]  = useState(70);
  const [aiRepairReject,   setAiRepairReject]   = useState(25);
  const [aiInstallQualify, setAiInstallQualify] = useState(75);
  const [aiInstallReject,  setAiInstallReject]  = useState(20);
  const [autoQService, setAutoQService] = useState(true);
  const [autoQRepair,  setAutoQRepair]  = useState(true);
  const [autoQInstall, setAutoQInstall] = useState(false);
  const [autoRService, setAutoRService] = useState(false);
  const [autoRRepair,  setAutoRRepair]  = useState(false);
  const [autoRInstall, setAutoRInstall] = useState(false);
  const [budgetThreshold, setBudgetThreshold] = useState(2000);
  const [serviceQ, setServiceQ] = useState<Question[]>(DEFAULT_QUESTIONS.service);
  const [repairQ,  setRepairQ]  = useState<Question[]>(DEFAULT_QUESTIONS.repair);
  const [installQ, setInstallQ] = useState<Question[]>(DEFAULT_QUESTIONS.install);

  // ── Automation ────────────────────────────────────────────────────────────
  const [autoQualify,       setAutoQualify]       = useState(true);
  const [autoReject,        setAutoReject]        = useState(false);
  const [autoQThreshold,    setAutoQThreshold]    = useState(70);
  const [autoRThreshold,    setAutoRThreshold]    = useState(25);
  const [quoteLapseDays,    setQuoteLapseDays]    = useState(14);
  const [invoiceAlertDays,  setInvoiceAlertDays]  = useState(7);
  const [reminderDays,      setReminderDays]      = useState(30);
  const [staleEnquiryHours, setStaleEnquiryHours] = useState(24);
  const [autoExpireDays,    setAutoExpireDays]    = useState(90);
  const [coldQuoteAlert,    setColdQuoteAlert]    = useState(true);
  const [overdueAlert,      setOverdueAlert]      = useState(true);
  const [hsReminders,       setHsReminders]       = useState(true);

  // ── Integrations ──────────────────────────────────────────────────────────
  const [testingConn,      setTestingConn]      = useState(false);
  const [connOk,           setConnOk]           = useState(false);
  const [sendingTest,      setSendingTest]      = useState(false);
  const [sm8ApiKey,        setSm8ApiKey]        = useState("");
  const [sm8ApiKeyVisible, setSm8ApiKeyVisible] = useState(false);
  const [resendApiKey,     setResendApiKey]     = useState("");
  const [resendApiKeyVisible, setResendApiKeyVisible] = useState(false);

  // ── Fetch all settings ────────────────────────────────────────────────────
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) return null;
      return res.json() as Promise<Record<string, unknown>>;
    },
    staleTime: 30_000,
  });

  // Hydrate all local state from DB on first load only (guard via ref, not state)
  useEffect(() => {
    if (!settingsData || loadedRef.current) return;
    const s = settingsData;
    const str  = (k: string, def: string) => typeof s[k] === 'string' ? (s[k] as string) : def;
    const num  = (k: string, def: number) => typeof s[k] === 'number' ? (s[k] as number) : def;
    const bool = (k: string, def: boolean) => typeof s[k] === 'boolean' ? (s[k] as boolean) : def;
    const arr  = <T,>(k: string, def: T[]) => Array.isArray(s[k]) ? (s[k] as T[]) : def;

    setFromName(str('from_name', "Gareth at HeatGlow"));
    setFromEmail(str('from_email', "info@heatglow.co.uk"));
    setReplyTo(str('reply_to_email', "gareth@heatglow.co.uk"));
    setSources(arr<string>('enquiry_sources', DEFAULT_SOURCES));
    setNotifEmail(str('notification_email', "gareth@heatglow.co.uk"));
    setNotifNewEnquiry(bool('notif_new_enquiry', true));
    setNotifAutoQualified(bool('notif_auto_qualified', true));
    setNotifAutoRejected(bool('notif_auto_rejected', false));
    setNotifCampaignDraft(bool('notif_campaign_draft', true));
    setNotifHeatShieldDue(bool('notif_heatshield_due', true));
    setNotifInvoiceOverdue(bool('notif_invoice_overdue', true));
    setNotifNewBooking(bool('notif_new_booking', true));
    setPostcodes(arr<string>('service_area_postcodes', DEFAULT_POSTCODES));

    const savedHours = s['working_hours'] as Record<string, DayHours> | null;
    if (savedHours && typeof savedHours === 'object' && Object.keys(savedHours).length > 0) {
      setHours({ ...DEFAULT_HOURS, ...savedHours });
    }
    const savedHolidays = s['holidays'] as Holiday[] | null;
    if (Array.isArray(savedHolidays)) setHolidays(savedHolidays);
    setCalendarProvider((str('calendar_provider', 'sm8') as "sm8" | "google" | "none"));
    setMaxJobsPerDay(num('max_jobs_per_day', 5));
    setSlotDuration(num('slot_duration_mins', 90));
    setLeadTimeDays(num('lead_time_days', 1));

    setAiServiceQualify(num('ai_service_qualify', 65));
    setAiServiceReject(num('ai_service_reject', 30));
    setAiRepairQualify(num('ai_repair_qualify', 70));
    setAiRepairReject(num('ai_repair_reject', 25));
    setAiInstallQualify(num('ai_install_qualify', 75));
    setAiInstallReject(num('ai_install_reject', 20));
    setAutoQService(bool('auto_q_service', true));
    setAutoQRepair(bool('auto_q_repair', true));
    setAutoQInstall(bool('auto_q_install', false));
    setAutoRService(bool('auto_r_service', false));
    setAutoRRepair(bool('auto_r_repair', false));
    setAutoRInstall(bool('auto_r_install', false));
    setBudgetThreshold(num('install_budget_threshold', 2000));
    const sq = arr<Question>('qualifying_questions_service', DEFAULT_QUESTIONS.service);
    const rq = arr<Question>('qualifying_questions_repair', DEFAULT_QUESTIONS.repair);
    const iq = arr<Question>('qualifying_questions_install', DEFAULT_QUESTIONS.install);
    if (sq.length) setServiceQ(sq);
    if (rq.length) setRepairQ(rq);
    if (iq.length) setInstallQ(iq);

    setAutoQualify(bool('auto_qualify_enabled', true));
    setAutoReject(bool('auto_reject_enabled', false));
    setAutoQThreshold(num('auto_qualify_threshold', 70));
    setAutoRThreshold(num('auto_reject_threshold', 25));
    setQuoteLapseDays(num('quote_lapse_days', 14));
    setInvoiceAlertDays(num('overdue_invoice_days', 7));
    setReminderDays(num('heatshield_reminder_days', 30));
    setStaleEnquiryHours(num('stale_enquiry_alert_hours', 24));
    setAutoExpireDays(num('auto_expire_days', 90));
    setColdQuoteAlert(bool('cold_quote_alerts', true));
    setOverdueAlert(bool('overdue_alerts', true));
    setHsReminders(bool('hs_reminders', true));

    setSm8ApiKey(str('sm8_api_key', ''));
    setResendApiKey(str('resend_api_key', ''));

    loadedRef.current = true;
  }, [settingsData]);

  // ── SM8 status ────────────────────────────────────────────────────────────
  const { data: sm8Status, refetch: refetchSm8 } = useQuery({
    queryKey: ['sm8-status'],
    queryFn: async () => {
      const res = await fetch('/api/settings/sm8-status');
      if (!res.ok) return null;
      return res.json() as Promise<{
        connected: boolean;
        expires_at: string | null;
        last_sync: {
          completed_at: string;
          records_updated: number;
          status?: string;
          error_message?: string | null;
        } | null;
      }>;
    },
    staleTime: 30_000,
  });

  // ── Per-section save ──────────────────────────────────────────────────────
  async function saveSection(section: string, patch: Record<string, unknown>) {
    setSavingSection(section);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as Record<string, string>).error ?? 'Save failed');
      }
      // Update cache directly — avoids triggering a refetch that races with local state
      qc.setQueryData(['settings'], (old: Record<string, unknown> | undefined) => ({ ...(old ?? {}), ...patch }));
      showToast('Settings saved');
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setSavingSection(null);
    }
  }

  const syncNow = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/sm8-sync-now', { method: 'POST' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Sync failed'); }
    },
    onSuccess: () => { showToast('Sync started'); setTimeout(() => refetchSm8(), 5000); },
    onError: (e) => showToast((e as Error).message, false),
  });

  async function handleTestConn() {
    setTestingConn(true);
    const { data } = await refetchSm8();
    setConnOk(data?.connected ?? false);
    setTestingConn(false);
  }

  async function handleTestEmail() {
    setSendingTest(true);
    try {
      const res = await fetch('/api/settings/test-email', { method: 'POST' });
      const data = await res.json();
      showToast(res.ok ? `Test email sent to ${data.sent_to}` : 'Failed to send test email', res.ok);
    } catch { showToast('Failed to send test email', false); }
    setSendingTest(false);
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6" data-testid="page-settings">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white",
          toast.ok ? "bg-green-600" : "bg-red-600"
        )}>
          {toast.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">CRM configuration, integrations and automation</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="ai">AI & Qualification</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="team">Team & GDPR</TabsTrigger>
        </TabsList>

        {/* ═══ GENERAL ═══ */}
        <TabsContent value="general" className="space-y-5 mt-4">

          {/* Sender details */}
          <SettingSection title="Sender Details" description="Name and email address used for all outbound emails." icon={<Send className="h-4 w-4 text-primary" />}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>From Name</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Gareth at HeatGlow" />
                <p className="text-xs text-muted-foreground">Displayed as the sender name in email clients.</p>
              </div>
              <div className="space-y-1.5">
                <Label>From Email</Label>
                <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="info@heatglow.co.uk" />
              </div>
              <div className="space-y-1.5">
                <Label>Reply-To Email</Label>
                <Input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="gareth@heatglow.co.uk" />
                <p className="text-xs text-muted-foreground">Replies from customers will go to this address.</p>
              </div>
            </div>
            <Button size="sm" disabled={savingSection === 'sender'} onClick={() => saveSection('sender', { from_name: fromName, from_email: fromEmail, reply_to_email: replyTo })}>
              {savingSection === 'sender' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Sender Details
            </Button>
          </SettingSection>

          {/* Enquiry Sources */}
          <SettingSection title="Enquiry Sources" description="Manage the source options available when logging an enquiry." icon={<Tag className="h-4 w-4 text-primary" />}>
            <div className="flex flex-wrap gap-2 mb-2">
              {sources.map((s) => (
                <span key={s} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-xs font-medium">
                  {s}
                  <button onClick={() => setSources((p) => p.filter((x) => x !== s))} className="text-muted-foreground hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="New source…" value={newSource} onChange={(e) => setNewSource(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newSource.trim()) { setSources((p) => [...p, newSource.trim()]); setNewSource(""); }}}
                className="max-w-[200px] text-sm" />
              <Button variant="outline" size="sm" onClick={() => { if (newSource.trim()) { setSources((p) => [...p, newSource.trim()]); setNewSource(""); }}}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add
              </Button>
              <Button size="sm" className="ml-auto" disabled={savingSection === 'sources'} onClick={() => saveSection('sources', { enquiry_sources: sources })}>
                {savingSection === 'sources' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Sources
              </Button>
            </div>
          </SettingSection>

          {/* Notification preferences */}
          <SettingSection title="Notification Preferences" description="Choose which events trigger an email alert to you." icon={<Bell className="h-4 w-4 text-primary" />}>
            <div className="space-y-1.5 mb-3">
              <Label>Send notifications to</Label>
              <Input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} className="max-w-xs" />
            </div>
            <div className="space-y-0">
              {[
                { label: "New enquiry submitted",       key: "notif_new_enquiry",     value: notifNewEnquiry,     set: setNotifNewEnquiry },
                { label: "Enquiry auto-qualified",       key: "notif_auto_qualified",  value: notifAutoQualified,  set: setNotifAutoQualified },
                { label: "Enquiry auto-rejected",        key: "notif_auto_rejected",   value: notifAutoRejected,   set: setNotifAutoRejected },
                { label: "New campaign draft in queue",  key: "notif_campaign_draft",  value: notifCampaignDraft,  set: setNotifCampaignDraft },
                { label: "HeatShield service due alert", key: "notif_heatshield_due",  value: notifHeatShieldDue,  set: setNotifHeatShieldDue },
                { label: "Invoice overdue alert",        key: "notif_invoice_overdue", value: notifInvoiceOverdue, set: setNotifInvoiceOverdue },
                { label: "New booking from campaign",    key: "notif_new_booking",     value: notifNewBooking,     set: setNotifNewBooking },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-sm">{label}</span>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </div>
            <Button size="sm" disabled={savingSection === 'notif'} onClick={() => saveSection('notif', {
              notification_email: notifEmail,
              notif_new_enquiry: notifNewEnquiry, notif_auto_qualified: notifAutoQualified,
              notif_auto_rejected: notifAutoRejected, notif_campaign_draft: notifCampaignDraft,
              notif_heatshield_due: notifHeatShieldDue, notif_invoice_overdue: notifInvoiceOverdue,
              notif_new_booking: notifNewBooking,
            })}>
              {savingSection === 'notif' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Preferences
            </Button>
          </SettingSection>

          {/* Service Area Postcodes */}
          <SettingSection title="Service Area Postcodes" description="Only enquiries from these postcode districts are accepted." icon={<MapPin className="h-4 w-4 text-primary" />}>
            <div className="flex flex-wrap gap-2 mb-2">
              {postcodes.map((pc) => (
                <span key={pc} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-xs font-mono font-semibold">
                  {pc}
                  <button onClick={() => setPostcodes((p) => p.filter((x) => x !== pc))} className="text-muted-foreground hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="e.g. CF10" value={newPostcode} onChange={(e) => setNewPostcode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter" && newPostcode.trim()) { setPostcodes((p) => [...p, newPostcode.trim()]); setNewPostcode(""); }}}
                className="max-w-[120px] font-mono text-sm uppercase" />
              <Button variant="outline" size="sm" onClick={() => { if (newPostcode.trim()) { setPostcodes((p) => [...p, newPostcode.trim()]); setNewPostcode(""); }}}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add
              </Button>
              <Button size="sm" className="ml-auto" disabled={savingSection === 'postcodes'} onClick={() => saveSection('postcodes', { service_area_postcodes: postcodes })}>
                {savingSection === 'postcodes' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Postcodes
              </Button>
            </div>
          </SettingSection>
        </TabsContent>

        {/* ═══ INTEGRATIONS ═══ */}
        <TabsContent value="integrations" className="space-y-5 mt-4">

          {/* ServiceM8 */}
          <SettingSection title="ServiceM8 Connection" description="Reads job, customer, and invoice data from your SM8 account.">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
                sm8Status?.connected
                  ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)] border-transparent"
                  : "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)] border-transparent")}>
                <span className={cn("h-2 w-2 rounded-full", sm8Status?.connected ? "bg-green-500" : "bg-amber-500")} />
                {sm8Status?.connected ? 'Connected' : 'Not connected'}
              </div>
              {sm8Status?.last_sync && (
                <span className="text-xs text-muted-foreground">
                  Last sync: {timeAgo(sm8Status.last_sync.completed_at)} ·{" "}
                  {sm8Status.last_sync.status === "failed"
                    ? "failed"
                    : `${sm8Status.last_sync.records_updated} records updated`}
                </span>
              )}
            </div>
            {sm8Status?.last_sync?.status === "failed" && sm8Status.last_sync.error_message && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span className="font-mono break-all">{sm8Status.last_sync.error_message}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={sm8ApiKeyVisible ? "text" : "password"}
                  value={sm8ApiKey}
                  onChange={(e) => setSm8ApiKey(e.target.value)}
                  placeholder="Enter SM8 API key…"
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setSm8ApiKeyVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {sm8ApiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="outline" size="sm" onClick={handleTestConn} disabled={testingConn}>
                {testingConn ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Test Connection
              </Button>
              <a href="/api/auth/sm8">
                <Button variant="outline" size="sm">
                  <Key className="h-3.5 w-3.5 mr-1" />Reconnect OAuth
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => syncNow.mutate()} disabled={syncNow.isPending}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", syncNow.isPending && "animate-spin")} />Sync Now
              </Button>
              <Button
                size="sm"
                className="ml-auto"
                disabled={savingSection === 'sm8-key'}
                onClick={() => saveSection('sm8-key', { sm8_api_key: sm8ApiKey })}
              >
                {savingSection === 'sm8-key' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save API Key
              </Button>
            </div>
            {connOk && (
              <div className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle className="h-4 w-4" />Connection successful
              </div>
            )}
          </SettingSection>

          {/* Resend */}
          <SettingSection title="Email — Resend" description="Outbound email is sent via Resend API from your configured sender address.">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)] border-transparent">
                <span className="h-2 w-2 rounded-full bg-green-500" />Connected
              </div>
              <span className="text-xs text-muted-foreground">Sending as: {fromName} &lt;{fromEmail}&gt;</span>
            </div>

            <div className="space-y-1.5">
              <Label>Resend API Key</Label>
              <div className="relative">
                <Input
                  type={resendApiKeyVisible ? "text" : "password"}
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder="re_…"
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setResendApiKeyVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {resendApiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={sendingTest}>
                {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Mail className="h-3.5 w-3.5 mr-1" />}Send Test Email
              </Button>
              <Button
                size="sm"
                className="ml-auto"
                disabled={savingSection === 'resend-key'}
                onClick={() => saveSection('resend-key', { resend_api_key: resendApiKey })}
              >
                {savingSection === 'resend-key' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save API Key
              </Button>
            </div>
          </SettingSection>

        </TabsContent>

        {/* ═══ CALENDAR ═══ */}
        <TabsContent value="calendar" className="space-y-5 mt-4">
          <SettingSection title="Calendar Integration" description="Choose how service enquiries are booked into your diary." icon={<Calendar className="h-4 w-4 text-primary" />}>
            <div className="space-y-2">
              {[
                { value: "sm8",    label: "ServiceM8 Diary",   desc: "Use SM8's built-in job diary for slot availability" },
                { value: "google", label: "Google Calendar",   desc: "Connect a Google Calendar for availability management" },
                { value: "none",   label: "No direct booking", desc: "Customers request a callback rather than booking a slot" },
              ].map((opt) => (
                <label key={opt.value} className={cn("flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  calendarProvider === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
                  <input type="radio" name="calendar" value={opt.value} checked={calendarProvider === opt.value} onChange={() => setCalendarProvider(opt.value as "sm8" | "google" | "none")} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {calendarProvider === "google" && (
              <div className="pt-2">
                {calendarConnected ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)] border-transparent">
                      <span className="h-2 w-2 rounded-full bg-green-500" />Connected — gareth@heatglow.co.uk
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setCalendarConnected(false)}>Disconnect</Button>
                  </div>
                ) : (
                  <Button onClick={() => setCalendarConnected(true)} className="gap-1.5">
                    <Globe className="h-3.5 w-3.5" />Connect Google Calendar
                  </Button>
                )}
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Max jobs/day</Label>
                <Input type="number" value={maxJobsPerDay} onChange={(e) => setMaxJobsPerDay(Number(e.target.value))} min={1} max={20} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slot duration (mins)</Label>
                <Input type="number" value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))} step={15} min={30} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lead time (days)</Label>
                <Input type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(Number(e.target.value))} min={0} max={14} className="text-sm" />
                <p className="text-[10px] text-muted-foreground">Min days before a slot can be booked</p>
              </div>
            </div>
            <Button size="sm" disabled={savingSection === 'calendar'} onClick={() => saveSection('calendar', { calendar_provider: calendarProvider, max_jobs_per_day: maxJobsPerDay, slot_duration_mins: slotDuration, lead_time_days: leadTimeDays })}>
              {savingSection === 'calendar' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Calendar Settings
            </Button>
          </SettingSection>

          {/* Working hours */}
          <SettingSection title="Working Hours" description="Set available hours per day for slot availability." icon={<Clock className="h-4 w-4 text-primary" />}>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <Switch checked={hours[day].enabled} onCheckedChange={(v) => updateHours(day, { enabled: v })} />
                  <span className={cn("text-sm w-24 flex-shrink-0", !hours[day].enabled && "text-muted-foreground")}>{day}</span>
                  {hours[day].enabled ? (
                    <>
                      <Input type="time" value={hours[day].start} onChange={(e) => updateHours(day, { start: e.target.value })} className="w-28 text-sm" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input type="time" value={hours[day].end} onChange={(e) => updateHours(day, { end: e.target.value })} className="w-28 text-sm" />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Closed</span>
                  )}
                </div>
              ))}
            </div>
            <Button size="sm" disabled={savingSection === 'hours'} onClick={() => saveSection('hours', { working_hours: hours })}>
              {savingSection === 'hours' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Hours
            </Button>
          </SettingSection>

          {/* Holiday calendar */}
          <SettingSection title="Holiday & Closure Dates" description="Block out dates when no bookings should be accepted." icon={<CalendarDays className="h-4 w-4 text-primary" />}>
            <div className="space-y-2 mb-3">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                  <button onClick={() => setHolidays((p) => p.filter((x) => x.id !== h.id))} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Holiday name" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} className="flex-1 min-w-32 text-sm" />
              <Input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} className="w-40 text-sm" />
              <Button variant="outline" size="sm" onClick={() => { if (newHolidayName && newHolidayDate) { setHolidays((p) => [...p, { id: `h${Date.now()}`, name: newHolidayName, date: newHolidayDate }]); setNewHolidayName(""); setNewHolidayDate(""); }}}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add
              </Button>
            </div>
            <Button size="sm" disabled={savingSection === 'holidays'} onClick={() => saveSection('holidays', { holidays })}>
              {savingSection === 'holidays' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Holidays
            </Button>
          </SettingSection>
        </TabsContent>

        {/* ═══ AI & QUALIFICATION ═══ */}
        <TabsContent value="ai" className="space-y-5 mt-4">
          <SettingSection title="Auto-Qualify / Auto-Reject by Branch" description="Enable automatic qualification or rejection per job type." icon={<ToggleLeft className="h-4 w-4 text-primary" />}>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Branch</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Auto-Qualify</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Auto-Reject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { label: "Boiler Service", aq: autoQService, setAq: setAutoQService, ar: autoRService, setAr: setAutoRService },
                    { label: "Boiler Repair",  aq: autoQRepair,  setAq: setAutoQRepair,  ar: autoRRepair,  setAr: setAutoRRepair  },
                    { label: "Boiler Install", aq: autoQInstall, setAq: setAutoQInstall, ar: autoRInstall, setAr: setAutoRInstall  },
                  ].map(({ label, aq, setAq, ar, setAr }) => (
                    <tr key={label}>
                      <td className="px-4 py-3 font-medium">{label}</td>
                      <td className="px-4 py-3"><Switch checked={aq} onCheckedChange={setAq} /></td>
                      <td className="px-4 py-3"><Switch checked={ar} onCheckedChange={setAr} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" disabled={savingSection === 'branch-toggles'} onClick={() => saveSection('branch-toggles', { auto_q_service: autoQService, auto_q_repair: autoQRepair, auto_q_install: autoQInstall, auto_r_service: autoRService, auto_r_repair: autoRRepair, auto_r_install: autoRInstall })}>
              {savingSection === 'branch-toggles' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Toggles
            </Button>
          </SettingSection>

          <SettingSection title="AI Scoring Thresholds" description="Set the score range for auto-qualify and auto-reject per branch (0–100)." icon={<Sliders className="h-4 w-4 text-primary" />}>
            {[
              { branch: "Boiler Service", qVal: aiServiceQualify, setQ: setAiServiceQualify, rVal: aiServiceReject, setR: setAiServiceReject },
              { branch: "Boiler Repair",  qVal: aiRepairQualify,  setQ: setAiRepairQualify,  rVal: aiRepairReject,  setR: setAiRepairReject  },
              { branch: "Boiler Install", qVal: aiInstallQualify, setQ: setAiInstallQualify, rVal: aiInstallReject, setR: setAiInstallReject  },
            ].map(({ branch, qVal, setQ, rVal, setR }) => (
              <div key={branch} className="pb-4 border-b border-border last:border-0 last:pb-0">
                <p className="text-sm font-semibold mb-3">{branch}</p>
                <div className="space-y-3 pl-2">
                  <ThresholdRow label="Auto-qualify above" value={qVal} onChange={setQ} description="Enquiries scoring above this are automatically qualified" />
                  <ThresholdRow label="Auto-reject below" value={rVal} onChange={setR} description="Enquiries scoring below this are automatically rejected" />
                </div>
              </div>
            ))}
            <Button size="sm" disabled={savingSection === 'ai-thresholds'} onClick={() => saveSection('ai-thresholds', { ai_service_qualify: aiServiceQualify, ai_service_reject: aiServiceReject, ai_repair_qualify: aiRepairQualify, ai_repair_reject: aiRepairReject, ai_install_qualify: aiInstallQualify, ai_install_reject: aiInstallReject })}>
              {savingSection === 'ai-thresholds' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Thresholds
            </Button>
          </SettingSection>

          <SettingSection title="Install Budget Threshold" description="Enquiries below this amount are flagged as low-value by the AI scoring engine." icon={<DollarSign className="h-4 w-4 text-primary" />}>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Minimum acceptable budget:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">£</span>
                <Input type="number" value={budgetThreshold} onChange={(e) => setBudgetThreshold(Number(e.target.value))} className="w-28 text-sm" min={0} step={100} />
              </div>
              <Badge variant="outline" className="text-xs">Default: £2,000</Badge>
            </div>
            <Button size="sm" disabled={savingSection === 'budget'} onClick={() => saveSection('budget', { install_budget_threshold: budgetThreshold })}>
              {savingSection === 'budget' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Threshold
            </Button>
          </SettingSection>

          <SettingSection title="Qualifying Questions" description="Questions asked per job type in the enquiry form. Drag to reorder." icon={<HelpCircle className="h-4 w-4 text-primary" />}>
            <Tabs defaultValue="service">
              <TabsList className="mb-4">
                <TabsTrigger value="service">Boiler Service</TabsTrigger>
                <TabsTrigger value="repair">Boiler Repair</TabsTrigger>
                <TabsTrigger value="install">Boiler Install</TabsTrigger>
              </TabsList>
              <TabsContent value="service"><QuestionEditor questions={serviceQ} onChange={setServiceQ} /></TabsContent>
              <TabsContent value="repair"><QuestionEditor questions={repairQ}   onChange={setRepairQ}  /></TabsContent>
              <TabsContent value="install"><QuestionEditor questions={installQ} onChange={setInstallQ} /></TabsContent>
            </Tabs>
            <Button size="sm" disabled={savingSection === 'questions'} onClick={() => saveSection('questions', { qualifying_questions_service: serviceQ, qualifying_questions_repair: repairQ, qualifying_questions_install: installQ })}>
              {savingSection === 'questions' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Questions
            </Button>
          </SettingSection>
        </TabsContent>

        {/* ═══ AUTOMATION ═══ */}
        <TabsContent value="automation" className="space-y-5 mt-4">
          <SettingSection title="Automation Rules" description="Control automatic qualification, rejection, and alerting thresholds.">
            <AutomationRow label="Auto-qualify high-scoring enquiries" description="Automatically qualify and push to SM8 when AI score meets threshold" value={autoQualify} onChange={(v) => setAutoQualify(v as boolean)} type="switch" />
            <AutomationRow label="Auto-qualify threshold" description="AI score required to trigger automatic qualification" value={autoQThreshold} onChange={(v) => setAutoQThreshold(v as number)} unit="/ 100" type="number" />
            <AutomationRow label="Auto-reject low-scoring enquiries" description="Automatically reject and send decline email below threshold" value={autoReject} onChange={(v) => setAutoReject(v as boolean)} type="switch" />
            <AutomationRow label="Auto-reject threshold" description="AI score below which rejection is triggered automatically" value={autoRThreshold} onChange={(v) => setAutoRThreshold(v as number)} unit="/ 100" type="number" />
            <AutomationRow label="Cold quote follow-up after" description="Alert and draft email when a sent quote has no response" value={quoteLapseDays} onChange={(v) => setQuoteLapseDays(v as number)} unit="days" type="number" />
            <AutomationRow label="Overdue invoice alert after" description="Flag invoice as overdue after this many days" value={invoiceAlertDays} onChange={(v) => setInvoiceAlertDays(v as number)} unit="days" type="number" />
            <AutomationRow label="HeatShield reminder draft after" description="Auto-draft reminder when service is due in this many days" value={reminderDays} onChange={(v) => setReminderDays(v as number)} unit="days" type="number" />
            <AutomationRow label="Stale enquiry alert after" description="Highlight enquiries still New after this many hours" value={staleEnquiryHours} onChange={(v) => setStaleEnquiryHours(v as number)} unit="hours" type="number" />
            <AutomationRow label="Auto-expire rejected enquiries after" description="Move rejected enquiries to archive after this many days" value={autoExpireDays} onChange={(v) => setAutoExpireDays(v as number)} unit="days" type="number" />
            <AutomationRow label="Cold quote alerts" description="Dashboard alert and campaign draft for cold quotes" value={coldQuoteAlert} onChange={(v) => setColdQuoteAlert(v as boolean)} type="switch" />
            <AutomationRow label="Overdue invoice alerts" description="Dashboard alert for overdue invoices" value={overdueAlert} onChange={(v) => setOverdueAlert(v as boolean)} type="switch" />
            <AutomationRow label="HeatShield service reminders" description="Auto-draft reminder emails for due services" value={hsReminders} onChange={(v) => setHsReminders(v as boolean)} type="switch" />
            <Button size="sm" disabled={savingSection === 'automation'} onClick={() => saveSection('automation', {
              auto_qualify_enabled: autoQualify, auto_reject_enabled: autoReject,
              auto_qualify_threshold: autoQThreshold, auto_reject_threshold: autoRThreshold,
              quote_lapse_days: quoteLapseDays, overdue_invoice_days: invoiceAlertDays,
              heatshield_reminder_days: reminderDays, stale_enquiry_alert_hours: staleEnquiryHours,
              auto_expire_days: autoExpireDays, cold_quote_alerts: coldQuoteAlert,
              overdue_alerts: overdueAlert, hs_reminders: hsReminders,
            })}>
              {savingSection === 'automation' ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Saving…</> : 'Save Automation Rules'}
            </Button>
          </SettingSection>
        </TabsContent>

        {/* ═══ TEAM & GDPR ═══ */}
        <TabsContent value="team" className="space-y-5 mt-4">
          <SettingSection title="User Management" description="Manage who has access to the HeatGlow CRM.">
            <div className="space-y-2">
              {[
                { name: "Gareth Jones",   email: "gareth@heatglow.co.uk",  role: "Owner" },
                { name: "Rebecca",        email: "rebecca@heatglow.co.uk", role: "Admin" },
                { name: "Natalie Hughes", email: "natalie@heatglow.co.uk", role: "Admin" },
              ].map((user) => (
                <div key={user.email} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === "Owner" ? "default" : "secondary"}>{user.role}</Badge>
                    {user.role !== "Owner" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add User</Button>
          </SettingSection>

          <SettingSection title="Email Suppression List" description="Emails on this list will not receive any automated messages.">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Manage addresses that have unsubscribed from emails.</span>
              <Button variant="outline" size="sm" onClick={() => { window.location.href = "/campaigns/suppression"; }}>View List</Button>
            </div>
          </SettingSection>

          <SettingSection title="GDPR & Data" description="Comply with UK GDPR requirements for personal data.">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Right to Erasure — Search customer data</Label>
                <div className="flex gap-2">
                  <Input placeholder="Search by name or email…" className="flex-1" />
                  <Button variant="outline" size="sm">Search</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Customer data is retained for 7 years in line with HMRC requirements. Enquiry data is retained for 2 years.</p>
            </div>
          </SettingSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
