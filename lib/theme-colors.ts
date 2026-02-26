export interface ThemeColor {
  id: string;
  label: string;
  swatch: string;     // OKLCH for swatch display
  accent: string;     // OKLCH for --theme-accent (indicator + pills)
  primary: string;    // OKLCH for --primary
  primaryFg: string;  // hex for --primary-foreground
}

// All colors in OKLCH for perceptual uniformity
// Format: oklch(L% C H)
// L = lightness (0-100%), C = chroma (0-0.4), H = hue (0-360)

export const THEME_COLORS: ThemeColor[] = [
  // Neutral base
  { id: "gray",    label: "Gray",    swatch: "oklch(55% 0.02 260)",  accent: "oklch(55% 0.02 260)",  primary: "oklch(45% 0.02 260)",  primaryFg: "#ffffff" },
  
  // Warm spectrum - similar chroma for matching saturation
  { id: "lobster", label: "Lobster", swatch: "oklch(65% 0.20 30)",   accent: "oklch(65% 0.20 30)",   primary: "oklch(55% 0.22 30)",   primaryFg: "#ffffff" },
  { id: "amber",   label: "Amber",   swatch: "oklch(75% 0.18 85)",   accent: "oklch(75% 0.18 85)",   primary: "oklch(65% 0.20 85)",   primaryFg: "#1c1917" },
  
  // Cool spectrum
  { id: "rose",    label: "Rose",    swatch: "oklch(65% 0.22 350)",  accent: "oklch(65% 0.22 350)",  primary: "oklch(55% 0.24 350)",  primaryFg: "#ffffff" },
  { id: "ocean",   label: "Ocean",   swatch: "oklch(60% 0.20 250)",  accent: "oklch(60% 0.20 250)",  primary: "oklch(50% 0.22 250)",  primaryFg: "#ffffff" },
  { id: "indigo",  label: "Indigo",  swatch: "oklch(55% 0.22 270)",  accent: "oklch(55% 0.22 270)",  primary: "oklch(45% 0.24 270)",  primaryFg: "#ffffff" },
  { id: "violet",  label: "Violet",  swatch: "oklch(60% 0.22 290)",  accent: "oklch(60% 0.22 290)",  primary: "oklch(50% 0.24 290)",  primaryFg: "#ffffff" },
  
  // Nature spectrum
  { id: "forest",  label: "Forest",  swatch: "oklch(65% 0.20 145)",  accent: "oklch(65% 0.20 145)",  primary: "oklch(55% 0.22 145)",  primaryFg: "#ffffff" },
  { id: "teal",    label: "Teal",    swatch: "oklch(70% 0.14 195)",  accent: "oklch(70% 0.14 195)",  primary: "oklch(60% 0.16 195)",  primaryFg: "#ffffff" },
];

export const DEFAULT_THEME_COLOR = "gray";

export function getThemeColor(id: string): ThemeColor {
  return THEME_COLORS.find(c => c.id === id) ?? THEME_COLORS[0];
}
