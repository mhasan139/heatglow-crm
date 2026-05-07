"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SegmentFilter } from "@/types/index";

// Fields that map directly to the clients table
type FieldConfig = {
  label: string;
  dbField: string;
  type: "date" | "number" | "text" | "boolean";
  operators: { label: string; op: SegmentFilter["operator"] }[];
  valuePlaceholder?: string;
  boolOptions?: { label: string; value: string }[];
};

const FIELD_CONFIGS: FieldConfig[] = [
  {
    label: "Last job date",
    dbField: "last_job_date",
    type: "date",
    operators: [
      { label: "before", op: "lt" },
      { label: "after", op: "gt" },
    ],
  },
  {
    label: "Postcode area",
    dbField: "postcode",
    type: "text",
    operators: [{ label: "contains", op: "contains" }],
    valuePlaceholder: "e.g. CF14",
  },
  {
    label: "Is HeatShield member",
    dbField: "is_heatshield",
    type: "boolean",
    operators: [{ label: "is", op: "eq" }],
    boolOptions: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  {
    label: "Job count",
    dbField: "job_count",
    type: "number",
    operators: [
      { label: "equals", op: "eq" },
      { label: "greater than", op: "gt" },
      { label: "less than", op: "lt" },
    ],
    valuePlaceholder: "e.g. 1",
  },
  {
    label: "Total spend (£)",
    dbField: "total_spend",
    type: "number",
    operators: [
      { label: "greater than", op: "gt" },
      { label: "less than", op: "lt" },
    ],
    valuePlaceholder: "e.g. 500",
  },
];

interface FilterRow {
  id: string;
  fieldLabel: string;
  operator: SegmentFilter["operator"];
  value: string;
}

function makeRow(): FilterRow {
  return {
    id: Math.random().toString(36).slice(2),
    fieldLabel: FIELD_CONFIGS[0].label,
    operator: FIELD_CONFIGS[0].operators[0].op,
    value: "",
  };
}

function rowToSegmentFilter(row: FilterRow): SegmentFilter | null {
  const config = FIELD_CONFIGS.find((f) => f.label === row.fieldLabel);
  if (!config || !row.value) return null;

  let typedValue: SegmentFilter["value"] = row.value;
  if (config.type === "number") {
    typedValue = Number(row.value);
    if (isNaN(typedValue as number)) return null;
  } else if (config.type === "boolean") {
    typedValue = row.value === "true";
  } else if (config.type === "date") {
    typedValue = row.value; // ISO date string from date input
  }

  return { field: config.dbField, operator: row.operator, value: typedValue };
}

export default function CustomSegmentBuilderPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterRow[]>([makeRow()]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [segmentName, setSegmentName] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segmentFilters: SegmentFilter[] = filters
    .map(rowToSegmentFilter)
    .filter((f): f is SegmentFilter => f !== null);

  // Live preview count
  useEffect(() => {
    if (segmentFilters.length === 0) { setPreviewCount(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/campaigns/segment-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom_filters: segmentFilters }),
        });
        if (res.ok) {
          const { count } = await res.json();
          setPreviewCount(count);
        }
      } catch {
        // silent — keep last count
      }
      setPreviewLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(segmentFilters)]);

  function updateRow(id: string, patch: Partial<FilterRow>) {
    setFilters((rows) => rows.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      // When field changes, reset operator and value to field's first operator
      if (patch.fieldLabel !== undefined && patch.fieldLabel !== r.fieldLabel) {
        const config = FIELD_CONFIGS.find((f) => f.label === patch.fieldLabel);
        updated.operator = config?.operators[0].op ?? "eq";
        updated.value = "";
      }
      return updated;
    }));
  }

  function removeRow(id: string) {
    setFilters((rows) => rows.filter((r) => r.id !== id));
  }

  const canProceed = segmentName.trim() && segmentFilters.length > 0 && (previewCount ?? 0) > 0;

  return (
    <div className="p-6 max-w-3xl" data-testid="page-cm2b">
      <Link href="/campaigns/new" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" /> Back to Step 1
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-1">Build a Custom Segment</h1>
      <p className="text-sm text-muted-foreground mb-6">Combine filters to define a bespoke audience</p>

      {/* Filter builder */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="space-y-3">
          {filters.map((row, idx) => {
            const fieldConfig = FIELD_CONFIGS.find((f) => f.label === row.fieldLabel) ?? FIELD_CONFIGS[0];
            return (
              <div key={row.id}>
                {idx > 0 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 border-t border-border" />
                    <button
                      onClick={() => setLogic((l) => (l === "AND" ? "OR" : "AND"))}
                      className={cn(
                        "px-2.5 py-0.5 rounded text-xs font-bold border transition-colors",
                        logic === "AND"
                          ? "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950"
                          : "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950"
                      )}
                    >
                      {logic}
                    </button>
                    <div className="flex-1 border-t border-border" />
                  </div>
                )}
                <div className="flex items-center gap-2" data-testid={`filter-row-${idx}`}>
                  {/* Field selector */}
                  <select
                    value={row.fieldLabel}
                    onChange={(e) => updateRow(row.id, { fieldLabel: e.target.value })}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {FIELD_CONFIGS.map((f) => <option key={f.label}>{f.label}</option>)}
                  </select>

                  {/* Operator selector */}
                  <select
                    value={row.operator}
                    onChange={(e) => updateRow(row.id, { operator: e.target.value as SegmentFilter["operator"] })}
                    className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {fieldConfig.operators.map((o) => (
                      <option key={o.op} value={o.op}>{o.label}</option>
                    ))}
                  </select>

                  {/* Value input — type varies by field */}
                  {fieldConfig.type === "boolean" ? (
                    <select
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select…</option>
                      {fieldConfig.boolOptions?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : fieldConfig.type === "date" ? (
                    <Input
                      type="date"
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className="flex-1 text-sm"
                    />
                  ) : fieldConfig.type === "number" ? (
                    <Input
                      type="number"
                      placeholder={fieldConfig.valuePlaceholder}
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className="flex-1 text-sm"
                      min={0}
                    />
                  ) : (
                    <Input
                      placeholder={fieldConfig.valuePlaceholder ?? "Value…"}
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className="flex-1 text-sm"
                    />
                  )}

                  {filters.length > 1 && (
                    <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setFilters((rows) => [...rows, makeRow()])}
          className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
          data-testid="btn-add-filter"
        >
          <Plus className="h-3.5 w-3.5" /> Add filter
        </button>
      </div>

      {/* Live preview */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex items-center gap-3">
        {previewLoading ? (
          <Loader2 className="h-5 w-5 text-blue-500 shrink-0 animate-spin" />
        ) : (
          <Users className="h-5 w-5 text-blue-500 shrink-0" />
        )}
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {segmentFilters.length === 0
            ? "Add at least one filter to see a preview."
            : previewLoading
            ? "Calculating…"
            : previewCount === null
            ? "Add a value to see the count."
            : <>This segment currently contains <span className="font-bold">{previewCount} customers</span></>
          }
        </p>
      </div>

      {/* Segment name */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-foreground mb-1">Segment name</label>
        <Input
          placeholder="e.g. CF14 boiler service customers"
          value={segmentName}
          onChange={(e) => setSegmentName(e.target.value)}
          data-testid="input-segment-name"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/campaigns/new">Back</Link>
        </Button>
        <Button
          disabled={!canProceed}
          onClick={() => {
            const sp = new URLSearchParams({
              segment: segmentName,
              count: String(previewCount ?? 0),
              filters_json: JSON.stringify(segmentFilters),
            });
            router.push(`/campaigns/new/template?${sp}`);
          }}
          data-testid="btn-use-segment"
        >
          Use this segment
        </Button>
      </div>
    </div>
  );
}
