import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export const REFRESH_OPTIONS = [
  { label: "10 s",  value: 10_000 },
  { label: "30 s",  value: 30_000 },
  { label: "1 min", value: 60_000 },
  { label: "5 min", value: 300_000 },
] as const;

export interface AppSettings {
  showSidebarCounts: boolean;
  themeColor: string;
  refreshInterval: number; // ms
}

const DEFAULTS: AppSettings = {
  showSidebarCounts: true,
  themeColor: "lobster", // overridden by /api/config on mount
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
      .then(({ themeColor }: { themeColor?: string }) => {
        if (themeColor) setSettings(prev => ({ ...prev, themeColor }));
      })
      .catch(() => { /* stay with local/default */ });
  }, []);

  const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      // Persist all settings locally
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      // Persist themeColor server-side (authoritative across devices)
      if (key === "themeColor") {
        fetch("/api/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeColor: value }),
        }).catch(() => {});
      }
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeColor: DEFAULTS.themeColor }),
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
