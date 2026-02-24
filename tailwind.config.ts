import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      white: "#ffffff",
      black: "#000000",
      transparent: "transparent",
      current: "currentColor",
      gray: {
        50:  "#ffffff",
        100: "#f9f9f9",
        200: "#f5f5f5",
        300: "#eeeeee",
        400: "#e5e5e5",
        500: "#cccccc",
        600: "#999999",
        700: "#666666",
        800: "#333333",
        900: "#111111",
        950: "#0a0a0a",
      },
      purple: {
        50:  "#f8f4ff",
        100: "#f0e6ff",
        200: "#e6d5ff",
        700: "#6d28d9",
        900: "#2d1b69",
      },
      blue: {
        50:  "#f0f7ff",
        100: "#e0f0ff",
        200: "#bae0ff",
        700: "#0369a1",
        900: "#0c2340",
      },
      green: {
        50:  "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        600: "#16a34a",
        700: "#15803d",
        900: "#052e16",
      },
      orange: {
        50:  "#fff7ed",
        100: "#ffedd5",
        200: "#fed7aa",
        700: "#c2410c",
        900: "#431407",
      },
      red: {
        50:  "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        600: "#dc2626",
        700: "#b91c1c",
        900: "#450a0a",
      },
      indigo: {
        100: "#e0e7ff",
        200: "#c7d2fe",
        700: "#4338ca",
        900: "#1e1b4b",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Helvetica Neue"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Monaco"', '"Courier New"', "monospace"],
      },
      // CSS-variable-backed semantic tokens — auto-flip in dark mode via globals.css
      colors: {
        border:     "var(--border)",
        input:      "var(--input)",
        ring:       "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface:    "var(--surface)",
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
