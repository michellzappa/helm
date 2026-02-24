/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0a0a0a",
        card: "#ffffff",
        "card-foreground": "#0a0a0a",
        muted: "#f5f5f5",
        "muted-foreground": "#737373",
        accent: "#0a0a0a",
        "accent-foreground": "#ffffff",
        destructive: "#dc2626",
        "destructive-foreground": "#ffffff",
        primary: "#0a0a0a",
        "primary-foreground": "#ffffff",
        secondary: "#f5f5f5",
        "secondary-foreground": "#0a0a0a",
        border: "#e5e5e5",
        input: "#e5e5e5",
        ring: "#0a0a0a",
        sidebar: {
          DEFAULT: "#ffffff",
          foreground: "#0a0a0a",
          primary: "#0a0a0a",
          "primary-foreground": "#ffffff",
          accent: "#f5f5f5",
          "accent-foreground": "#0a0a0a",
          border: "#e5e5e5",
          ring: "#0a0a0a",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
