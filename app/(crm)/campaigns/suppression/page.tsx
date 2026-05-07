"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Search, Plus, Trash2, ShieldOff, AlertCircle, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SuppressionEntry } from "@/types/index";

interface SuppressionResponse {
  data: SuppressionEntry[];
  total: number;
}

export default function SuppressionListPage() {
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<SuppressionResponse>({
    queryKey: ["suppression", search],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (search) sp.set("search", search);
      const res = await fetch(`/api/suppression?${sp}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add");
    },
    onSuccess: () => {
      setNewEmail("");
      setAddError("");
      qc.invalidateQueries({ queryKey: ["suppression"] });
    },
    onError: (err) => setAddError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/suppression?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      setRemoveConfirm(null);
      qc.invalidateQueries({ queryKey: ["suppression"] });
    },
  });

  function handleAdd() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setAddError("Please enter a valid email address.");
      return;
    }
    addMutation.mutate(trimmed);
  }

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6 max-w-4xl" data-testid="page-suppression-list">
      {/* Remove confirm */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold mb-2">Remove from suppression list?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This address will be eligible for future campaigns again.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRemoveConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => removeMutation.mutate(removeConfirm)}
                disabled={removeMutation.isPending}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Campaign Manager
      </Link>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Suppression List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            These email addresses have unsubscribed and will not receive any campaign emails.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 mt-2">
        <ShieldOff className="h-3.5 w-3.5" />
        <span>{total} email addresses suppressed</span>
      </div>

      {/* Add manually */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6" data-testid="add-email-panel">
        <p className="text-sm font-medium mb-3">Add email manually</p>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setAddError(""); }}
              placeholder="email@example.com"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              data-testid="input-new-email"
            />
            {addError && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {addError}
              </p>
            )}
          </div>
          <Button size="sm" onClick={handleAdd} disabled={addMutation.isPending} data-testid="btn-add-email">
            <Plus className="h-3.5 w-3.5 mr-1" /> {addMutation.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="pl-8 h-8 text-xs w-64"
              data-testid="input-search"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldOff className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No results match your search." : "No suppressed emails yet."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email address</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date added</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`suppression-row-${entry.id}`}>
                  <td className="px-4 py-3 font-mono text-xs">{entry.email}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(entry.added_at)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={entry.reason === "manual" ? "border-purple-300 text-purple-600 text-[10px]" : "border-amber-300 text-amber-600 text-[10px]"}
                    >
                      {entry.reason ?? "unsubscribe"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setRemoveConfirm(entry.email)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`btn-remove-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
