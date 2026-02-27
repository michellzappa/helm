import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";
import { getThemeColor } from "@/lib/theme-colors";

// Lucide ship-wheel icon (24×24 viewBox), centered in 100×100 rounded rect
const HELM_SVG = (bg: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${bg}"/>
  <g transform="translate(18,18) scale(2.667)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="8"/>
    <path d="M12 2v7.5"/>
    <path d="m19 5-5.23 5.23"/>
    <path d="M22 12h-7.5"/>
    <path d="m19 19-5.23-5.23"/>
    <path d="M12 14.5V22"/>
    <path d="M10.23 13.77 5 19"/>
    <path d="M9.5 12H2"/>
    <path d="M10.23 10.23 5 5"/>
    <circle cx="12" cy="12" r="2.5"/>
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

  // Generate apple-touch-icon as PNG via canvas (180×180 for iOS homescreen)
  updateAppleTouchIcon(svg);
}

function updateAppleTouchIcon(svg: string) {
  const size = 180;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    const pngUrl = canvas.toDataURL("image/png");

    let link = document.querySelector<HTMLLinkElement>("link#dynamic-apple-touch-icon");
    if (!link) {
      link = document.createElement("link");
      link.id = "dynamic-apple-touch-icon";
      link.rel = "apple-touch-icon";
      link.setAttribute("sizes", "180x180");
      document.head.appendChild(link);
    }
    link.href = pngUrl;
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
