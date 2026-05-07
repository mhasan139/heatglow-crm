"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Shield,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Flame,
  Sparkles,
  FileText,
  Clock,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: null },
  { href: "/enquiries", label: "Enquiries", icon: MessageSquare, group: null },
  { href: "/customers", label: "Customers", icon: Users, group: null },
  { href: "/heatshield", label: "HeatShield", icon: Shield, group: null },
  { href: "/campaigns/overview", label: "Overview", icon: LayoutDashboard, group: "Campaigns" },
  { href: "/campaigns/queue", label: "Campaign Queue", icon: Clock, group: "Campaigns" },
  { href: "/campaigns/sequences", label: "Active Sequences", icon: Play, group: "Campaigns" },
  { href: "/ai-campaigns", label: "AI Campaigns", icon: Sparkles, group: "Campaigns" },
  { href: "/custom-campaigns", label: "Custom Campaign", icon: FileText, group: "Campaigns" },
  { href: "/settings", label: "Settings", icon: Settings, group: null },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, isDarkMode, toggleDarkMode } = useUIStore();
  const [displayName, setDisplayName] = useState("User");
  const [initials, setInitials] = useState("U");
  const [role, setRole] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata ?? {};
      const full = meta.full_name || meta.name || "";
      const emailPrefix = user.email?.split("@")[0] ?? "";
      const name = full || emailPrefix;
      setDisplayName(name);
      setInitials(getInitials(name));
      const appMeta = user.app_metadata ?? {};
      const metaRole = meta.role || appMeta.role || "";
      setRole(metaRole);
    });
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-testid="sidebar"
        className={cn(
          "fixed left-0 top-0 z-40 h-full flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarOpen ? "w-56" : "w-14"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-sidebar-border min-h-[64px]", !sidebarOpen && "justify-center px-2")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-600 flex-shrink-0">
            <Flame className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white leading-tight">HeatGlow</p>
              <p className="text-[10px] text-zinc-400 leading-tight">CRM</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, group }, idx) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const prevGroup = idx > 0 ? NAV_ITEMS[idx - 1].group : null;
            const isFirstInGroup = group && group !== prevGroup;
            return (
              <div key={href}>
                {isFirstInGroup && sidebarOpen && (
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold px-2.5 pt-4 pb-1">
                    {group}
                  </p>
                )}
                {isFirstInGroup && !sidebarOpen && (
                  <div className="my-2 border-t border-zinc-700/50" />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors mb-0.5",
                        active
                          ? "bg-primary text-white"
                          : "text-zinc-400 hover:bg-sidebar-accent hover:text-white",
                        !sidebarOpen && "justify-center px-0"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {sidebarOpen && <span>{label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="font-medium">
                      {label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border px-2 py-3 space-y-1">
          {/* Dark mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleDarkMode}
                data-testid="button-toggle-darkmode"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-zinc-400 hover:bg-sidebar-accent hover:text-white transition-colors",
                  !sidebarOpen && "justify-center px-0"
                )}
              >
                {isDarkMode ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
                {sidebarOpen && <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>}
              </button>
            </TooltipTrigger>
            {!sidebarOpen && <TooltipContent side="right">Toggle dark mode</TooltipContent>}
          </Tooltip>

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            data-testid="button-toggle-sidebar"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-zinc-400 hover:bg-sidebar-accent hover:text-white transition-colors",
              !sidebarOpen && "justify-center px-0"
            )}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>

          {/* User */}
          <div className={cn("flex items-center gap-2.5 px-2 py-2 mt-1", !sidebarOpen && "justify-center px-0")}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{displayName}</p>
                {role && <p className="text-[10px] text-zinc-500 truncate">{role}</p>}
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
