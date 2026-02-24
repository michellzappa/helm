import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CountsContext.Provider value={{ counts, refresh }}>
      {children}
    </CountsContext.Provider>
  );
}

export function useCounts() {
  return useContext(CountsContext);
}
