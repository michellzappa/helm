import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Droplets, Wind } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { useWeather } from "@/lib/api";
import { WidgetIcon, wxIcon, dayLabel, toDisplayTemp } from "./shared";

export function WeatherCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { settings } = useSettings();
  const unit = settings.temperatureUnit;
  const { data, error } = useWeather();
  const weather = mounted ? data : null;
  const CondIcon = weather ? wxIcon(weather.code) : Cloud;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {weather?.location ?? "Weather"}
            </CardTitle>
            {weather && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{weather.desc}</p>
            )}
          </div>
          <CondIcon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--theme-accent)" }} />
        </div>
      </CardHeader>

      <CardContent>
        {!weather && error && (
          <p className="text-sm text-muted-foreground">Unavailable</p>
        )}

        {!weather && !error && (
          <div className="space-y-3">
            <div className="h-10 w-28 bg-muted rounded animate-pulse" />
            <div className="h-3 w-36 bg-muted rounded animate-pulse" />
            <div className="h-px bg-muted" />
            <div className="grid grid-cols-3 gap-1">
              {[0,1,2].map(i => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
            </div>
          </div>
        )}

        {weather && (
          <div className="space-y-3">
            <div className="flex items-end gap-2.5">
              <span className="text-4xl font-bold tabular-nums leading-none">
                {toDisplayTemp(weather.tempC, unit)}°
              </span>
              <span className="text-sm text-muted-foreground pb-0.5">
                feels {toDisplayTemp(weather.feelsLikeC, unit)}°
              </span>
            </div>

            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" /> {weather.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" /> {weather.windKmph} km/h
              </span>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="grid grid-cols-3">
                {weather.forecast.map((day, i) => {
                  const DayIcon = wxIcon(day.code);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1 py-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {dayLabel(day.date, i)}
                      </span>
                      <DayIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] tabular-nums">
                        {toDisplayTemp(day.maxC, unit)}°
                        <span className="text-muted-foreground">/{toDisplayTemp(day.minC, unit)}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
