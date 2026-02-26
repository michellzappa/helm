import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { getThemeColor } from "@/lib/theme-colors";

// Eye icon paths from Lucide (24×24 viewBox), scaled to 56×56 centered in 100×100
const HELM_SVG = (bg: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${bg}"/>
  <g transform="translate(50,50)" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="0" cy="0" r="28"/>
    <circle cx="0" cy="0" r="8"/>
    ${[0,45,90,135,180,225,270,315].map(a => {
      const r = (a * Math.PI) / 180;
      const x1 = Math.cos(r) * 8, y1 = Math.sin(r) * 8;
      const x2 = Math.cos(r) * 28, y2 = Math.sin(r) * 28;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }).join("")}
  </g>
</svg>`.trim();

function updateFavicon(bg: string) {
  const svg = HELM_SVG(bg);
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
  }
  
  link.href = url;
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
