import { useState } from "react";
import { useAutoRefresh } from "@/lib/settings-context";
import type { ActivityData } from "@/pages/api/activity";
import { ActivityHistogram } from "./ActivityHistogram";
import { HourlyChart } from "./HourlyChart";
import { ChannelDistribution } from "./ChannelDistribution";
import { ErrorLog } from "./ErrorLog";

interface ActivityChartsProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ActivityCharts({ containerRef }: ActivityChartsProps) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [cronJumpSeq, setCronJumpSeq] = useState(0);

  const fetchData = async () => {
    try {
      const r = await fetch("/api/activity");
      const d = await r.json();
      setData(d.error ? null : d);
    } catch {
      setData(null);
    }
  };

  useAutoRefresh(() => {
    void fetchData();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <ActivityHistogram data={data} />
      <HourlyChart data={data} />
      <ChannelDistribution
        data={data}
        onCronFailClick={() => setCronJumpSeq(s => s + 1)}
      />
      <ErrorLog data={data} cronJumpSeq={cronJumpSeq} containerRef={containerRef} />
    </div>
  );
}

// Re-export ErrorLog for direct use
export { ErrorLog } from "./ErrorLog";
