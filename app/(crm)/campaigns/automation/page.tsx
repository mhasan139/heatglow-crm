"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface AutomationDef {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: 1 | 2;
  settingKey: string | null;
  schedule: string;
}

const AUTOMATIONS: AutomationDef[] = [
  {
    id: "heatshield-60",
    name: "HeatShield 60-day Reminder",
    description: "Sends directly to members whose annual service is 60 days away (305 days since last service).",
    category: "HeatShield",
    tier: 1,
    settingKey: "auto_heatshield_reminder_enabled",
    schedule: "Daily at 9am UTC",
  },
  {
    id: "heatshield-30",
    name: "HeatShield 30-day Reminder",
    description: "Sends directly to members whose annual service is 30 days away (335 days since last service).",
    category: "HeatShield",
    tier: 1,
    settingKey: "auto_heatshield_reminder_enabled",
    schedule: "Daily at 9am UTC",
  },
  {
    id: "heatshield-dayof",
    name: "HeatShield Day-of Reminder",
    description: "Sends directly to members on the day their annual service is due.",
    category: "HeatShield",
    tier: 1,
    settingKey: "auto_heatshield_reminder_enabled",
    schedule: "Daily at 9am UTC",
  },
  {
    id: "win-back",
    name: "Win-Back Campaign",
    description: "Creates a draft for customers with no job in the last 18 months. Requires approval before sending.",
    category: "Reactivation",
    tier: 2,
    settingKey: "auto_winback_enabled",
    schedule: "Daily at 9am UTC",
  },
  {
    id: "service-reminder",
    name: "Annual Service Reminder",
    description: "Creates a draft for non-HeatShield customers with last job 11–13 months ago (boiler service due).",
    category: "Service",
    tier: 2,
    settingKey: "auto_service_reminder_enabled",
    schedule: "Daily at 9am UTC",
  },
  {
    id: "quote-lapse",
    name: "Lapsed Quote Follow-up",
    description: "Creates a draft for customers with a quote that lapsed without response.",
    category: "Quotes",
    tier: 2,
    settingKey: "auto_quote_followup_enabled",
    schedule: "Daily at 9am UTC",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  HeatShield: "border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400",
  Quotes: "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400",
  Reactivation: "border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400",
  Service: "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400",
};

async function fetchSettings(): Promise<Record<string, string | number | boolean>> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export default function AutomationRulesPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
  });

  const [localToggles, setLocalToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!settings) return;
    const defaults: Record<string, boolean> = {
      auto_heatshield_reminder_enabled: true,
      auto_winback_enabled: true,
      auto_service_reminder_enabled: true,
      auto_quote_followup_enabled: true,
    };
    const merged: Record<string, boolean> = {};
    for (const key of Object.keys(defaults)) {
      merged[key] = key in settings ? Boolean(settings[key]) : defaults[key];
    }
    setLocalToggles(merged);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  function toggleAutomation(key: string) {
    const newValue = !localToggles[key];
    setLocalToggles((prev) => ({ ...prev, [key]: newValue }));
    saveMutation.mutate({ [key]: newValue });
  }

  const activeCount = AUTOMATIONS.filter((a) => a.settingKey && localToggles[a.settingKey] !== false).length;
  const pausedCount = AUTOMATIONS.length - activeCount;

  return (
    <div className="p-6 max-w-4xl" data-testid="page-automation-rules">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Campaign Manager
      </Link>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Automation Rules</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            These rules automatically create campaign drafts in your queue. <strong>Nothing sends without your approval.</strong>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["settings"] })} disabled={isLoading}>
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6 mt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {activeCount} active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />
          {pausedCount} paused
        </span>
      </div>

      {isError && (
        <div className="flex items-center gap-2 mb-4 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          Failed to load settings. Showing defaults.
        </div>
      )}

      {/* Tier 1 */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tier 1 — Send directly (no approval needed)</h2>
      <div className="space-y-3 mb-6">
        {AUTOMATIONS.filter((a) => a.tier === 1).map((automation) => {
          const key = automation.settingKey!;
          const uniqueKey = `${automation.id}-${key}`;
          const isActive = localToggles[key] !== false;
          return (
            <div
              key={automation.id}
              data-testid={`rule-card-${automation.id}`}
              className={cn("bg-card border rounded-xl p-5 transition-opacity", !isActive && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <h3 className="text-sm font-semibold">{automation.name}</h3>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", CATEGORY_COLORS[automation.category])}>
                      {automation.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-green-300 text-green-600 dark:border-green-700 dark:text-green-400 font-medium">
                      Auto-send
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6 mb-2">{automation.description}</p>
                  <p className="text-xs text-muted-foreground ml-6">Schedule: {automation.schedule}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Paused"}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleAutomation(key)}
                    disabled={saveMutation.isPending}
                    data-testid={`toggle-rule-${uniqueKey}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tier 2 */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tier 2 — Creates drafts for approval</h2>
      <div className="space-y-3">
        {AUTOMATIONS.filter((a) => a.tier === 2).map((automation) => {
          const key = automation.settingKey!;
          const isActive = localToggles[key] !== false;
          return (
            <div
              key={automation.id}
              data-testid={`rule-card-${automation.id}`}
              className={cn("bg-card border rounded-xl p-5 transition-opacity", !isActive && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={cn("h-4 w-4 shrink-0", isActive ? "text-amber-500" : "text-muted-foreground")} />
                    <h3 className="text-sm font-semibold">{automation.name}</h3>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", CATEGORY_COLORS[automation.category])}>
                      {automation.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 font-medium">
                      Needs approval
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6 mb-2">{automation.description}</p>
                  <p className="text-xs text-muted-foreground ml-6">Schedule: {automation.schedule}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Paused"}</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleAutomation(key)}
                    disabled={saveMutation.isPending}
                    data-testid={`toggle-rule-${automation.id}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How automations work</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Tier 1 automations send directly to customers without creating a queue draft.</li>
          <li>Tier 2 automations create a draft in the <Link href="/campaigns/queue" className="text-primary hover:underline">Campaign Queue</Link> for you to review and approve.</li>
          <li>Automations run once daily. Duplicate prevention ensures the same email is not sent twice.</li>
        </ul>
      </div>
    </div>
  );
}
