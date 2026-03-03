import { useState, useEffect } from "react";
import Link from "next/link";
import { PageInfo } from "@/components/PageInfo";
import Layout from "@/components/Layout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, ChevronUp, ChevronDown, X } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { useCachedRefresh } from "@/lib/cache-refresh";
import { useActivity } from "@/lib/api";
import { ErrorLog } from "@/components/ActivityCharts";
import {
  WeatherCard,
  SystemCard,
  GatewayHealthCard,
  TailscaleCard,
  UpcomingCronsCard,
  QuickAgentsCard,
  SpendCard,
  CredentialsStatusCard,
  MemoryActivityCard,
  MessageQueueCard,
  ActiveModelsCard,
  ConnectedNodesCard,
  ActiveSessionsCard,
  SkillsQuickAccessCard,
  WorkspacesOverviewCard,
  ActivityCard,
  ActiveHoursCard,
  ChannelsCard,
  HeartbeatCard,
  PrimaryModelCard,
} from "@/components/widgets";


// ── Dashboard ─────────────────────────────────────────────────────────────

const WIDGET_DEFINITIONS = [
  { key: "active-hours", label: "Active Hours", node: <ActiveHoursCard /> },
  { key: "activity", label: "Activity", node: <ActivityCard /> },
  { key: "channels", label: "Channels", node: <ChannelsCard /> },
  { key: "credentials-status", label: "Credentials", node: <CredentialsStatusCard /> },
  { key: "heartbeat", label: "Heartbeat", node: <HeartbeatCard /> },
  { key: "memory-activity", label: "Memory", node: <MemoryActivityCard /> },
  { key: "message-queue", label: "Messages", node: <MessageQueueCard /> },
  { key: "active-models", label: "Models", node: <ActiveModelsCard /> },
  { key: "connected-nodes", label: "Nodes", node: <ConnectedNodesCard /> },
  { key: "quick-agents", label: "Agents", node: <QuickAgentsCard /> },
  { key: "primary-model", label: "Primary Model", node: <PrimaryModelCard /> },
  { key: "active-sessions", label: "Sessions", node: <ActiveSessionsCard /> },
  { key: "skills-quick-access", label: "Skills", node: <SkillsQuickAccessCard /> },
  { key: "spend", label: "Spend", node: <SpendCard /> },
  { key: "gateway-health", label: "Gateway Health", node: <GatewayHealthCard /> },
  { key: "system", label: "System", node: <SystemCard /> },
  { key: "tailscale", label: "Tailscale", node: <TailscaleCard /> },
  { key: "upcoming-crons", label: "Upcoming Crons", node: <UpcomingCronsCard /> },
  { key: "weather", label: "Weather", node: <WeatherCard /> },
  { key: "workspaces-overview", label: "Workspaces", node: <WorkspacesOverviewCard /> },
];

export default function Dashboard() {
  interface WidgetState {
    order: string[];
    hidden: Set<string>;
  }

  const { settings } = useSettings();
  const [editing, setEditing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const { data: activityData } = useActivity();
  
  // Load saved order/visibility from localStorage or use defaults (alphabetical)
  const [widgetState, setWidgetState] = useState<WidgetState>(() => {
    const defaultOrder = WIDGET_DEFINITIONS.map(w => w.key).sort();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('helm-dashboard-widgets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            order: parsed.order || defaultOrder,
            hidden: new Set(parsed.hidden || []),
          };
        } catch {}
      }
    }
    return {
      order: defaultOrder,
      hidden: new Set<string>(),
    };
  });

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('helm-dashboard-widgets', JSON.stringify({
        order: widgetState.order,
        hidden: Array.from(widgetState.hidden),
      }));
    }
  }, [widgetState]);

  const toggleWidget = (key: string) => {
    setWidgetState(prev => {
      const newHidden = new Set(prev.hidden);
      if (newHidden.has(key)) newHidden.delete(key);
      else newHidden.add(key);
      return { ...prev, hidden: newHidden };
    });
  };

  const moveWidget = (key: string, direction: 'up' | 'down') => {
    setWidgetState(prev => {
      const idx = prev.order.indexOf(key);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(prev.order.length - 1, idx + 1);
      const newOrder = [...prev.order];
      [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
      return { ...prev, order: newOrder };
    });
  };

  // Build visible cards in custom order
  const visibleCards = widgetState.order
    .filter((key: string) => {
      // Always respect settings overrides for weather/system/tailscale
      const def = WIDGET_DEFINITIONS.find(w => w.key === key);
      if (!def) return false;
      if (widgetState.hidden.has(key)) return false;
      if (key === 'weather' && !settings.dashboardCards.weather) return false;
      if (key === 'system' && !settings.dashboardCards.system) return false;
      if (key === 'tailscale' && !settings.dashboardCards.tailscale) return false;
      return true;
    })
    .map((key: string) => WIDGET_DEFINITIONS.find(w => w.key === key))
    .filter(Boolean);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-4xl font-bold">Dashboard</h1>
              <PageInfo page="dashboard" />
            </div>
            <button
              onClick={() => setEditing(true)}
              className="p-2.5 -mr-1 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
              title="Edit dashboard widgets"
            >
              <Eye className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Welcome to Helm</p>
          </div>
        </div>

        {/* Dense masonry dashboard cards */}
        {visibleCards.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 3xl:columns-6 gap-4 space-y-4">
            {visibleCards.map((card) => (
              <div key={card!.key} className="break-inside-avoid mb-4">{card!.node}</div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No widgets enabled. Click the eye icon to customize.
            </CardContent>
          </Card>
        )}

        {/* Error Log — collapsible full-width */}
        <div className="pt-4">
          <button
            onClick={() => setShowLog(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showLog ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showLog ? "Hide Error Log" : "Show Error Log"}
          </button>
          {showLog && (
            <div className="mt-4">
              <ErrorLog data={activityData} />
            </div>
          )}
        </div>

        {/* Widget Editor Overlay */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditing(false)}>
            <div className="bg-background rounded-lg border shadow-lg w-full max-w-md max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">Dashboard Widgets</h2>
                <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-1">
                {widgetState.order.map((key, idx) => {
                  const def = WIDGET_DEFINITIONS.find(w => w.key === key);
                  if (!def) return null;
                  const isHidden = widgetState.hidden.has(key);
                  return (
                    <div key={key} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                      <button
                        onClick={() => toggleWidget(key)}
                        className="p-1 rounded hover:bg-muted"
                        title={isHidden ? "Show widget" : "Hide widget"}
                      >
                        {isHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4" style={{ color: "var(--theme-accent)" }} />}
                      </button>
                      <span className={cn("flex-1 text-sm", isHidden && "text-muted-foreground line-through")}>
                        {def.label}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveWidget(key, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveWidget(key, 'down')}
                          disabled={idx === widgetState.order.length - 1}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t text-center">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded bg-muted hover:bg-muted/80 text-sm font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
