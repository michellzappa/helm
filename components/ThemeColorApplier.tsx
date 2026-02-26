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
  
  // Look for existing favicon by ID first, then by rel
  let link = document.querySelector<HTMLLinkElement>("link#dynamic-favicon");
  if (!link) {
    link = document.querySelector<HTMLLinkElement>("link[rel='icon'][type='image/svg+xml']");
  }
  
  // Remove any other icon links to prevent duplicates
  document.querySelectorAll<HTMLLinkElement>("link[rel='icon']").forEach(el => {
    if (el !== link) el.remove();
  });
  
  if (!link) {
    link = document.createElement("link");
    link.id = "dynamic-favicon";
    link.rel = "icon";
    link.type = "image/svg+xml";
    document.head.appendChild(link);
    console.log("[Favicon] Created new favicon element");
  }
  
  link.href = url;
  console.log("[Favicon] Updated href, total icons:", document.querySelectorAll("link[rel='icon']").length);
}

export function ThemeColorApplier() {
  const { settings } = useSettings();

  // Initial setup on mount (creates favicon immediately)
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

    // Dynamic favicon - create immediately
    updateFavicon(color.accent);
    
    // Debug: log favicon count
    console.log("[Favicon] Initial setup, icon count:", document.querySelectorAll("link[rel='icon']").length);
  }, []);

  // Update when theme changes
  useEffect(() => {
    const color = getThemeColor(settings.themeColor ?? "gray");
    const root = document.documentElement;

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

    updateFavicon(color.accent);
  }, [settings.themeColor]);

  return null;
}
