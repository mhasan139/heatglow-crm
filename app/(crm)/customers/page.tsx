"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { Client } from "@/types/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

const ITEMS_PER_PAGE = 50;

interface ClientListResponse {
  data: Client[];
  total: number;
  page: number;
  limit: number;
}

async function fetchClients(params: {
  search: string;
  heatshield: boolean;
  sort: string;
  page: number;
}): Promise<ClientListResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: String(ITEMS_PER_PAGE),
  });
  if (params.search) sp.set('search', params.search);
  if (params.heatshield) sp.set('heatshield_only', 'true');
  const sortMap: Record<string, string> = { recent: 'recent', spend: 'total_spend', name: 'name' };
  sp.set('sort_by', sortMap[params.sort] ?? 'recent');

  const res = await fetch(`/api/clients?${sp}`);
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json();
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [heatShieldOnly, setHeatShieldOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'spend' | 'name'>('recent');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clients', debouncedSearch, heatShieldOnly, sortBy, page],
    queryFn: () => fetchClients({ search: debouncedSearch, heatshield: heatShieldOnly, sort: sortBy, page }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const clients = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} customers · synced from ServiceM8`}
          </p>
        </div>
      </div>

      {/* SM8 sync banner */}
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
        <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
          Customer data is synced hourly from ServiceM8.
        </p>
        <Link href="/settings">
          <Button variant="outline" size="sm" className="border-blue-300 text-blue-800 text-xs">
            Sync settings
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, postcode, email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-customers"
          />
        </div>
        <button
          onClick={() => { setHeatShieldOnly(!heatShieldOnly); setPage(1); }}
          data-testid="button-filter-heatshield"
          className={cn(
            'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors',
            heatShieldOnly
              ? 'bg-primary text-white border-primary'
              : 'border-border text-muted-foreground hover:border-primary'
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          HeatShield only
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          {(['recent', 'spend', 'name'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSortBy(s); setPage(1); }}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                sortBy === s ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {s === 'recent' ? 'Recent' : s === 'spend' ? 'Total Spend' : 'A–Z'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">Failed to load customers.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : isLoading && clients.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading customers…
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No customers found"
            description="Try adjusting your search or filters."
            action={{ label: 'Clear filters', onClick: () => { setSearch(''); setDebouncedSearch(''); setHeatShieldOnly(false); } }}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">HeatShield</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Customer Since</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Total Spend</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Jobs</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">SM8 ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`row-customer-${c.id}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="font-medium hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[c.address_line1, c.postcode].filter(Boolean).join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{c.phone ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{c.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.is_heatshield && (
                        <Badge variant="success" className="gap-1">
                          <Shield className="h-3 w-3" /> Member
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {c.customer_since ? formatDate(c.customer_since) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(c.total_spend)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.job_count}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs truncate max-w-[100px]">
                        {c.sm8_client_uuid?.slice(0, 8)}…
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1 || isLoading}>
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages || isLoading}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
