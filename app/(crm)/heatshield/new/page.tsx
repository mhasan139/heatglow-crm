"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface ClientResult {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  postcode: string | null;
  is_heatshield: boolean;
}

export default function AddHeatShieldPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClientResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [signUpDate, setSignUpDate] = useState(new Date().toISOString().split("T")[0]);
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(val: string) {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients/search?q=${encodeURIComponent(val)}&limit=5`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data ?? []);
        }
      } catch {
        // silent fail
      }
    }, 300);
  }

  function validateDates(): boolean {
    if (!lastServiceDate) { setDateError("Last service date is required."); return false; }
    const last = new Date(lastServiceDate);
    const today = new Date();
    const signup = new Date(signUpDate);
    if (last > today) { setDateError("Last service date cannot be in the future."); return false; }
    if (last > signup) { setDateError("Last service date should not be after sign-up date."); return false; }
    setDateError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    if (!validateDates()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/heatshield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient.id,
          sign_up_date: signUpDate,
          last_service_date: lastServiceDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add member");
      router.push("/heatshield");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/heatshield" className="hover:text-foreground">HeatShield</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Add Member</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold">Add HeatShield Member</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search for an existing SM8 client to enrol.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer search */}
        <div className="space-y-3">
          <Label>Search existing clients</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, phone or email…"
              className="pl-9"
              data-testid="input-search-client"
            />
          </div>

          {searchResults.length > 0 && !selectedClient && (
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedClient(c); setSearchQuery(c.name); setSearchResults([]); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone ?? "No phone"} · {c.postcode ?? "No postcode"}</p>
                  </div>
                  {c.is_heatshield && (
                    <Shield className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedClient && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
              <CardContent className="pt-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{selectedClient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedClient.phone ?? "No phone"} · {selectedClient.postcode ?? "No postcode"}
                  </p>
                  {selectedClient.is_heatshield && (
                    <p className="text-xs text-amber-600 mt-0.5">Already a HeatShield member</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setSearchQuery(""); }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Sign-up Date</Label>
            <Input
              type="date"
              value={signUpDate}
              onChange={(e) => setSignUpDate(e.target.value)}
              data-testid="input-signup-date"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Last Physical Service Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={lastServiceDate}
              onChange={(e) => setLastServiceDate(e.target.value)}
              className={dateError ? "border-red-400" : ""}
              data-testid="input-last-service-date"
              max={new Date().toISOString().split("T")[0]}
              required
            />
            {dateError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{dateError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Date of the last physical boiler service carried out by HeatGlow.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Monthly Amount</Label>
          <div className="flex items-center gap-3">
            <Input value="£10.00" readOnly className="w-24 bg-muted text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Standard HeatShield rate — via GoCardless direct debit</p>
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> {submitError}
          </p>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Link href="/heatshield">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={!selectedClient || submitting}
            data-testid="button-add-member-submit"
          >
            <Shield className="h-4 w-4" />
            {submitting ? "Enrolling…" : "Enrol Member"}
          </Button>
        </div>
      </form>
    </div>
  );
}
