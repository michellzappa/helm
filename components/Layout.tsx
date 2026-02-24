import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard, Brain, Calendar, Bot, Server, Zap,
  FolderOpen, Cpu, Radio, KeyRound, Send, Search, Menu, Settings,
} from "lucide-react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useCounts } from "@/lib/counts-context";
import { useSettings } from "@/lib/settings-context";
import { SettingsModal } from "@/components/SettingsModal";
import type { SidebarCounts } from "@/lib/types";

const MENU_ITEMS: {
  href: string;
  label: string;
  icon: React.ElementType;
  countKey?: keyof SidebarCounts;
}[] = [
  { href: "/",               label: "Dashboard",      icon: LayoutDashboard },
  { href: "/agents",         label: "Agents",         icon: Bot                                  },
  { href: "/channels",       label: "Channels",       icon: Radio,       countKey: "channels"    },
  { href: "/credentials",    label: "Credentials",    icon: KeyRound,    countKey: "credentials" },
  { href: "/delivery",       label: "Delivery",       icon: Send,        countKey: "deliveryQueue" },
  { href: "/memory",         label: "Memory",         icon: Brain,       countKey: "memory"      },
  { href: "/models",         label: "Models",         icon: Cpu,         countKey: "models"      },
  { href: "/nodes",          label: "Nodes",          icon: Server,      countKey: "nodes"       },
  { href: "/scheduled",      label: "Scheduled",      icon: Calendar,    countKey: "scheduled"   },
  { href: "/skills",         label: "Skills",         icon: Zap,         countKey: "skills"      },
  { href: "/workspaces",     label: "Workspaces",     icon: FolderOpen,  countKey: "workspaces"  },
];

// Inner component — can safely use useSidebar (rendered inside SidebarProvider)
function LayoutInner({
  children,
  cmdOpen,
  setCmdOpen,
}: {
  children: React.ReactNode;
  cmdOpen: boolean;
  setCmdOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar();
  const { counts } = useCounts();
  const { settings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    const handleRouteChange = () => {
      if (isMobile) setOpenMobile(false);
    };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events, isMobile, setOpenMobile]);

  const navigate = (href: string) => {
    setCmdOpen(false);
    router.push(href);
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2 overflow-hidden">
            <SidebarTrigger className="shrink-0" />
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none">Lagosta</span>
              <span className="text-sm font-bold truncate">Helm</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  const count = item.countKey && counts ? counts[item.countKey] : undefined;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href} className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </span>
                          {settings.showSidebarCounts && count !== undefined && count > 0 && (
                            <span
                              className="group-data-[collapsible=icon]:hidden ml-auto shrink-0 min-w-[1.25rem] text-center text-[10px] font-medium px-1.5 py-0.5 rounded-full tabular-nums"
                              style={{
                                backgroundColor: "color-mix(in srgb, var(--theme-accent) 12%, transparent)",
                                color: "var(--theme-accent)",
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                onClick={() => setSettingsOpen(true)}
                className="w-full"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

        <SidebarRail />
      </Sidebar>

      <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 z-10 flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <SidebarTrigger className="h-8 w-8 flex md:hidden items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <span className="text-sm font-semibold md:hidden">Helm</span>
          <div className="flex-1" />
          {/* ⌘K / search */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-2.5 py-1.5 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="hidden sm:inline ml-1 pointer-events-none text-[10px] font-medium bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </div>
      </main>

      {/* Command Palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Go to page…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {MENU_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => navigate(item.href)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                  {item.countKey && counts?.[item.countKey] ? (
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {counts[item.countKey]}
                    </span>
                  ) : null}
                </CommandItem>
              );
            })}
            <CommandItem value="Settings" onSelect={() => { setCmdOpen(false); setSettingsOpen(true); }}>
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  // ⌘K / Ctrl+K global shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider>
        <LayoutInner cmdOpen={cmdOpen} setCmdOpen={setCmdOpen}>
          {children}
        </LayoutInner>
      </SidebarProvider>
    </TooltipProvider>
  );
}
