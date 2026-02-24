import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { getThemeColor } from "@/lib/theme-colors";

export function ThemeColorApplier() {
  const { settings } = useSettings();

  useEffect(() => {
    const color = getThemeColor(settings.themeColor ?? "gray");
    const root = document.documentElement;

    // Always set --theme-accent (sidebar indicator + count pills)
    root.style.setProperty("--theme-accent", color.accent);

    if (color.id === "gray") {
      // Reset primary to defaults (stylesheet values take over)
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
    } else {
      root.style.setProperty("--primary", color.primary);
      root.style.setProperty("--primary-foreground", color.primaryFg);
      root.style.setProperty("--ring", color.accent);
    }
  }, [settings.themeColor]);

  return null;
}
