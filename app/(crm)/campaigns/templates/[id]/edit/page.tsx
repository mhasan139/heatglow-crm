"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import { TemplateEditor } from "@/app/(crm)/campaigns/templates/new/page";
import type { CampaignTemplate } from "@/types/index";

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const numericId = parseInt(id);

  const { data: template, isLoading, isError } = useQuery<CampaignTemplate>({
    queryKey: ["campaign-template", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/templates/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh] gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading template…
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="p-6">
        <Link href="/campaigns/templates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to Templates
        </Link>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-muted-foreground">Template not found.</p>
        </div>
      </div>
    );
  }

  return (
    <TemplateEditor
      mode="edit"
      id={numericId}
      initialName={template.name}
      initialSubject={template.subject}
      initialBody={template.body}
    />
  );
}
