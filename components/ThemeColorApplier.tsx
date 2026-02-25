import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { getThemeColor } from "@/lib/theme-colors";

// Eye icon paths from Lucide (24×24 viewBox), scaled to 56×56 centered in 100×100
const EYE_SVG = (bg: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${bg}"/>
  <g transform="translate(50,50) scale(2.33) translate(-12,-12)"
     fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3" fill="white" stroke="none"/>
  </g>
</svg>`.trim();

function updateFavicon(bg: string) {
  const svg = EYE_SVG(bg);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = url;
}

export function ThemeColorApplier() {
  const { settings } = useSettings();

  useEffect(() => {
    const color = getThemeColor(settings.themeColor ?? "gray");
    const root = document.documentElement;

    // CSS variables
    root.style.setProperty("--theme-accent", color.accent);
    if (color.id === "gray") {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
    } else {
      root.style.setProperty("--primary", color.primary);
      root.style.setProperty("--primary-foreground", color.primaryFg);
      root.style.setProperty("--ring", color.accent);
    }

    // Dynamic favicon
    updateFavicon(color.accent);
  }, [settings.themeColor]);

  return null;
}
