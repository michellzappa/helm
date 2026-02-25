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
  themeColor: "gray",
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

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
  }, []);

  const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
