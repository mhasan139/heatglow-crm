"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, AlertTriangle, Shield, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

const CANCEL_REASONS = [
  "Customer request — no longer needed",
  "Customer moving away",
  "Financial reasons",
  "Unhappy with service",
  "Switching provider",
  "Property sold",
  "Other",
];

export default function EditHeatShieldPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["heatshield-member", id],
    queryFn: async () => {
      const res = await fetch(`/api/heatshield/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const member = data?.member;
  const clientName = member?.customer_name || "Member";
  const postcode = member?.client_postcode || member?.clients?.postcode || "";

  const [initialised, setInitialised] = useState(false);
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (member && !initialised) {
    setLastServiceDate(member.last_service_date?.slice(0, 10) ?? "");
    setInitialised(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);
      if (!lastServiceDate) {
        setDateError("Last service date is required.");
        throw new Error("validation");
      }
      const res = await fetch(`/api/heatshield/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_service_date: lastServiceDate }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["heatshield-member", id] });
      qc.invalidateQueries({ queryKey: ["heatshield"] });
      router.push("/heatshield");
    },
    onError: (err: Error) => {
      if (err.message !== "validation") setSubmitError(err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelReason) throw new Error("Reason required");
      const res = await fetch(`/api/heatshield/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellation_reason: cancelReason }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to cancel");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["heatshield"] });
      router.push("/heatshield");
    },
    onError: (err: Error) => setSubmitError(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-sm text-muted-foreground">
        Member not found.{" "}
        <Link href="/heatshield" className="text-primary hover:underline">Back to HeatShield</Link>
      </div>
    );
  }

  const isCancelled = member.status === "Cancelled";
  const signUpDate = member.sign_up_date?.slice(0, 10) ?? member.created_at?.slice(0, 10) ?? "";
  const monthlyAmount = member.monthly_amount_pence
    ? formatCurrency(member.monthly_amount_pence / 100)
    : member.monthly_amount
    ? formatCurrency(parseFloat(member.monthly_amount))
    : "£10.00";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/heatshield" className="hover:text-foreground">HeatShield</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Edit — {clientName}</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold">Edit HeatShield Member</h1>
        <p className="text-sm text-muted-foreground">
          {clientName}{postcode ? ` · ${postcode}` : ""}
        </p>
      </div>

      {isCancelled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          This membership is cancelled and cannot be edited.
        </div>
      )}

      <div className="space-y-6">
        {/* Sign-up Date + Last Service Date — two columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* Sign-up Date (read-only) */}
          <div className="space-y-1.5">
            <Label className="font-semibold">Sign-up Date</Label>
            <Input
              type="date"
              value={signUpDate}
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          {/* Last Physical Service Date (editable) */}
          <div className="space-y-1.5">
            <Label className="font-semibold">
              Last Physical Service Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={lastServiceDate}
              onChange={(e) => { setLastServiceDate(e.target.value); setDateError(""); }}
              max={new Date().toISOString().split("T")[0]}
              className={dateError ? "border-red-400" : ""}
              disabled={isCancelled}
            />
            {dateError ? (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{dateError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Date of the last physical boiler service carried out.
              </p>
            )}
          </div>
        </div>

        {/* Monthly Amount (read-only) */}
        <div className="space-y-1.5 w-40">
          <Label className="font-semibold">Monthly Amount</Label>
          <Input
            value={monthlyAmount}
            disabled
            className="bg-muted/50 cursor-not-allowed"
          />
        </div>

        {/* Cancel membership section */}
        {!isCancelled && (
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(!showCancelConfirm)}
              className="text-sm text-red-500 dark:text-red-400 font-medium hover:underline"
            >
              Cancel this membership
            </button>
            {showCancelConfirm && (
              <div className="space-y-3 pt-2 border-t border-red-100 dark:border-red-900">
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for cancellation…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {cancelReason && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>Important:</strong> This marks the membership as cancelled in the CRM.
                      You must also cancel the GoCardless direct debit separately.
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!cancelReason || cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Confirm Cancellation"}
                </Button>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> {submitError}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          {!isCancelled && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              ) : (
                <><Shield className="h-4 w-4" />Save Changes</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
