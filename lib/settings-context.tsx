import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export const REFRESH_OPTIONS = [
  { label: "10 s",  value: 10_000 },
  { label: "30 s",  value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
] as const;

export type ColorMode = "light" | "dark" | "system";
export type Currency = "EUR" | "USD" | "GBP";
export type DateFormat = "DD/MM" | "MM/DD";
export type TimeFormat = "24h" | "12h";
export type TempUnit = "C" | "F";
export type SidebarPosition = "left" | "right";

export interface DashboardCards {
  weather: boolean;
  system: boolean;
  tailscale: boolean;
  activity: boolean;
}

export interface AppSettings {
  // Appearance
  themeColor: string;
  colorMode: ColorMode;
  // Layout
  sidebarPosition: SidebarPosition;
  showSidebarCounts: boolean;
  hiddenSidebarItems: string[]; // href paths to hide
  // Dashboard
  dashboardCards: DashboardCards;
  // Formatting
  currency: Currency;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  temperatureUnit: TempUnit;
  // Behavior
  refreshInterval: number; // ms
}

export const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1 },
  EUR: { symbol: "€", rate: 0.92 },
  GBP: { symbol: "£", rate: 0.79 },
};

const DEFAULTS: AppSettings = {
  themeColor: "lobster", // overridden by /api/config on mount
  colorMode: "dark",
  sidebarPosition: "left",
  showSidebarCounts: true,
  hiddenSidebarItems: [],
  dashboardCards: { weather: true, system: true, tailscale: true, activity: true },
  currency: "EUR",
  dateFormat: "DD/MM",
  timeFormat: "24h",
  temperatureUnit: "C",
  refreshInterval: 30_000,
};

const STORAGE_KEY = "mc_settings";

interface SettingsContextValue {
  settings: AppSettings;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  setSetting: () => {},
  resetSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  // 1. Load localStorage immediately (fast, avoids UI flash for non-color settings)
  // 2. Fetch /api/config for authoritative themeColor (server-side, device-agnostic)
  useEffect(() => {
    // Local prefs first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
    } catch { /* ignore */ }

    // Server color overrides local — this is the source of truth
    fetch("/api/config")
      .then(r => r.json())
      .then((serverCfg: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...serverCfg }));
      })
      .catch(() => { /* stay with local/default */ });
  }, []);

  const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      // Persist all settings locally
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      // Persist all settings server-side (authoritative across devices)
      fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      }).catch(() => {});
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEFAULTS),
    }).catch(() => {});
  };

  return (
    <SettingsContext.Provider value={{ settings, setSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useRefreshInterval(): number {
  return useContext(SettingsContext).settings.refreshInterval;
}

/** Calls `callback` immediately then on every refreshInterval tick. */
export function useAutoRefresh(callback: () => void) {
  const interval = useRefreshInterval();
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });
  useEffect(() => {
    cbRef.current();
    const id = setInterval(() => cbRef.current(), interval);
    return () => clearInterval(id);
  }, [interval]);
}
