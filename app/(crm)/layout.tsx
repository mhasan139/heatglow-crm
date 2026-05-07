"use client";

import { memo, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Isolated component — only re-renders when isDarkMode changes, not on sidebarOpen changes.
function DarkModeSync() {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);
  return null;
}

// Isolated component — only re-renders when sidebarOpen changes.
// children is passed by reference from the parent (Next.js), so pages don't re-render on sidebar toggle.
const MainContent = memo(function MainContent({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  return (
    <main
      className={cn(
        "transition-all duration-300 min-h-screen",
        sidebarOpen ? "ml-56" : "ml-14"
      )}
    >
      <div className="max-w-[1400px] mx-auto p-6">{children}</div>
    </main>
  );
});

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeSync />
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </QueryClientProvider>
  );
}
