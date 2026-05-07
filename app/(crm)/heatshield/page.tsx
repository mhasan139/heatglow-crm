"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Shield, Plus, Download, Upload, Bell, Pencil,
  AlertTriangle, CheckCircle, XCircle, Loader2, X, UploadCloud,
} from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { HeatShieldMember, HeatShieldStatus } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";

type StatusFilter = HeatShieldStatus | "service_due" | "All";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Service Due", value: "service_due" },
  { label: "Lapsed", value: "Lapsed" },
  { label: "Cancelled", value: "Cancelled" },
];

// Preview columns shown in the import modal
const PREVIEW_COLS = ["Name", "Email", "Phone", "Postcode", "Sign-up Date"] as const;

function daysElapsed(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return formatDate(d.toISOString().split("T")[0]);
}

interface HeatShieldListResponse {
  data: (HeatShieldMember & {
    clients: { name: string; email: string | null; phone: string | null; postcode: string | null } | null;
  })[];
  total: number;
  page: number;
  limit: number;
  stats: {
    total: number;
    active: number;
    service_due: number;
    lapsed: number;
    cancelled: number;
    monthly_revenue_pence: number;
  };
}

interface ImportResult {
  row: number;
  identifier: string;
  status: "success" | "not_found" | "already_member" | "error";
  name?: string;
  error?: string;
}

// Parsed row from the CSV keyed by normalised header
type CsvRow = Record<string, string>;

async function fetchHeatShield(params: {
  status: string;
  search: string;
  page: number;
}): Promise<HeatShieldListResponse> {
  const sp = new URLSearchParams({ page: String(params.page), limit: "50" });
  if (params.status !== "All") sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  const res = await fetch(`/api/heatshield?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch HeatShield members");
  return res.json();
}

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(normaliseHeader);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    const obj: CsvRow = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").trim().replace(/^"|"$/g, ""); });
    return obj;
  });
}

// Map a normalised CSV row to what the import API expects
function toApiRow(r: CsvRow) {
  return {
    phone: r.phone ?? r.mobile ?? "",
    email: r.email ?? "",
    last_service_date:
      r.sign_up_date ?? r.signup_date ?? r.last_service_date ?? r.last_service ?? r.service_date ?? "",
    monthly_amount: r.monthly_amount ?? r.amount ?? "10",
  };
}

// Map normalised key back to a preview column value
function previewValue(row: CsvRow, col: typeof PREVIEW_COLS[number]): string {
  switch (col) {
    case "Name":       return row.name ?? "";
    case "Email":      return row.email ?? "";
    case "Phone":      return row.phone ?? row.mobile ?? "";
    case "Postcode":   return row.postcode ?? "";
    case "Sign-up Date": return row.sign_up_date ?? row.signup_date ?? row.last_service_date ?? "";
  }
}

export default function HeatShieldPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const urlStatus = searchParams.get("status") as StatusFilter | null;
  const validFilters: StatusFilter[] = ["All", "Active", "service_due", "Lapsed", "Cancelled"];
  const initialFilter: StatusFilter = urlStatus && validFilters.includes(urlStatus) ? urlStatus : "All";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);

  useEffect(() => {
    const s = searchParams.get("status") as StatusFilter | null;
    setStatusFilter(s && validFilters.includes(s) ? s : "All");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  function handleSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["heatshield", statusFilter, debouncedSearch, page],
    queryFn: () => fetchHeatShield({ status: statusFilter, search: debouncedSearch, page }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const markServiced = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(`/api/heatshield/${memberId}/mark-serviced`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["heatshield"] }),
  });

  // ── CSV handling ──────────────────────────────────────────────────────────

  function openImportModal() {
    setCsvRows([]);
    setCsvFileName("");
    setParseError("");
    setImportResults(null);
    setShowImportModal(true);
  }

  function closeImportModal() {
    setShowImportModal(false);
    setImporting(false);
  }

  function loadFile(file: File) {
    setParseError("");
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please select a CSV file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError("File exceeds 5 MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target?.result as string ?? "");
      if (rows.length === 0) {
        setParseError("CSV is empty or has no data rows.");
        return;
      }
      setCsvRows(rows);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  async function runImport() {
    setImporting(true);
    setParseError("");
    try {
      const payload = csvRows.map(toApiRow).filter((r) => r.phone || r.email);
      if (payload.length === 0) {
        setParseError('CSV must have a "phone" or "email" column.');
        setImporting(false);
        return;
      }
      const res = await fetch("/api/heatshield/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setImportResults(json.results ?? []);
      queryClient.invalidateQueries({ queryKey: ["heatshield"] });
    } catch {
      setParseError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const members = data?.data ?? [];
  const stats = data?.stats;
  const hasDue = (stats?.service_due ?? 0) > 0;
  const previewRows = csvRows.slice(0, 3);
  const importSuccessCount = importResults?.filter((r) => r.status === "success").length ?? 0;

  const filterCounts: Record<StatusFilter, number | undefined> = {
    All: stats?.total,
    Active: stats?.active,
    service_due: stats?.service_due,
    Lapsed: stats?.lapsed,
    Cancelled: stats?.cancelled,
  };

  return (
    <div className="space-y-5" data-testid="page-heatshield">
      {/* Hidden file input (fallback click) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }}
      />

      {/* ── Import Modal ───────────────────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-lg font-bold">Import HeatShield Members — CSV</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Upload a CSV with columns: Name, Email, Phone, Postcode, Sign-up Date
                </p>
              </div>
              <button onClick={closeImportModal} className="text-muted-foreground hover:text-foreground mt-0.5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-5 overflow-y-auto flex-1">
              {/* Results view (after import) */}
              {importResults ? (
                <>
                  <p className="text-sm font-medium">
                    {importSuccessCount} of {importResults.length} rows imported successfully.
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {importResults.map((r) => (
                          <tr key={r.row} className="px-4 py-2">
                            <td className="px-4 py-2.5 w-6">
                              {r.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {r.status === "not_found" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                              {r.status === "already_member" && <CheckCircle className="h-4 w-4 text-blue-400" />}
                              {r.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                            </td>
                            <td className="px-4 py-2.5 font-medium">{r.name ?? r.identifier}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {r.status === "success" && "Added as HeatShield member"}
                              {r.status === "not_found" && "No matching client found"}
                              {r.status === "already_member" && "Already a member"}
                              {r.status === "error" && (r.error ?? "Import failed")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={closeImportModal}>
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Drop zone */}
                  <div
                    ref={dropRef}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-14 cursor-pointer transition-colors select-none",
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-muted/20"
                    )}
                  >
                    <UploadCloud className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                    <div className="text-center">
                      <p className="font-semibold text-base">Click to upload or drag &amp; drop</p>
                      <p className="text-sm text-muted-foreground mt-1">CSV files only · Max 5 MB</p>
                    </div>
                    {csvFileName && (
                      <p className="text-xs text-primary font-medium">{csvFileName}</p>
                    )}
                  </div>

                  {parseError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />{parseError}
                    </p>
                  )}

                  {/* Preview table */}
                  {csvRows.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Preview (First 3 Rows)
                      </p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              {PREVIEW_COLS.map((col) => (
                                <th key={col} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {previewRows.map((row, i) => (
                              <tr key={i}>
                                {PREVIEW_COLS.map((col) => (
                                  <td key={col} className={cn(
                                    "px-4 py-3 whitespace-nowrap",
                                    col === "Name" && "font-semibold"
                                  )}>
                                    {previewValue(row, col) || <span className="text-muted-foreground">—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {csvRows.length} {csvRows.length === 1 ? "row" : "rows"} detected — ready to import
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1 h-12 text-base" onClick={closeImportModal}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      disabled={csvRows.length === 0 || importing}
                      onClick={runImport}
                    >
                      {importing ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing…</>
                      ) : (
                        `Import ${csvRows.length > 0 ? csvRows.length : ""} Member${csvRows.length !== 1 ? "s" : ""}`
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">HeatShield Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Annual boiler service membership — £10/month per member
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openImportModal}
          >
            <Upload className="h-4 w-4" />
            CSV Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => { window.location.href = "/api/heatshield/export"; }}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/heatshield/new">
            <Button
              size="sm"
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-add-member"
            >
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Members", value: stats?.active ?? "—" },
          { label: "Service Due", value: stats?.service_due ?? "—" },
          { label: "Lapsed", value: stats?.lapsed ?? "—" },
          { label: "Monthly Revenue", value: stats ? formatCurrency((stats.monthly_revenue_pence ?? 0) / 100) : "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Service due alert ──────────────────────────────────────────────── */}
      {hasDue && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <Bell className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{stats?.service_due} member{(stats?.service_due ?? 0) > 1 ? "s" : ""}</strong>{" "}
            {(stats?.service_due ?? 0) > 1 ? "have" : "has"} a service due.
          </p>
          <Link href="/custom-campaigns" className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 text-xs shrink-0"
            >
              View Campaigns
            </Button>
          </Link>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count = filterCounts[value];
          const isActive = statusFilter === value;
          return (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
                isActive
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-foreground border-border hover:border-foreground/50"
              )}
            >
              {label}
              {count !== undefined && (
                <span className={cn(
                  "inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[1.25rem] h-5 px-1.5",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="relative ml-auto min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">Failed to load members.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : isLoading && members.length === 0 ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No members found"
            description="Try adjusting your filters or add a new member."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Member</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Monthly</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Sign-up</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Renewal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Days</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const days = member.last_service_date ? daysElapsed(member.last_service_date) : 0;
                const displayStatus =
                  member.status === "Active" &&
                  (statusFilter === "All" || statusFilter === "service_due") &&
                  member.service_due_flag
                    ? "Service Due"
                    : member.status;
                return (
                  <tr
                    key={member.id}
                    data-testid={`row-heatshield-${member.id}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/heatshield/${member.id}`} className="font-medium hover:text-primary">
                        {member.customer_name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {member.clients?.postcode ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{member.clients?.phone ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {member.clients?.email ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {member.monthly_amount_pence
                        ? formatCurrency(member.monthly_amount_pence / 100)
                        : "—"}/mo
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {member.sign_up_date ? formatDate(member.sign_up_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {member.sign_up_date ? addOneYear(member.sign_up_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {member.last_service_date ? formatDate(member.last_service_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          displayStatus === "Active" ? "success"
                          : displayStatus === "Service Due" ? "warning"
                          : displayStatus === "Lapsed" ? "destructive"
                          : "outline"
                        }
                      >
                        {displayStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-sm font-semibold",
                        days >= 365 ? "text-red-600" : days >= 305 ? "text-amber-600" : "text-green-600"
                      )}>
                        {days}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => markServiced.mutate(member.id)}
                          disabled={markServiced.isPending}
                          title="Mark serviced today"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        <Link href={`/customers/${member.client_id}`}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="View customer">
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/heatshield/${member.id}/edit`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            data-testid={`button-edit-${member.id}`}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {data && data.total > 50 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
