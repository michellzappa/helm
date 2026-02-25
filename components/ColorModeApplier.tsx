import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";

/**
 * Watches colorMode setting and applies/removes the `dark` class on <html>.
 * Also listens for OS preference changes when mode is "system".
 */
export function ColorModeApplier() {
  const { settings } = useSettings();

  useEffect(() => {
    function apply() {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark =
        settings.colorMode === "dark" ||
        (settings.colorMode === "system" && prefersDark);

      if (dark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }

    apply();

    // Listen for OS changes when in system mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.colorMode]);

  return null;
}
