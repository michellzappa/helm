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
  LayoutDashboard, Brain, Calendar, History, Activity, Bot, Server, Zap,
  FolderOpen, Cpu, Radio, KeyRound, Send, Search, Settings, Euro, Heart, Menu,
} from "lucide-react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useCounts } from "@/lib/counts-context";
import { useSettings } from "@/lib/settings-context";
import { useKeyboardNav } from "@/hooks/use-keyboard-nav";
import { SettingsModal } from "@/components/SettingsModal";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import type { SidebarCounts } from "@/lib/types";

export const MENU_ITEMS: {
  href: string;
  label: string;
  icon: React.ElementType;
  countKey?: keyof SidebarCounts;
}[] = [
  { href: "/",               label: "Dashboard",      icon: LayoutDashboard },
  { href: "/activities",     label: "Activities",     icon: Activity                            },
  { href: "/agents",         label: "Agents",         icon: Bot,         countKey: "agents"      },
  { href: "/channels",       label: "Channels",       icon: Radio,       countKey: "channels"    },
  { href: "/credentials",    label: "Credentials",    icon: KeyRound,    countKey: "credentials" },
  { href: "/crons",           label: "Crons",          icon: Calendar,    countKey: "scheduled"   },
  { href: "/heartbeats",      label: "Heartbeats",     icon: Heart                           },
  { href: "/memory",         label: "Memory",         icon: Brain,       countKey: "memory"      },
  { href: "/messages",        label: "Messages",       icon: Send,        countKey: "deliveryQueue" },
  { href: "/models",         label: "Models",         icon: Cpu,         countKey: "models"      },
  { href: "/nodes",          label: "Nodes",          icon: Server,      countKey: "nodes"       },
  { href: "/sessions",       label: "Sessions",       icon: History,     countKey: "sessions"    },
  { href: "/skills",         label: "Skills",         icon: Zap,         countKey: "skills"      },
  { href: "/spend",          label: "Spend",          icon: Euro                                },
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const visibleMenuItems = MENU_ITEMS.filter(item => (
    item.href === "/" || !settings.hiddenSidebarItems.includes(item.href)
  ));

  // Keyboard navigation
  useKeyboardNav({
    onOpenSettings: () => setSettingsOpen(true),
    onCloseSettings: () => setSettingsOpen(false),
    settingsOpen,
    onOpenShortcuts: () => setShortcutsOpen(true),
  });

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
      <Sidebar collapsible="icon" side={settings.sidebarPosition}>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2 overflow-hidden">
            <SidebarTrigger className="shrink-0" />
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              {process.env.NEXT_PUBLIC_AGENT_NAME && (
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none">
                  {process.env.NEXT_PUBLIC_AGENT_NAME}
                </span>
              )}
              <span className="text-sm font-bold truncate">Helm</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* ⌘K search */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Search (⌘K)"
                    onClick={() => setCmdOpen(true)}
                    className="text-muted-foreground border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="flex-1 group-data-[collapsible=icon]:hidden">Search…</span>
                    <kbd className="group-data-[collapsible=icon]:hidden text-[10px] font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 leading-none">
                      ⌘K
                    </kbd>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMenuItems.map((item) => {
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
                tooltip="Settings (Esc)"
                onClick={() => setSettingsOpen(true)}
                className="w-full"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">Settings</span>
                <kbd className="ml-auto hidden group-data-[collapsible=icon]:hidden text-[10px] px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <p className="text-[10px] text-muted-foreground text-center mt-2 px-2 group-data-[collapsible=icon]:hidden">
            Press ? for shortcuts
          </p>
        </SidebarFooter>

        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          menuItems={MENU_ITEMS.map(({ href, label }) => ({ href, label }))}
        />

        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
        />

        <SidebarRail />
      </Sidebar>

      <main className="flex-1 overflow-y-auto bg-[var(--background)]">
        {/* Mobile hamburger — only visible on small screens */}
        {isMobile && (
          <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-2 bg-[color-mix(in_srgb,var(--background)_80%,transparent)] backdrop-blur-sm border-b border-border" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))" }}>
            <button
              onClick={() => setOpenMobile(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold truncate">
              {visibleMenuItems.find(i => i.href === router.pathname)?.label ?? "Helm"}
            </span>
          </div>
        )}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
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
  const { settings } = useSettings();

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
      <SidebarProvider className={settings.sidebarPosition === "right" ? "flex-row-reverse" : undefined}>
        <LayoutInner cmdOpen={cmdOpen} setCmdOpen={setCmdOpen}>
          {children}
        </LayoutInner>
      </SidebarProvider>
    </TooltipProvider>
  );
}
