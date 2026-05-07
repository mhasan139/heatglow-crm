"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye, Edit2, Archive, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CampaignTemplate } from "@/types/index";

interface TemplatesResponse {
  data: CampaignTemplate[];
  total: number;
}

export default function TemplateLibraryPage() {
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null);

  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<TemplatesResponse>({
    queryKey: ["campaign-templates", search],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (search) sp.set("search", search);
      const res = await fetch(`/api/campaigns/templates?${sp}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      setArchiveConfirm(null);
      qc.invalidateQueries({ queryKey: ["campaign-templates"] });
    },
  });

  const templates = data?.data ?? [];
  const previewTemplate = previewId !== null ? templates.find((t) => t.id === previewId) : null;

  return (
    <div className="p-6 max-w-5xl" data-testid="page-template-library">
      {/* Preview modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewId(null)}>
          <div className="bg-background rounded-xl shadow-xl max-w-xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-muted-foreground mb-1">Subject:</p>
            <p className="font-semibold mb-4">{previewTemplate.subject}</p>
            <div className="text-sm whitespace-pre-line border-t border-border pt-4">{previewTemplate.body}</div>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              <p>HeatGlow Heating & Plumbing, Cardiff</p>
              <p className="text-primary underline cursor-pointer">Unsubscribe</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewId(null)}>Close</Button>
              <Button className="flex-1" asChild>
                <Link href={`/campaigns/new/template`}>Use in campaign</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirm */}
      {archiveConfirm !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold mb-2">Delete this template?</h3>
            <p className="text-sm text-muted-foreground mb-4">This template will be permanently removed.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setArchiveConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteMutation.mutate(archiveConfirm)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${data?.total ?? 0} templates`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" asChild>
            <Link href="/campaigns/templates/new">
              <Plus className="h-4 w-4 mr-1.5" /> New template
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="pl-8 text-sm"
        />
      </div>

      {/* Content */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-muted-foreground">Failed to load templates.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "No templates match your search." : "No templates yet."}
          </p>
          {!search && (
            <Button asChild size="sm">
              <Link href="/campaigns/templates/new"><Plus className="h-3.5 w-3.5 mr-1" /> Create your first template</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4" data-testid={`template-card-${t.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.subject}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.body.slice(0, 120)}…</p>
              <p className="text-[10px] text-muted-foreground mb-3">Created: {formatDate(t.created_at)}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPreviewId(t.id)}>
                  <Eye className="h-3 w-3 mr-1" /> Preview
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                  <Link href={`/campaigns/templates/${t.id}/edit`}><Edit2 className="h-3 w-3 mr-1" /> Edit</Link>
                </Button>
                <button onClick={() => setArchiveConfirm(t.id)} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                  <Archive className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
