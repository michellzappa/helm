import React, { createContext, useContext, useCallback, useState } from "react";
import { useAutoRefresh } from "@/lib/settings-context";
import type { SidebarCounts } from "@/lib/types";

interface CountsContextValue {
  counts: SidebarCounts | null;
  refresh: () => void;
}

const CountsContext = createContext<CountsContextValue>({ counts: null, refresh: () => {} });

export function CountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<SidebarCounts | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/counts")
      .then(r => r.json())
      .then(d => { if (!d.error) setCounts(d); })
      .catch(() => {});
  }, []);

  useAutoRefresh(refresh);

  return (
    <CountsContext.Provider value={{ counts, refresh }}>
      {children}
    </CountsContext.Provider>
  );
}

export function useCounts() {
  return useContext(CountsContext);
}
