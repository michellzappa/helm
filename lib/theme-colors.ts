export interface ThemeColor {
  id: string;
  label: string;
  swatch: string;     // hex for swatch display
  accent: string;     // hex for --theme-accent (indicator + pills)
  primary: string;    // hex for --primary
  primaryFg: string;  // hex for --primary-foreground
}

export const THEME_COLORS: ThemeColor[] = [
  { id: "gray",    label: "Gray",    swatch: "#6b7280", accent: "#6b7280", primary: "#374151", primaryFg: "#ffffff" },
  { id: "lobster", label: "Lobster", swatch: "#e05a47", accent: "#e05a47", primary: "#e05a47", primaryFg: "#ffffff" },
  { id: "ocean",   label: "Ocean",   swatch: "#3b82f6", accent: "#3b82f6", primary: "#3b82f6", primaryFg: "#ffffff" },
  { id: "forest",  label: "Forest",  swatch: "#22c55e", accent: "#22c55e", primary: "#16a34a", primaryFg: "#ffffff" },
  { id: "violet",  label: "Violet",  swatch: "#8b5cf6", accent: "#8b5cf6", primary: "#7c3aed", primaryFg: "#ffffff" },
  { id: "amber",   label: "Amber",   swatch: "#f59e0b", accent: "#f59e0b", primary: "#d97706", primaryFg: "#1c1917" },
  { id: "rose",    label: "Rose",    swatch: "#f43f5e", accent: "#f43f5e", primary: "#e11d48", primaryFg: "#ffffff" },
  { id: "teal",    label: "Teal",    swatch: "#14b8a6", accent: "#14b8a6", primary: "#0d9488", primaryFg: "#ffffff" },
];

export const DEFAULT_THEME_COLOR = "gray";

export function getThemeColor(id: string): ThemeColor {
  return THEME_COLORS.find(c => c.id === id) ?? THEME_COLORS[0];
}
